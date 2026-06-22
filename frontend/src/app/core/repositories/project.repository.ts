import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, tap, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WorkspaceService } from '../services/workspace.service';
import { AppInitializerService } from '../services/app-initializer';
import { LocalDbService } from '../services/local-db';
import { Project, ProjectDetailsResponse } from '../models/project.model';
export type { Project, ProjectDetailsResponse };

@Injectable({
  providedIn: 'root'
})
export class ProjectRepository {
  private http = inject(HttpClient);
  private workspaceService = inject(WorkspaceService);
  private appInitializer = inject(AppInitializerService);
  private localDb = inject(LocalDbService);
  private apiUrl = `${environment.apiBaseUrl}/projects`;

  getAll(): Observable<Project[]> {
    if (!this.appInitializer.isOnlineMode) {
      return from(this.localDb.getAll('projects'));
    }
    return this.http.get<Project[]>(this.apiUrl).pipe(
      tap(async (projects) => {
        try {
          await this.localDb.clearStore('projects');
          for (const proj of projects) {
            await this.localDb.put('projects', proj);
          }
        } catch (e) {
          console.warn('Failed to cache projects', e);
        }
      }),
      catchError(() => from(this.localDb.getAll('projects')))
    );
  }

  getById(id: number): Observable<ProjectDetailsResponse> {
    if (!this.appInitializer.isOnlineMode) {
      return from((async () => {
        const projects = await this.localDb.getAll('projects');
        const proj = projects.find(p => p.id === id);
        if (!proj) throw new Error('Project not found offline.');
        return { project: proj, transactions: [] } as any;
      })());
    }
    return this.http.get<ProjectDetailsResponse>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<Project>): Observable<Project> {
    if (!this.appInitializer.isOnlineMode) {
      const localId = -Date.now();
      const localProj: Project = {
        id: localId,
        workspace_id: this.workspaceService.activeWorkspace()?.id || 0,
        name: data.name || '',
        description: data.description || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return from((async () => {
        await this.localDb.put('projects', localProj);
        await this.localDb.put('offline_queue', {
          entity: 'project',
          action: 'create',
          entity_id: localId,
          payload: data
        });
        return localProj;
      })());
    }

    return this.http.post<Project>(this.apiUrl, data).pipe(
      tap(async (proj) => await this.localDb.put('projects', proj))
    );
  }

  update(id: number, data: Partial<Project>): Observable<Project> {
    if (!this.appInitializer.isOnlineMode) {
      return from((async () => {
        const projects = await this.localDb.getAll('projects');
        const proj = projects.find(p => p.id === id);
        if (!proj) throw new Error('Project not found offline.');
        
        const updated = { ...proj, ...data, updated_at: new Date().toISOString() };
        await this.localDb.put('projects', updated);
        await this.localDb.put('offline_queue', {
          entity: 'project',
          action: 'update',
          entity_id: id,
          payload: data
        });
        return updated;
      })());
    }

    return this.http.put<Project>(`${this.apiUrl}/${id}`, data).pipe(
      tap(async (proj) => await this.localDb.put('projects', proj))
    );
  }

  delete(id: number): Observable<void> {
    if (!this.appInitializer.isOnlineMode) {
      return from((async () => {
        await this.localDb.delete('projects', id);
        await this.localDb.put('offline_queue', {
          entity: 'project',
          action: 'delete',
          entity_id: id
        });
      })());
    }

    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(async () => await this.localDb.delete('projects', id))
    );
  }
}
