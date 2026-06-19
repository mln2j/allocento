import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LocalDbService } from './local-db';
import { API_BASE_URL } from '../api.config';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private isSyncing = false;

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
        transactions: queue.map(item => ({
          account_id: item.accountId, // API traži account_id sa underscore
          type: item.type,
          amount: item.amount,
          date: item.date,
          description: item.description,
          category_id: item.category_id,
          tags: item.tags || []
        }))
      };

      this.http.post(`${API_BASE_URL}/transactions/bulk`, payload).subscribe({
        next: async (response) => {
          console.log(`✅ Bulk sinkronizacija uspješna!`);
          // Očisti cijeli queue jer je bulk prošao
          await this.localDb.clearStore('offline_queue');
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
