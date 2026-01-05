import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiHttpService } from '../services/api-http.service';
import { Transaction } from '../models/transaction.model';

@Injectable({ providedIn: 'root' })
export class TransactionRepository {
  constructor(private api: ApiHttpService) {}

  listForAccount(accountId: number): Observable<Transaction[]> {
    return this.api.get<Transaction[]>(`/accounts/${accountId}/transactions`);
  }

  create(accountId: number, payload: Partial<Transaction>): Observable<Transaction> {
    return this.api.post<Transaction>(`/accounts/${accountId}/transactions`, payload);
  }

  update(accountId: number, transactionId: number, payload: Partial<Transaction>): Observable<Transaction> {
    return this.api.put<Transaction>(`/accounts/${accountId}/transactions/${transactionId}`, payload);
  }

  delete(accountId: number, transactionId: number): Observable<void> {
    return this.api.delete<void>(`/accounts/${accountId}/transactions/${transactionId}`);
  }
}
