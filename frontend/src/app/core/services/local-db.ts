import { Injectable, inject } from '@angular/core';
import { LoggerService } from './logger.service';
import { TranslationService } from './translation.service'; // <-- UVOZIMO TRANSLATION SERVICE

@Injectable({
  providedIn: 'root'
})
export class LocalDbService {
  private logger = inject(LoggerService);
  private translationService = inject(TranslationService); // <-- INJEKTIRAMO GA

  private dbName = 'AllocentoDB';
  private dbVersion = 2;
  private db: IDBDatabase | null = null;

  /**
   * Pomoćna metoda za dohvaćanje prijevoda unutar servisa
   */
  private t(key: string, params?: any): string {
    return this.translationService.translate(key, params);
  }

  /**
   * Inicijalizira i otvara IndexedDB bazu podataka
   */
  initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        return resolve();
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('user_profile')) {
          db.createObjectStore('user_profile', {keyPath: 'id'});
        }

        if (!db.objectStoreNames.contains('accounts')) {
          db.createObjectStore('accounts', {keyPath: 'id'});
        }

        if (!db.objectStoreNames.contains('transactions')) {
          db.createObjectStore('transactions', {keyPath: 'id'});
        }

        if (!db.objectStoreNames.contains('offline_queue')) {
          db.createObjectStore('offline_queue', {keyPath: 'localId', autoIncrement: true});
        }

        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', {keyPath: 'id'});
        }

        if (!db.objectStoreNames.contains('workspaces')) {
          db.createObjectStore('workspaces', {keyPath: 'id'});
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        this.logger.log('splash.offlineDb');
        resolve();
      };

      request.onerror = (event: any) => {
        // Preveden ispis kritične greške u loggeru
        this.logger.error(this.t('splash.dbInitError'), event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Generička metoda za spremanje ili ažuriranje podataka (Upsert)
   */
  async put(storeName: string, data: any): Promise<void> {
    if (!this.db) {
      await this.initDatabase();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = (event: any) => reject(event.target.error);
    });
  }

  /**
   * Generička metoda za dohvaćanje svih podataka iz određene tablice
   */
  async getAll(storeName: string): Promise<any[]> {
    if (!this.db) {
      await this.initDatabase();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = (event: any) => resolve(event.target.result);
      request.onerror = (event: any) => reject(event.target.error);
    });
  }

  /**
   * Briše podatak iz tablice prema ID-u
   */
  async delete(storeName: string, id: any): Promise<void> {
    if (!this.db) {
      await this.initDatabase();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = (event: any) => reject(event.target.error);
    });
  }

  /**
   * Čisti cijelu tablicu (korisno kod Logout-a)
   */
  async clearStore(storeName: string): Promise<void> {
    if (!this.db) {
      await this.initDatabase();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = (event: any) => reject(event.target.error);
    });
  }
}
