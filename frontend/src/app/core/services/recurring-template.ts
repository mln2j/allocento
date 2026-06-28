import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { WorkspaceService } from './workspace.service';

export interface RecurringTemplate {
  id: number;
  workspace_id: number;
  account_id: number;
  category_id?: number;
  name: string;
  type: 'income' | 'expense';
  amount: number;
  description?: string;
  tags?: string[];
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  day_of_month?: number;
  is_active: boolean;
  account?: any;
  category?: any;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root',
})
export class RecurringTemplateService {
  private http = inject(HttpClient);
  private workspaceService = inject(WorkspaceService);

  private get baseUrl() {
    const wsId = this.workspaceService.activeWorkspace()?.id;
    return `${API_BASE_URL}/workspaces/${wsId}/templates`;
  }

  getAll(): Observable<RecurringTemplate[]> {
    return this.http.get<RecurringTemplate[]>(this.baseUrl);
  }

  getById(id: number): Observable<RecurringTemplate> {
    return this.http.get<RecurringTemplate>(`${this.baseUrl}/${id}`);
  }

  create(data: Partial<RecurringTemplate>): Observable<RecurringTemplate> {
    return this.http.post<RecurringTemplate>(this.baseUrl, data);
  }

  update(id: number, data: Partial<RecurringTemplate>): Observable<RecurringTemplate> {
    return this.http.put<RecurringTemplate>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
