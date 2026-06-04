import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';
import { API_BASE_URL } from '../api.config';

@Injectable({ providedIn: 'root' })
export class UserRepository {
  private readonly baseUrl = `${API_BASE_URL}/profile`;

  constructor(private http: HttpClient) {}

  getCurrentUser(timestamp: number): Observable<User> {
    return this.http.get<User>(`${API_BASE_URL}/user?v=${timestamp}`);
  }
  // ----------------------

  updateProfile(data: { name: string; email: string }): Observable<{ message: string; user: User }> {
    return this.http.put<{ message: string; user: User }>(this.baseUrl, data);
  }

  changePassword(data: any): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/password`, data);
  }

  deleteAccount(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(this.baseUrl);
  }

  uploadPhoto(file: File): Observable<{ message: string; profile_photo_url: string }> {
    const formData = new FormData();
    formData.append('photo', file);

    return this.http.post<{ message: string; profile_photo_url: string }>(`${this.baseUrl}/photo`, formData);
  }

  deletePhoto(): Observable<{ message: string; profile_photo_url: string }> {
    return this.http.delete<{ message: string; profile_photo_url: string }>(`${this.baseUrl}/photo`);
  }
}
