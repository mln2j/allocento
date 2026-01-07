import { Injectable } from '@angular/core';
import {map, Observable} from 'rxjs';
import { ApiHttpService } from '../services/api-http.service';
import { Transaction } from '../models/transaction.model';

@Injectable({ providedIn: 'root' })
export class TransactionRepository {
  constructor(private api: ApiHttpService) {}

  listForAccount(accountId: number): Observable<Transaction[]> {
    return this.api
      .get<any[]>(`/accounts/${accountId}/transactions`)
      .pipe(map(list => list.map(api => this.mapApiToTransaction(api))));
  }

  getById(transactionId: number): Observable<Transaction> {
    return this.api
      .get<any>(`/transactions/${transactionId}`)
      .pipe(map(api => this.mapApiToTransaction(api)));
  }

  create(accountId: number, payload: Partial<Transaction>): Observable<Transaction> {
    return this.api
      .post<any>(`/accounts/${accountId}/transactions`, payload)
      .pipe(map(api => this.mapApiToTransaction(api)));
  }

  update(accountId: number, transactionId: number, payload: Partial<Transaction>): Observable<Transaction> {
    return this.api
      .put<any>(`/accounts/${accountId}/transactions/${transactionId}`, payload)
      .pipe(map(api => this.mapApiToTransaction(api)));
  }


  delete(accountId: number, transactionId: number): Observable<void> {
    return this.api.delete<void>(`/accounts/${accountId}/transactions/${transactionId}`);
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
      user: api.user
        ? {
          id: api.user.id,
          name: api.user.name,
          email: api.user.email,
        }
        : null,
    };
  }
}
