import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../api.config';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class InvitationRepository {
  private http = inject(HttpClient);

  getPending(): Observable<any[]> {
    return this.http.get<any[]>(`${API_BASE_URL}/invitations/pending`);
  }

  accept(token: string): Observable<any> {
    return this.http.post(`${API_BASE_URL}/invitations/${token}/accept`, {});
  }

  reject(token: string): Observable<any> {
    return this.http.delete(`${API_BASE_URL}/invitations/${token}/reject`);
  }
}
