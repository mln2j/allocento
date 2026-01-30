import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';

export interface Organization {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  users?: any[];
}

@Injectable({ providedIn: 'root' })
export class OrganizationRepository {
  private readonly baseUrl = `${API_BASE_URL}/organization`;

  constructor(private http: HttpClient) {}

  get(): Observable<Organization> {
    return this.http.get<Organization>(this.baseUrl);
  }

  create(name: string, description?: string): Observable<Organization> {
    return this.http.post<Organization>(this.baseUrl, { name, description });
  }
}
