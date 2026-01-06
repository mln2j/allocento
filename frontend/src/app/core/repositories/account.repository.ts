import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiHttpService } from '../services/api-http.service';
import { Account } from '../models/account.model';

@Injectable({
  providedIn: 'root',
})
export class AccountRepository {
  constructor(private api: ApiHttpService) {}

  listForCurrentUser(): Observable<Account[]> {
    return this.api.get<any[]>('/accounts').pipe(
      map(accounts => accounts.map(acc => this.mapApiToAccount(acc)))
    );
  }

  getById(id: number): Observable<Account> {
    return this.api.get<any>(`/accounts/${id}`).pipe(
      map(acc => this.mapApiToAccount(acc)),
    );
  }


  create(data: any): Observable<Account> {
    return this.api.post<any>('/accounts', data).pipe(
      map(acc => this.mapApiToAccount(acc))
    );
  }

  update(id: number, payload: Partial<Account>) {
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
    if (payload.openingBalance !== undefined) {
      apiPayload.opening_balance = payload.openingBalance;
    }
    if (payload.budgetLimit !== undefined) {
      apiPayload.budget_limit = payload.budgetLimit;
    }

    return this.api.put<any>(`/accounts/${id}`, apiPayload).pipe(
      map(acc => this.mapApiToAccount(acc)),
    );
  }


  delete(id: number) {
    return this.api.delete<void>(`/accounts/${id}`);
  }

  private mapApiToAccount(apiData: any): Account {
    const opening = Number(apiData.opening_balance ?? 0);
    const budget = apiData.budget_limit !== null && apiData.budget_limit !== undefined
      ? Number(apiData.budget_limit)
      : null;

    const current = apiData.current_balance !== undefined && apiData.current_balance !== null
      ? Number(apiData.current_balance)
      : opening; // fallback ako backend još ne šalje

    return {
      id: apiData.id,
      name: apiData.name,
      type: apiData.type,
      currency: apiData.currency,
      openingBalance: opening,
      currentBalance: current,
      budgetLimit: budget,
      remainingBudget: budget !== null ? budget - current : null,
      totalIncome: 0,
      totalExpense: 0,
      createdAt: apiData.created_at,
      updatedAt: apiData.updated_at,
    };
  }


}
