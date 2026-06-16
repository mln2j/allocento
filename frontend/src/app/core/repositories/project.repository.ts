import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WorkspaceService } from '../services/workspace.service';

export interface Project {
  id: number;
  workspace_id: number;
  name: string;
  color: string;
  description?: string;
  status: 'active' | 'completed';
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectRepository {
  private http = inject(HttpClient);
  private workspaceService = inject(WorkspaceService);
  private apiUrl = `${environment.apiBaseUrl}/projects`;

  getAll(): Observable<Project[]> {
    return this.http.get<Project[]>(this.apiUrl);
  }

  getById(id: number): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(this.apiUrl, data);
  }

  update(id: number, data: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
