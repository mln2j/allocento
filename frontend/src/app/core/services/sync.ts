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
   * Prolazi kroz sve stavke u 'offline_queue' i šalje ih na backend jednu po jednu
   */
  async syncOfflineQueue(): Promise<void> {
    // Ako već sinkroniziramo, nemoj pokretati ponovno da ne dupliramo zahtjeve
    if (this.isSyncing) return;

    try {
      const queue = await this.localDb.getAll('offline_queue');

      if (!queue || queue.length === 0) {
        console.log('✅ Nema podataka u offline redu čekanja.');
        return;
      }

      this.isSyncing = true;
      console.log(`🔄 Pronađeno ${queue.length} stavki za sinkronizaciju...`);

      for (const item of queue) {
        await this.sendItemToBackend(item);
      }

    } catch (error) {
      console.error('❌ Greška tijekom sinkronizacije reda čekanja:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Šalje pojedinačnu stavku na Laravel i briše je iz lokalnog queue-a nakon uspjeha
   */
  private async sendItemToBackend(item: any): Promise<void> {
    const { localId, accountId, ...payload } = item; // Maknemo lokalni ID i accountId iz payload-a

    return new Promise((resolve) => {
      this.http.post(`${API_BASE_URL}/accounts/${accountId}/transactions`, payload).subscribe({
        next: async (response) => {
          console.log(`✅ Stavka unutar baze s lokalnim ID-em ${localId} je uspješno sinkronizirana.`);
          // Brišemo iz IndexedDB reda čekanja jer je uspješno spremljeno na serveru
          await this.localDb.delete('offline_queue', localId);
          resolve();
        },
        error: (err) => {
          console.error(`⚠️ Neuspjela sinkronizacija za lokalni ID ${localId}. Ostaje u redu čekanja.`, err);
          // Ovdje NE radimo reject, nego dopuštamo petlji da nastavi s idućom stavkom
          resolve();
        }
      });
    });
  }
}
