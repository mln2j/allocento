import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { LocalDbService } from './local-db';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../api.config';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from './logger.service'; // <-- UVOZIMO LOGGER

@Injectable({
  providedIn: 'root'
})
export class AppInitializerService {
  private localDb = inject(LocalDbService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private logger = inject(LoggerService); // <-- INJEKTIRAMO LOGGER

  private apiPingUrl = `${API_BASE_URL}/health`;
  public isOnlineMode = true;

  /**
   * Glavna metoda koja pokreće sve provjere dok je korisnik na Splash Screenu.
   */
  async initializeApp(): Promise<'dashboard' | 'login' | 'error'> {
    try {
      // 1. Inicijalizacija lokalne baze podataka
      await this.localDb.initDatabase();

      // 2. Provjera dostupnosti Laravel backenda
      this.logger.log('splash.server');
      this.isOnlineMode = await this.checkBackendHealth();

      if (!this.isOnlineMode) {
        this.logger.warn('splash.offlineMode');

        // Provjeravamo imamo li ikakav profil spremljen u IndexedDB
        const cachedUsers = await this.localDb.getAll('user_profile');

        // KRITIČNA SITUACIJA: Nema servera, a nema ni lokalnih podataka
        if (!cachedUsers || cachedUsers.length === 0) {
          this.logger.error('error.criticalTitle'); // Prevedeno: Sustav nije dostupan (Vrišti crveno u dev modu)
          return 'error';
        }

        this.logger.log('splash.offlineDb'); // Koristimo ključ za učitavanje lokalne baze
      }

      // 3. Provjera sesije preko AuthService-a
      if (!this.authService.isAuthenticated()) {
        this.logger.log('splash.session'); // Provjera aktivne sesije završava -> ide na login
        return 'login';
      }

      // Ako smo online i sesija je valjana, sinkroniziraj podatke
      if (this.isOnlineMode) {
        this.logger.log('splash.syncing');
        await this.syncFreshDataFromServer();
      }

      this.logger.log('splash.ready');
      return 'dashboard';

    } catch (error) {
      this.logger.error('Kritična greška tijekom inicijalizacije aplikacije:', error);
      return 'error';
    }
  }

  /**
   * Šalje brzi zahtjev prema backendu da vidi je li server živ
   */
  private async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await firstValueFrom(this.http.get(this.apiPingUrl, { observe: 'response' }));
      // Samo ako je status 200, smatramo da je server OK
      return response.status === 200;
    } catch (error) {
      // Ako je greška (404, 500, 502, 0), vraćamo false
      return false;
    }
  }

  /**
   * Povlači svježe podatke s servera i sprema ih u lokalni IndexedDB cache
   */
  private async syncFreshDataFromServer(): Promise<void> {
    try {
      // Ovdje u budućnosti logiraš uspješnu sinkronizaciju ako želiš
    } catch (error) {
      this.logger.warn('⚠️ Neuspjelo keširanje podataka s servera:', error);
    }
  }
}
