import { Injectable, inject } from '@angular/core';
import { LoggerService } from './logger.service'; // <-- UVOZIMO LOGGER

@Injectable({
  providedIn: 'root'
})
export class LocalDbService {
  private logger = inject(LoggerService); // <-- INJEKTIRAMO LOGGER

  private dbName = 'AllocentoDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  /**
   * Inicijalizira i otvara IndexedDB bazu podataka
   */
  initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        return resolve();
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      // Pokreće se samo ako baza ne postoji ili se verzija povećala
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        // 1. Tablica za korisnički profil
        if (!db.objectStoreNames.contains('user_profile')) {
          db.createObjectStore('user_profile', {keyPath: 'id'});
        }

        // 2. Tablica za bankovne račune/kartice
        if (!db.objectStoreNames.contains('accounts')) {
          db.createObjectStore('accounts', {keyPath: 'id'});
        }

        // 3. Tablica za keširane transakcije
        if (!db.objectStoreNames.contains('transactions')) {
          db.createObjectStore('transactions', {keyPath: 'id'});
        }

        // 4. Tablica za offline queue (sinkronizacija troškova unesenih bez interneta)
        if (!db.objectStoreNames.contains('offline_queue')) {
          db.createObjectStore('offline_queue', {keyPath: 'localId', autoIncrement: true});
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        // Automatski prevodi i ispisuje: "Provjera offline baze u sesiji..." / "Checking offline database..."
        this.logger.log('splash.offlineDb');
        resolve();
      };

      request.onerror = (event: any) => {
        // Kritična greška ostaje vidljiva i u produkciji radi lakšeg debugiranja
        this.logger.error('Greška pri otvaranju IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Generička metoda za spremanje ili ažuriranje podataka (Upsert)
   */
  put(storeName: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('Baza podataka nije inicijalizirana.');

      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = (event: any) => reject(event.target.error);
    });
  }

  /**
   * Generička metoda za dohvaćanje svih podataka iz određene tablice
   */
  getAll(storeName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('Baza podataka nije inicijalizirana.');

      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = (event: any) => resolve(event.target.result);
      request.onerror = (event: any) => reject(event.target.error);
    });
  }

  /**
   * Briše podatak iz tablice prema ID-u
   */
  delete(storeName: string, id: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('Baza podataka nije inicijalizirana.');

      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = (event: any) => reject(event.target.error);
    });
  }

  /**
   * Čisti cijelu tablicu (korisno kod Logout-a)
   */
  clearStore(storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('Baza podataka nije inicijalizirana.');

      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = (event: any) => reject(event.target.error);
    });
  }
}
