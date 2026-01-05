import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../api.config';

@Injectable({ providedIn: 'root' })
export class ApiHttpService {
  constructor(private http: HttpClient) {}

  get<T>(url: string, params?: HttpParams | Record<string, string | number>) {
    return this.http.get<T>(`${API_BASE_URL}${url}`, { params });
  }

  post<T>(url: string, body: unknown) {
    return this.http.post<T>(`${API_BASE_URL}${url}`, body);
  }

  put<T>(url: string, body: unknown) {
    return this.http.put<T>(`${API_BASE_URL}${url}`, body);
  }

  delete<T>(url: string) {
    return this.http.delete<T>(`${API_BASE_URL}${url}`);
  }
}
