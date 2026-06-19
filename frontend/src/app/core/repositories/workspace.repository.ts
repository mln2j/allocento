import { Injectable, inject, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, from, map, of, tap } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { LocalDbService } from '../services/local-db';
import { AppInitializerService } from '../services/app-initializer';

export interface Workspace {
  id: number;
  workspace_id: string; // Primijetio sam da u where upitima koristiš workspace_id string/UUID
  name: string;
  type: 'personal' | 'household' | 'company';
  icon: string;
  currency: string;
  users_count?: number;
  pivot?: { role: string };
  users?: any[];
  accounts?: any[];
  enabled_features?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class WorkspaceRepository {
  private http = inject(HttpClient);
  private localDb = inject(LocalDbService);
  private injector = inject(Injector);

  getWorkspaces(): Observable<Workspace[]> {
    const isOnlineMode = this.injector.get(AppInitializerService).isOnlineMode;
    if (!isOnlineMode) {
      return from(this.localDb.getAll('workspaces'));
    }

    return this.http.get<Workspace[]>(`${API_BASE_URL}/workspaces`).pipe(
      tap(async (workspaces) => {
        try {
          await this.localDb.clearStore('workspaces');
          for (const ws of workspaces) {
            await this.localDb.put('workspaces', ws);
          }
        } catch (e) {
          console.warn('Failed to cache workspaces', e);
        }
      }),
      catchError(() => {
        return from(this.localDb.getAll('workspaces'));
      })
    );
  }

  setFavoriteWorkspace(id: string | number): Observable<any> {
    return this.http.post(`${API_BASE_URL}/workspaces/${id}/set-favorite`, {});
  }

  removeMember(wsId: string | number, userId: number): Observable<any> {
    return this.http.delete(`${API_BASE_URL}/workspaces/${wsId}/members/${userId}`);
  }

  getWorkspaceDetails(id: string | number): Observable<Workspace> {
    return this.http.get<Workspace>(`${API_BASE_URL}/workspaces/${id}`);
  }

  createWorkspace(data: Partial<Workspace>): Observable<Workspace> {
    return this.http.post<Workspace>(`${API_BASE_URL}/workspaces`, data);
  }

  updateWorkspace(id: string | number, data: Partial<Workspace>): Observable<Workspace> {
    return this.http.put<Workspace>(`${API_BASE_URL}/workspaces/${id}`, data);
  }

  deleteWorkspace(id: string | number): Observable<any> {
    return this.http.delete(`${API_BASE_URL}/workspaces/${id}`);
  }

  inviteMember(wsId: string | number, email: string): Observable<any> {
    return this.http.post(
      `${API_BASE_URL}/workspaces/${wsId}/invitations`,
      { email }
    );
  }

  leaveWorkspace(wsId: string | number): Observable<any> {
    return this.http.post(`${API_BASE_URL}/workspaces/${wsId}/leave`, {});
  }
}
