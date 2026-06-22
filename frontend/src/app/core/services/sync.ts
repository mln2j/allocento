import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
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

  /**
   * Sluša promjene mreže u pregledniku.
   * Čim se uređaj spoji na internet, automatski pokreće sinkronizaciju.
   */
  private initOnlineListener(): void {
    window.addEventListener('online', () => {
      console.log('📶 Internet se vratio! Pokrećem pozadinsku sinkronizaciju...');
      this.syncOfflineQueue();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Uređaj je izgubio vezu s internetom. Prebačeno na lokalni rad.');
    });
  }

  /**
   * Prolazi kroz sve stavke u 'offline_queue' i šalje ih na backend odjednom (Bulk)
   */
  async syncOfflineQueue(): Promise<void> {
    if (this.isSyncing) return;

    try {
      const queue = await this.localDb.getAll('offline_queue');

      if (!queue || queue.length === 0) {
        console.log('✅ Nema podataka u offline redu čekanja.');
        return;
      }

      this.isSyncing = true;
      console.log(`🔄 Slanje ${queue.length} stavki na bulk sinkronizaciju...`);

      const payload = {
        operations: queue.map(item => {
          // Backward compatibility for old items in queue that didn't have 'action'
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
                project_id: item.project_id
              }
            };
          }

          // New items
          return {
            action: item.action,
            transaction_id: item.transaction_id,
            payload: item.payload
          };
        })
      };

      this.http.post(`${API_BASE_URL}/transactions/sync`, payload).subscribe({
        next: async (response: any) => {
          console.log(`✅ Sync uspješan! Ažurirano ${response.synced} zapisa.`);
          // Očisti cijeli queue jer je bulk prošao
          await this.localDb.clearStore('offline_queue');

          // Id mappings:
          if (response.id_mappings) {
            const list = await this.localDb.getAll('transactions');
            for (const localId of Object.keys(response.id_mappings)) {
              const realId = response.id_mappings[localId];
              const localNum = parseInt(localId, 10);
              const tx = list.find(t => t.id === localNum);
              if (tx) {
                // Remove the old negative ID from IndexedDB
                await this.localDb.delete('transactions', localNum);
                // Insert with new real ID
                tx.id = realId;
                await this.localDb.put('transactions', tx);
              }
            }
          }
          this.syncCompleted$.next();
        },
        error: (err) => {
          console.error(`⚠️ Neuspjela bulk sinkronizacija. Podaci ostaju u redu čekanja.`, err);
        }
      });

    } catch (error) {
      console.error('❌ Greška tijekom dohvaćanja reda čekanja:', error);
    } finally {
      this.isSyncing = false;
    }
  }
}
