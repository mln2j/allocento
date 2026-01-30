import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';

export interface Household {
  id: number;
  name: string;
  owner_id: number;
  users?: any[];
}

@Injectable({ providedIn: 'root' })
export class HouseholdRepository {
  private readonly baseUrl = `${API_BASE_URL}/household`;

  constructor(private http: HttpClient) {}

  get(): Observable<Household> {
    return this.http.get<Household>(this.baseUrl);
  }

  create(name: string): Observable<Household> {
    return this.http.post<Household>(this.baseUrl, { name });
  }

  update(name: string): Observable<Household> {
    return this.http.put<Household>(this.baseUrl, { name });
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${API_BASE_URL}/households/${id}`);
  }

  getSummary(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/summary`);
  }
}
