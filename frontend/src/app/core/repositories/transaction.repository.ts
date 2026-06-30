import { Injectable, inject } from '@angular/core';
import { Observable, map, from, of, catchError, tap, switchMap } from 'rxjs';
import { ApiHttpService } from '../services/api-http.service';
import { Transaction } from '../models/transaction.model';
import { LocalDbService } from '../services/local-db';
import { AppInitializerService } from '../services/app-initializer';

@Injectable({ providedIn: 'root' })
export class TransactionRepository {
  private api = inject(ApiHttpService);
  private localDb = inject(LocalDbService);
  private appInitializer = inject(AppInitializerService);

  listForAccount(accountId: number): Observable<Transaction[]> {
    return this.api
      .get<any[]>(`/accounts/${accountId}/transactions`)
      .pipe(map(list => list.map(api => this.mapApiToTransaction(api))));
  }

  listAll(): Observable<Transaction[]> {
    if (!this.appInitializer.isOnlineMode) {
      // Offline mode: Dohvati iz lokalne baze
      return from(this.localDb.getAll('transactions')).pipe(
        map(list => {
          const mapped = list.map(item => this.mapLocalToTransaction(item));
          // Sortiraj po datumu silazno
          return mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        })
      );
    }

    return this.api.get<any>('/transactions').pipe(
      map(res => (res.data || []).map((api: any) => this.mapApiToTransaction(api))),
      tap(async (transactions) => {
        try {
          const offlineQueue = await this.localDb.getAll('offline_queue');
          if (!offlineQueue || offlineQueue.length === 0) {
            // Ako nemamo akcija koje čekaju na sinkronizaciju, sigurno je obrisati stare i staviti samo svježe s API-ja
            await this.localDb.clearStore('transactions');
          }
          // Spremi/Keširaj sve transakcije u IndexedDB u pozadini
          for (const t of transactions) {
            await this.localDb.put('transactions', this.mapTransactionToLocal(t));
          }
        } catch (e) {
          console.error('Greška pri spremanju transakcija lokalno', e);
        }
      }),
      switchMap(async (apiTransactions) => {
        try {
          const localTxs = await this.localDb.getAll('transactions');
          const queuedTxs = localTxs
            .filter(t => t.id < 0)
            .map(item => this.mapLocalToTransaction(item));
          
          const combined = [...queuedTxs, ...apiTransactions];
          return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } catch (e) {
          return apiTransactions;
        }
      }),
      catchError(() => {
        // U slučaju greške na mreži, dohvati iz lokalne baze
        return from(this.localDb.getAll('transactions')).pipe(
          map(list => {
            const mapped = list.map(item => this.mapLocalToTransaction(item));
            return mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          })
        );
      })
    );
  }

  getById(transactionId: number): Observable<Transaction> {
    if (!this.appInitializer.isOnlineMode) {
      return from(this.localDb.getAll('transactions')).pipe(
        map(list => {
          const item = list.find(tx => tx.id === transactionId);
          if (!item) throw new Error('Transaction not found offline.');
          return this.mapLocalToTransaction(item);
        })
      );
    }

    return this.api.get<any>(`/transactions/${transactionId}`).pipe(
      map(api => this.mapApiToTransaction(api)),
      tap(async (tx) => {
        try {
          await this.localDb.put('transactions', this.mapTransactionToLocal(tx));
        } catch (e) {
          console.warn('Failed to cache single transaction', tx.id, e);
        }
      }),
      catchError(() => {
        return from(this.localDb.getAll('transactions')).pipe(
          map(list => {
            const item = list.find(tx => tx.id === transactionId);
            if (!item) throw new Error('Transaction not found offline fallback.');
            return this.mapLocalToTransaction(item);
          })
        );
      })
    );
  }

  private createOffline(accountId: number, payload: Partial<Transaction>): Observable<Transaction> {
    const localId = -Date.now(); // Negativni ID za razlikovanje lokalnih transakcija
    let currentUser = null;
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (u && u.id) {
        currentUser = { id: u.id, name: u.name, email: u.email };
      }
    } catch (e) {}

    const localTx: Transaction = {
      id: localId,
      accountId: accountId,
      type: payload.type || 'expense',
      amount: payload.amount || 0,
      date: payload.date || new Date().toISOString(),
      description: payload.description || null,
      categoryId: payload.categoryId || null,
      targetAccountId: payload.targetAccountId || null,
      excludeFromAnalytics: payload.excludeFromAnalytics || null,
      user: currentUser
    };

    return from(
      (async () => {
        // 1. Spremi u 'transactions' kako bi se odmah prikazala u povijesti
        await this.localDb.put('transactions', this.mapTransactionToLocal(localTx));
        // 2. Spremi u 'offline_queue' za sinkronizaciju kad se internet vrati
        const queueItem = {
          action: 'create',
          payload: {
            account_id: accountId,
            type: localTx.type,
            amount: localTx.amount,
            date: localTx.date,
            description: localTx.description,
            category_id: localTx.categoryId,
            target_account_id: localTx.targetAccountId,
            exclude_from_analytics: localTx.excludeFromAnalytics,
            local_id: localId
          }
        };
        await this.localDb.put('offline_queue', queueItem);
        return localTx;
      })()
    );
  }

  create(accountId: number, payload: Partial<Transaction>): Observable<Transaction> {
    if (!this.appInitializer.isOnlineMode) {
      return this.createOffline(accountId, payload);
    }

    const apiPayload: any = {
      type: payload.type,
      amount: payload.amount,
      date: payload.date,
      description: payload.description,
      category_id: payload.categoryId !== undefined ? payload.categoryId : undefined,
      target_account_id: payload.targetAccountId !== undefined ? payload.targetAccountId : undefined,
      exclude_from_analytics: payload.excludeFromAnalytics !== undefined ? payload.excludeFromAnalytics : undefined,
    };

    return this.api.post<any>(`/accounts/${accountId}/transactions`, apiPayload).pipe(
      map(api => this.mapApiToTransaction(api)),
      tap(async (tx) => {
        try {
          await this.localDb.put('transactions', this.mapTransactionToLocal(tx));
        } catch (e) {
          console.warn('Failed to cache new transaction', tx.id, e);
        }
      }),
      catchError((error) => {
        if (error.status === 0 || error.status === 503 || error.status === 504) {
          console.warn('Network error during create. Falling back to offline mode.');
          this.appInitializer.isOnlineMode = false;
          return this.createOffline(accountId, payload);
        }
        throw error;
      })
    );
  }

  private updateOffline(accountId: number, transactionId: number, payload: Partial<Transaction>): Observable<Transaction> {
    return from(
      (async () => {
        const list = await this.localDb.getAll('transactions');
        const localItem = list.find(tx => tx.id === transactionId);
        if (localItem) {
          const updated = {
            ...localItem,
            type: payload.type || localItem.type,
            amount: payload.amount !== undefined ? payload.amount : localItem.amount,
            date: payload.date || localItem.date,
            description: payload.description !== undefined ? payload.description : localItem.description,
            categoryId: payload.categoryId !== undefined ? payload.categoryId : localItem.categoryId,
            targetAccountId: payload.targetAccountId !== undefined ? payload.targetAccountId : localItem.targetAccountId,
            excludeFromAnalytics: payload.excludeFromAnalytics !== undefined ? payload.excludeFromAnalytics : localItem.excludeFromAnalytics
          };
          await this.localDb.put('transactions', updated);

          const queueItem = {
            action: 'update',
            transaction_id: transactionId,
            payload: {
              account_id: accountId,
              type: updated.type,
              amount: updated.amount,
              date: updated.date,
              description: updated.description,
              category_id: updated.categoryId,
              target_account_id: updated.targetAccountId,
              exclude_from_analytics: updated.excludeFromAnalytics
            }
          };
          await this.localDb.put('offline_queue', queueItem);

          return this.mapLocalToTransaction(updated);
        }
        throw new Error('Transaction to update not found offline.');
      })()
    );
  }

  update(accountId: number, transactionId: number, payload: Partial<Transaction>): Observable<Transaction> {
    if (!this.appInitializer.isOnlineMode) {
      return this.updateOffline(accountId, transactionId, payload);
    }

    const apiPayload: any = {
      type: payload.type,
      amount: payload.amount,
      date: payload.date,
      description: payload.description,
      category_id: payload.categoryId !== undefined ? payload.categoryId : undefined,
      target_account_id: payload.targetAccountId !== undefined ? payload.targetAccountId : undefined,
      exclude_from_analytics: payload.excludeFromAnalytics !== undefined ? payload.excludeFromAnalytics : undefined,
    };

    return this.api.put<any>(`/accounts/${accountId}/transactions/${transactionId}`, apiPayload).pipe(
      map(api => this.mapApiToTransaction(api)),
      tap(async (tx) => {
        try {
          await this.localDb.put('transactions', this.mapTransactionToLocal(tx));
        } catch (e) {
          console.warn('Failed to update cached transaction', tx.id, e);
        }
      }),
      catchError((error) => {
        if (error.status === 0 || error.status === 503 || error.status === 504) {
          console.warn('Network error during update. Falling back to offline mode.');
          this.appInitializer.isOnlineMode = false;
          return this.updateOffline(accountId, transactionId, payload);
        }
        throw error;
      })
    );
  }

  private deleteOffline(accountId: number, transactionId: number): Observable<void> {
    return from(
      (async () => {
        await this.localDb.delete('transactions', transactionId);
        const queueItem = {
          action: 'delete',
          transaction_id: transactionId
        };
        await this.localDb.put('offline_queue', queueItem);
      })()
    );
  }

  delete(accountId: number, transactionId: number): Observable<void> {
    if (!this.appInitializer.isOnlineMode) {
      return this.deleteOffline(accountId, transactionId);
    }

    return this.api.delete<void>(`/accounts/${accountId}/transactions/${transactionId}`).pipe(
      tap(async () => {
        try {
          await this.localDb.delete('transactions', transactionId);
        } catch (e) {
          console.warn('Failed to delete cached transaction', transactionId, e);
        }
      }),
      catchError((error) => {
        if (error.status === 0 || error.status === 503 || error.status === 504) {
          console.warn('Network error during delete. Falling back to offline mode.');
          this.appInitializer.isOnlineMode = false;
          return this.deleteOffline(accountId, transactionId);
        }
        throw error;
      })
    );
  }


  private mapApiToTransaction(api: any): Transaction {
    return {
      id: api.id,
      accountId: api.account_id,
      type: api.type,
      amount: api.amount,
      date: api.date,
      description: api.description,
      categoryId: api.category_id ?? null,
      projectId: api.project_id ?? null,
      targetAccountId: api.target_account_id ?? null,
      excludeFromAnalytics: api.exclude_from_analytics ?? null,
      user: (api.user || api.created_by)
        ? {
          id: (api.user || api.created_by).id,
          name: (api.user || api.created_by).name,
          email: (api.user || api.created_by).email,
        }
        : null,
      account: api.account ? { id: api.account.id, name: api.account.name } : undefined,
      category: api.category ? { id: api.category.id, name: api.category.name, color: api.category.color } : undefined,
      project: api.project ? { id: api.project.id, name: api.project.name, color: api.project.color } : undefined,
    };
  }

  private mapLocalToTransaction(local: any): Transaction {
    return {
      id: local.id,
      accountId: local.accountId,
      type: local.type,
      amount: local.amount,
      date: local.date,
      description: local.description,
      categoryId: local.categoryId,
      projectId: local.projectId,
      targetAccountId: local.targetAccountId,
      excludeFromAnalytics: local.excludeFromAnalytics,
      user: local.user,
      account: local.account,
      category: local.category,
      project: local.project
    };
  }

  private mapTransactionToLocal(tx: Transaction): any {
    return {
      id: tx.id,
      accountId: tx.accountId,
      type: tx.type,
      amount: tx.amount,
      date: tx.date,
      description: tx.description,
      categoryId: tx.categoryId,
      projectId: tx.projectId,
      targetAccountId: tx.targetAccountId,
      excludeFromAnalytics: tx.excludeFromAnalytics,
      user: tx.user,
      account: tx.account,
      category: tx.category,
      project: tx.project
    };
  }

  getCategories(): Observable<any[]> {
    if (!this.appInitializer.isOnlineMode) {
      return from(this.localDb.getAll('categories'));
    }
    return this.api.get<any[]>('/categories').pipe(
      tap(async (categories) => {
        try {
          // Očisti staro stanje pa ubaci novo
          await this.localDb.clearStore('categories');
          for (const cat of categories) {
            await this.localDb.put('categories', cat);
          }
        } catch (e) {
          console.warn('Failed to cache categories', e);
        }
      }),
      catchError(() => {
        return from(this.localDb.getAll('categories'));
      })
    );
  }
}

