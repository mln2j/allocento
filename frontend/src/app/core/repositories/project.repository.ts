import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WorkspaceService } from '../services/workspace.service';
import { Project, ProjectDetailsResponse } from '../models/project.model';
export type { Project, ProjectDetailsResponse };

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

  getById(id: number): Observable<ProjectDetailsResponse> {
    return this.http.get<ProjectDetailsResponse>(`${this.apiUrl}/${id}`);
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
