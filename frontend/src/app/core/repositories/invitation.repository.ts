import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';

@Injectable({ providedIn: 'root' })
export class InvitationRepository {
  private readonly baseUrl = `${API_BASE_URL}/invitations`;

  constructor(private http: HttpClient) {}

  invite(email: string, entity_type: 'household' | 'organization', entity_id: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/invite`, { email, entity_type, entity_id });
  }

  getPending(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/pending`);
  }

  accept(token: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/accept/${token}`, {});
  }

  reject(token: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/reject/${token}`);
  }
}
