import { Injectable, inject } from '@angular/core';
import { Observable, map, from, of, catchError, tap } from 'rxjs';
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
        // Spremi/Keširaj sve transakcije u IndexedDB u pozadini
        for (const tx of transactions) {
          try {
            await this.localDb.put('transactions', this.mapTransactionToLocal(tx));
          } catch (e) {
            console.warn('Failed to cache transaction', tx.id, e);
          }
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

  create(accountId: number, payload: Partial<Transaction>): Observable<Transaction> {
    if (!this.appInitializer.isOnlineMode) {
      // Offline: Stvori lokalnu transakciju, spremi je u 'transactions' i stavi u 'offline_queue'
      const localId = -Date.now(); // Negativni ID za razlikovanje lokalnih transakcija
      const localTx: Transaction = {
        id: localId,
        accountId: accountId,
        type: payload.type || 'expense',
        amount: payload.amount || 0,
        date: payload.date || new Date().toISOString(),
        description: payload.description || null,
        categoryId: payload.categoryId || null,
        projectId: payload.projectId || null,
        user: null
      };

      return from(
        (async () => {
          // 1. Spremi u 'transactions' kako bi se odmah prikazala u povijesti
          await this.localDb.put('transactions', this.mapTransactionToLocal(localTx));
          // 2. Spremi u 'offline_queue' za sinkronizaciju kad se internet vrati
          const queueItem = {
            accountId: accountId,
            type: localTx.type,
            amount: localTx.amount,
            date: localTx.date,
            description: localTx.description,
            category_id: localTx.categoryId,
            project_id: localTx.projectId
          };
          await this.localDb.put('offline_queue', queueItem);
          return localTx;
        })()
      );
    }

    const apiPayload: any = {
      type: payload.type,
      amount: payload.amount,
      date: payload.date,
      description: payload.description,
      category_id: payload.categoryId !== undefined ? payload.categoryId : undefined,
    };

    return this.api.post<any>(`/accounts/${accountId}/transactions`, apiPayload).pipe(
      map(api => this.mapApiToTransaction(api)),
      tap(async (tx) => {
        try {
          await this.localDb.put('transactions', this.mapTransactionToLocal(tx));
        } catch (e) {
          console.warn('Failed to cache new transaction', tx.id, e);
        }
      })
    );
  }

  update(accountId: number, transactionId: number, payload: Partial<Transaction>): Observable<Transaction> {
    if (!this.appInitializer.isOnlineMode) {
      // Za offline update, samo lokalno ažuriramo transakciju
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
              categoryId: payload.categoryId !== undefined ? payload.categoryId : localItem.categoryId
            };
            await this.localDb.put('transactions', updated);
            return this.mapLocalToTransaction(updated);
          }
          throw new Error('Transaction to update not found offline.');
        })()
      );
    }

    const apiPayload: any = {
      type: payload.type,
      amount: payload.amount,
      date: payload.date,
      description: payload.description,
      category_id: payload.categoryId !== undefined ? payload.categoryId : undefined,
    };

    return this.api.put<any>(`/accounts/${accountId}/transactions/${transactionId}`, apiPayload).pipe(
      map(api => this.mapApiToTransaction(api)),
      tap(async (tx) => {
        try {
          await this.localDb.put('transactions', this.mapTransactionToLocal(tx));
        } catch (e) {
          console.warn('Failed to update cached transaction', tx.id, e);
        }
      })
    );
  }

  delete(accountId: number, transactionId: number): Observable<void> {
    if (!this.appInitializer.isOnlineMode) {
      return from(
        (async () => {
          await this.localDb.delete('transactions', transactionId);
        })()
      );
    }

    return this.api.delete<void>(`/accounts/${accountId}/transactions/${transactionId}`).pipe(
      tap(async () => {
        try {
          await this.localDb.delete('transactions', transactionId);
        } catch (e) {
          console.warn('Failed to remove transaction from cache', transactionId, e);
        }
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
      user: (api.user || api.created_by)
        ? {
          id: (api.user || api.created_by).id,
          name: (api.user || api.created_by).name,
          email: (api.user || api.created_by).email,
        }
        : null,
      account: api.account ? { id: api.account.id, name: api.account.name } : undefined,
      category: api.category ? { id: api.category.id, name: api.category.name } : undefined,
      project: api.project ? { id: api.project.id, name: api.project.name } : undefined,
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
