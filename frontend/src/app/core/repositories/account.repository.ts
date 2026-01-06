import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiHttpService } from '../services/api-http.service';
import { Account, AccountType } from '../models/account.model';

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
  constructor(private api: ApiHttpService) {}

  listForCurrentUser(): Observable<Account[]> {
    return this.api.get<any[]>('/accounts').pipe(
      map(accounts => accounts.map(acc => this.mapApiToAccount(acc))),
    );
  }

  getById(id: number): Observable<Account> {
    return this.api.get<any>(`/accounts/${id}`).pipe(
      map(acc => this.mapApiToAccount(acc)),
    );
  }

  create(payload: AccountCreatePayload): Observable<Account> {
    // backend očekuje: name, type, currency, balance
    return this.api.post<any>('/accounts', payload).pipe(
      map(acc => this.mapApiToAccount(acc)),
    );
  }

  update(id: number, payload: AccountUpdatePayload): Observable<Account> {
    const apiPayload: any = {};

    if (payload.name !== undefined) {
      apiPayload.name = payload.name;
    }
    if (payload.type !== undefined) {
      apiPayload.type = payload.type;
    }
    if (payload.currency !== undefined) {
      apiPayload.currency = payload.currency;
    }
    if (payload.balance !== undefined) {
      apiPayload.balance = payload.balance;
    }

    return this.api.put<any>(`/accounts/${id}`, apiPayload).pipe(
      map(acc => this.mapApiToAccount(acc)),
    );
  }

  delete(id: number) {
    return this.api.delete<void>(`/accounts/${id}`);
  }

  private mapApiToAccount(apiData: any): Account {
    return {
      id: apiData.id,
      name: apiData.name,
      type: apiData.type,
      currency: apiData.currency,
      balance: Number(apiData.balance ?? 0),
    };
  }
}
