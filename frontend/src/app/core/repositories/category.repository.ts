import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WorkspaceService } from '../services/workspace.service';
import { Category, CategoryDetailsResponse } from '../models/category.model';
export type { Category, CategoryDetailsResponse };

@Injectable({
  providedIn: 'root'
})
export class CategoryRepository {
  private http = inject(HttpClient);
  private workspaceService = inject(WorkspaceService);
  private apiUrl = `${environment.apiBaseUrl}/categories`;

  getAll(): Observable<Category[]> {
    return this.http.get<Category[]>(this.apiUrl);
  }

  getById(id: number): Observable<CategoryDetailsResponse> {
    return this.http.get<CategoryDetailsResponse>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(this.apiUrl, data);
  }

  update(id: number, data: Partial<Category>): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  merge(fromId: number, toId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${fromId}/merge-into/${toId}`, {});
  }
}
