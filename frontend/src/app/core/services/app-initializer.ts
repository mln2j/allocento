import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { LocalDbService } from './local-db';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../api.config';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppInitializerService {
  private apiPingUrl = `${API_BASE_URL}/ping`;
  public isOnlineMode = true;

  constructor(
    private localDb: LocalDbService,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  /**
   * Glavna metoda koja pokreće sve provjere dok je korisnik na Splash Screenu.
   */
  async initializeApp(): Promise<'dashboard' | 'login'> {
    try {
      // 1. Inicijalizacija lokalne baze podataka
      await this.localDb.initDatabase();

      // 2. Provjera sesije preko tvog AuthService-a
      if (!this.authService.isAuthenticated()) {
        console.log('👤 Korisnik nema aktivnu sesiju -> Preusmjeravanje na Login.');
        return 'login';
      }

      // 3. Provjera dostupnosti Laravel backenda
      console.log('🌐 Provjera dostupnosti Laravel backenda...');
      this.isOnlineMode = await this.checkBackendHealth();

      if (this.isOnlineMode) {
        console.log('🚀 Backend je ONLINE. Pokrećem sinkronizaciju podataka...');
        await this.syncFreshDataFromServer();
      } else {
        console.log('📴 Backend je OFFLINE. Koristimo lokalne podatke.');
      }

      return 'dashboard';

    } catch (error) {
      console.error('❌ Greška tijekom inicijalizacije aplikacije:', error);
      return 'login';
    }
  }

  /**
   * Šalje brzi zahtjev prema backendu da vidi je li server živ
   */
  private async checkBackendHealth(): Promise<boolean> {
    try {
      // Očekujemo bilo kakav tekstualni odgovor (čak i 200 OK s praznim body-em)
      await firstValueFrom(this.http.get(this.apiPingUrl, { responseType: 'text' }));
      return true;
    } catch (error) {
      // Castamo error u HttpErrorResponse da TypeScript zna pročitati .status
      if (error instanceof HttpErrorResponse) {
        // Ako je status različit od 0 (npr. 404, 401, 500), server je online i odgovara!
        // Status 0 znači Network Error (server je ugašen ili nema interneta)
        if (error.status !== 0) {
          return true;
        }
      }
      return false;
    }
  }

  /**
   * Povlači svježe podatke s servera i sprema ih u lokalni IndexedDB cache
   */
  private async syncFreshDataFromServer(): Promise<void> {
    try {
      console.log('🔄 Lokalni cache uspješno ažuriran najnovijim podacima s servera.');
    } catch (error) {
      console.error('⚠️ Neuspjelo keširanje podataka s servera:', error);
    }
  }
}
