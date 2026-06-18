import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../api.config';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

interface AuthResponse {
  token: string;
  user: { id: number; name: string; email: string };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'allocento_token';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${API_BASE_URL}/login`,
      { email, password },
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      }
    ).pipe(
      tap(res => this.setToken(res.token))
    );
  }

  register(data: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE_URL}/register`, data, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    }).pipe(
      tap(res => this.setToken(res.token))
    );
  }

  verifyEmailCode(email: string, code: string): Observable<any> {
    return this.http.post(`${API_BASE_URL}/email/verify-code`, { email, code }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
  }

  resendVerificationEmail(): Observable<any> {
    return this.http.post(`${API_BASE_URL}/email/resend`, {}, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      }
    });
  }

  checkAndSendVerificationEmail(): Observable<any> {
    return this.http.post(`${API_BASE_URL}/email/check-and-send`, {}, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      }
    });
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${API_BASE_URL}/forgot-password`, { email }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
  }

  resetPassword(data: any): Observable<any> {
    return this.http.post(`${API_BASE_URL}/reset-password`, data, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
  }

  setToken(token: string) {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // NOVO: Eksplicitna metoda za čišćenje tokena pri neuspjeloj provjeri
  clearToken() {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  logout() {
    this.clearToken();
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
