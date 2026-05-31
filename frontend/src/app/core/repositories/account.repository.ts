import { Injectable, inject } from '@angular/core';
import { Observable, map, from, catchError, tap } from 'rxjs';
import { ApiHttpService } from '../services/api-http.service';
import { Account, AccountType } from '../models/account.model';
import { LocalDbService } from '../services/local-db';
import { AppInitializerService } from '../services/app-initializer';

export interface AccountCreatePayload {
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
}

export interface AccountUpdatePayload {
  name?: string;
  type?: AccountType;
  currency?: string;
  balance?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AccountRepository {
  private api = inject(ApiHttpService);
  private localDb = inject(LocalDbService);
  private appInitializer = inject(AppInitializerService);

  listForCurrentUser(): Observable<Account[]> {
    if (!this.appInitializer.isOnlineMode) {
      // Offline: Dohvati iz IndexedDB
      return from(this.localDb.getAll('accounts')).pipe(
        map(list => list.map(item => this.mapLocalToAccount(item)))
      );
    }

    return this.api.get<any[]>('/accounts').pipe(
      map(accounts => accounts.map(acc => this.mapApiToAccount(acc))),
      tap(async (accounts) => {
        // Pozadinski spremi u IndexedDB
        for (const acc of accounts) {
          try {
            await this.localDb.put('accounts', this.mapAccountToLocal(acc));
          } catch (e) {
            console.warn('Failed to cache account', acc.id, e);
          }
        }
      }),
      catchError(() => {
        return from(this.localDb.getAll('accounts')).pipe(
          map(list => list.map(item => this.mapLocalToAccount(item)))
        );
      })
    );
  }

  getById(id: number): Observable<Account> {
    if (!this.appInitializer.isOnlineMode) {
      return from(this.localDb.getAll('accounts')).pipe(
        map(list => {
          const item = list.find(acc => acc.id === id);
          if (!item) throw new Error('Account not found offline.');
          return this.mapLocalToAccount(item);
        })
      );
    }

    return this.api.get<any>(`/accounts/${id}`).pipe(
      map(acc => this.mapApiToAccount(acc)),
      tap(async (acc) => {
        try {
          await this.localDb.put('accounts', this.mapAccountToLocal(acc));
        } catch (e) {
          console.warn('Failed to cache single account', acc.id, e);
        }
      }),
      catchError(() => {
        return from(this.localDb.getAll('accounts')).pipe(
          map(list => {
            const item = list.find(acc => acc.id === id);
            if (!item) throw new Error('Account not found offline fallback.');
            return this.mapLocalToAccount(item);
          })
        );
      })
    );
  }

  create(payload: AccountCreatePayload): Observable<Account> {
    if (!this.appInitializer.isOnlineMode) {
      // Offline: Stvori lokalni račun privremeno
      const localId = -Date.now();
      const localAcc: Account = {
        id: localId,
        name: payload.name,
        type: payload.type,
        currency: payload.currency,
        balance: payload.balance,
        is_primary: false
      };

      return from(
        (async () => {
          await this.localDb.put('accounts', this.mapAccountToLocal(localAcc));
          return localAcc;
        })()
      );
    }

    return this.api.post<any>('/accounts', payload).pipe(
      map(acc => this.mapApiToAccount(acc)),
      tap(async (acc) => {
        try {
          await this.localDb.put('accounts', this.mapAccountToLocal(acc));
        } catch (e) {
          console.warn('Failed to cache created account', acc.id, e);
        }
      })
    );
  }

  update(id: number, payload: AccountUpdatePayload): Observable<Account> {
    if (!this.appInitializer.isOnlineMode) {
      return from(
        (async () => {
          const list = await this.localDb.getAll('accounts');
          const localItem = list.find(acc => acc.id === id);
          if (localItem) {
            const updated = {
              ...localItem,
              name: payload.name !== undefined ? payload.name : localItem.name,
              type: payload.type !== undefined ? payload.type : localItem.type,
              currency: payload.currency !== undefined ? payload.currency : localItem.currency,
              balance: payload.balance !== undefined ? payload.balance : localItem.balance
            };
            await this.localDb.put('accounts', updated);
            return this.mapLocalToAccount(updated);
          }
          throw new Error('Account to update not found offline.');
        })()
      );
    }

    const apiPayload: any = {};
    if (payload.name !== undefined) apiPayload.name = payload.name;
    if (payload.type !== undefined) apiPayload.type = payload.type;
    if (payload.currency !== undefined) apiPayload.currency = payload.currency;
    if (payload.balance !== undefined) apiPayload.balance = payload.balance;

    return this.api.put<any>(`/accounts/${id}`, apiPayload).pipe(
      map(acc => this.mapApiToAccount(acc)),
      tap(async (acc) => {
        try {
          await this.localDb.put('accounts', this.mapAccountToLocal(acc));
        } catch (e) {
          console.warn('Failed to update cached account', acc.id, e);
        }
      })
    );
  }

  delete(id: number) {
    if (!this.appInitializer.isOnlineMode) {
      return from(
        (async () => {
          await this.localDb.delete('accounts', id);
        })()
      );
    }

    return this.api.delete<void>(`/accounts/${id}`).pipe(
      tap(async () => {
        try {
          await this.localDb.delete('accounts', id);
        } catch (e) {
          console.warn('Failed to delete account from cache', id, e);
        }
      })
    );
  }

  setPrimary(id: number): Observable<any> {
    return this.api.post<any>(`/accounts/${id}/set-primary`, {}).pipe(
      tap(async () => {
        try {
          const list = await this.localDb.getAll('accounts');
          for (const item of list) {
            item.is_primary = item.id === id;
            await this.localDb.put('accounts', item);
          }
        } catch (e) {
          console.warn('Failed to update primary account state in cache', e);
        }
      })
    );
  }

  private mapApiToAccount(apiData: any): Account {
    return {
      id: apiData.id,
      name: apiData.name,
      type: apiData.type,
      currency: apiData.currency,
      balance: Number(apiData.balance ?? 0),
      is_primary: !!apiData.is_primary,
    };
  }

  private mapLocalToAccount(local: any): Account {
    return {
      id: local.id,
      name: local.name,
      type: local.type,
      currency: local.currency,
      balance: Number(local.balance ?? 0),
      is_primary: !!local.is_primary
    };
  }

  private mapAccountToLocal(acc: Account): any {
    return {
      id: acc.id,
      name: acc.name,
      type: acc.type,
      currency: acc.currency,
      balance: acc.balance,
      is_primary: acc.is_primary
    };
  }
}

