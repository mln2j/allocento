import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, firstValueFrom } from 'rxjs';
import { LocalDbService } from './local-db';
import { API_BASE_URL } from '../api.config';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private isSyncing = false;
  public syncCompleted$ = new Subject<void>();

  constructor(
    private localDb: LocalDbService,
    private http: HttpClient
  ) {
    this.initOnlineListener();
  }

  private initOnlineListener(): void {
    window.addEventListener('online', () => {
      console.log('🌍 Internet se vratio! Pokrećem pozadinsku sinkronizaciju...');
      this.syncOfflineQueue();
    });

    window.addEventListener('online-restored', () => {
      console.log('🌍 Internet se vratio (ping recovered)! Pokrećem pozadinsku sinkronizaciju...');
      this.syncOfflineQueue();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Uređaj je izgubio vezu s internetom. Prebačeno na lokalni rad.');
    });
  }

  async syncOfflineQueue(): Promise<void> {
    if (this.isSyncing) return;

    try {
      const queue = await this.localDb.getAll('offline_queue');

      if (!queue || queue.length === 0) {
        return;
      }

      this.isSyncing = true;
      console.log(`⏳ Slanje ${queue.length} stavki na sinkronizaciju...`);

      // 1. Izdvoji bulk transakcije (legacy i nove transaction entity)
      const transactions = queue.filter(item => !item.entity || item.entity === 'transaction');
      const otherEntities = queue.filter(item => item.entity && item.entity !== 'transaction');

      if (transactions.length > 0) {
        await this.syncTransactions(transactions);
      }

      if (otherEntities.length > 0) {
        await this.syncOtherEntities(otherEntities);
      }

      // Ako je sve uspješno obrisano i riješeno, emitiraj
      this.syncCompleted$.next();

    } catch (error) {
      console.error('❌ Greška tijekom dohvaćanja reda čekanja:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncTransactions(queue: any[]): Promise<void> {
    const payload = {
      operations: queue.map(item => {
        if (!item.action) {
          return {
            action: 'create',
            payload: {
              account_id: item.accountId,
              type: item.type,
              amount: item.amount,
              date: item.date,
              description: item.description,
              category_id: item.category_id,
              project_id: item.project_id,
              target_account_id: item.target_account_id || item.targetAccountId || null,
              exclude_from_analytics: item.exclude_from_analytics || item.excludeFromAnalytics || null
            }
          };
        }
        return {
          action: item.action,
          transaction_id: item.transaction_id,
          payload: item.payload
        };
      })
    };

    try {
      const response: any = await firstValueFrom(this.http.post(`${API_BASE_URL}/transactions/sync`, payload));
      console.log(`✅ Transakcije bulk sync uspješan! Ažurirano ${response.synced} zapisa.`);
      
      // Obriši samo transaction stavke iz queuea
      for (const item of queue) {
        await this.localDb.delete('offline_queue', item.localId);
      }

      // Id mappings:
      if (response.id_mappings) {
        const list = await this.localDb.getAll('transactions');
        for (const localId of Object.keys(response.id_mappings)) {
          const realId = response.id_mappings[localId];
          const localNum = parseInt(localId, 10);
          const tx = list.find(t => t.id === localNum);
          if (tx) {
            await this.localDb.delete('transactions', localNum);
            tx.id = realId;
            await this.localDb.put('transactions', tx);
          }
        }
      }
    } catch (err) {
      console.error(`❌ Neuspjela bulk sinkronizacija transakcija.`, err);
    }
  }

  private async syncOtherEntities(queue: any[]): Promise<void> {
    // Sekvencijalna sinkronizacija za projekte, kategorije, račune
    for (const item of queue) {
      try {
        let endpoint = '';
        if (item.entity === 'account') endpoint = `/accounts`;
        else if (item.entity === 'category') endpoint = `/categories`;
        else if (item.entity === 'project') endpoint = `/projects`;

        let realId = item.entity_id;
        
        if (item.action === 'create') {
          const res: any = await firstValueFrom(this.http.post(`${API_BASE_URL}${endpoint}`, item.payload));
          realId = res.id;

          // Ažuriraj lokalni ID
          const storeName = item.entity === 'category' ? 'categories' : (item.entity === 'project' ? 'workspaces' : 'accounts');
          // Note: Workspaces aren't directly updated here for projects, let's just clear the cache or update the local store
          // We will clear the store on next list pull, but for local correctness let's swap IDs if possible
          if (item.entity === 'account') {
            const list = await this.localDb.getAll('accounts');
            const acc = list.find(a => a.id === item.entity_id);
            if (acc) {
              await this.localDb.delete('accounts', item.entity_id);
              acc.id = realId;
              await this.localDb.put('accounts', acc);
            }
          }
        } else if (item.action === 'update') {
          await firstValueFrom(this.http.put(`${API_BASE_URL}${endpoint}/${item.entity_id}`, item.payload));
        } else if (item.action === 'delete') {
          await firstValueFrom(this.http.delete(`${API_BASE_URL}${endpoint}/${item.entity_id}`));
        }

        // Ukloni iz queue
        await this.localDb.delete('offline_queue', item.localId);
      } catch (err) {
        console.error(`❌ Greška pri sinkronizaciji entiteta ${item.entity}:`, err);
      }
    }
  }
}
