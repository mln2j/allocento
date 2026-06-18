import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';

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

  getWorkspaces(): Observable<Workspace[]> {
    return this.http.get<Workspace[]>(`${API_BASE_URL}/workspaces`);
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
