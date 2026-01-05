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

  create(data: any): Observable<Account> {
    return this.api.post<any>('/accounts', data).pipe(
      map(acc => this.mapApiToAccount(acc))
    );
  }

  update(id: number, payload: Partial<Account>) {
    return this.api.put<any>(`/accounts/${id}`, payload).pipe(
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

    return {
      id: apiData.id,
      name: apiData.name,
      type: apiData.type, // 'personal' | 'household' | 'organization'
      currency: apiData.currency,
      openingBalance: opening,
      currentBalance: opening, // dok ne dođu transakcije/aggregate
      budgetLimit: budget,
      remainingBudget: budget !== null ? budget - opening : null,
      totalIncome: 0,
      totalExpense: 0,
      createdAt: apiData.created_at,
      updatedAt: apiData.updated_at,
    };
  }

}
