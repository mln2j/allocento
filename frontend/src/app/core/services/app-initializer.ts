import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { LocalDbService } from './local-db';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../api.config';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class AppInitializerService {
  private localDb = inject(LocalDbService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private logger = inject(LoggerService);

  private apiPingUrl = `${API_BASE_URL}/health`;
  private userApiUrl = `${API_BASE_URL}/user`; // <-- Endpoint za provjeru tokena
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
          this.logger.error('error.criticalTitle');
          return 'error';
        }

        this.logger.log('splash.offlineDb');
      }

      // 3. Provjera sesije i STROGA validacija tokena
      // Prvo osnovna provjera: ako tokena uopće nema u localStorage, odmah na login
      if (!this.authService.isAuthenticated()) {
        this.logger.log('splash.session');
        return 'login';
      }

      // Ako imamo token i ONLINE smo, idemo ga stvarno provjeriti na backendu
      if (this.isOnlineMode) {
        try {
          this.logger.log('splash.verifyingSession'); // Log za vizualni korak (ako ga koristiš na splashu)

          // Isaljemo zahtjev na /user. Važno: tvoj HTTP Interceptor mora automatski zakačiti Bearer token ovdje!
          const userProfile = await firstValueFrom(this.http.get<any>(this.userApiUrl));

          // Ako je prošlo, server kaže da je token živ. Spremi/osvježi ga u IndexedDB cacheu
          await this.localDb.put('user_profile', userProfile);

          this.logger.log('splash.syncing');
          await this.syncFreshDataFromServer();

        } catch (error) {
          if (error instanceof HttpErrorResponse) {
            // Ako backend vrati 401 (Unauthorized) ili 403 (Forbidden), token je nevažeći
            if (error.status === 401 || error.status === 403) {
              this.logger.warn('Token je nevažeći ili je istekao. Čišćenje sesije...');

              this.authService.clearToken(); // Brišemo nevažeći token iz localStorage
              await this.localDb.clearStore('user_profile'); // Čistimo i potencijalno nevažeći lokalni cache profile

              return 'login';
            }
          }

          // Ako je puklo zbog nečeg drugog (npr. mrežni glitch u milisekundi provjere),
          // a imamo cache od ranije, ponašaj se kao da smo offline i pusti na dashboard
          const cachedUsers = await this.localDb.getAll('user_profile');
          if (!cachedUsers || cachedUsers.length === 0) {
            this.authService.clearToken();
            return 'login';
          }
        }
      } else {
        // Ako smo OFFLINE, a token postoji u localStorage, provjeravamo imamo li keširan profil u IndexedDB
        const cachedUsers = await this.localDb.getAll('user_profile');
        if (!cachedUsers || cachedUsers.length === 0) {
          // Imamo token u browseru, ali baza je prazna -> ne možemo podići aplikaciju offline
          this.authService.clearToken();
          return 'login';
        }
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
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Povlači svježe podatke s servera i sprema ih u lokalni IndexedDB cache
   */
  private async syncFreshDataFromServer(): Promise<void> {
    try {
      // Ovdje u budućnosti odrađuješ punu sinkronizaciju ostalih entiteta
    } catch (error) {
      this.logger.warn('⚠️ Neuspjelo keširanje podataka s servera:', error);
    }
  }
}
