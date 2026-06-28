import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { LocalDbService } from './local-db';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../api.config';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from './logger.service';
import { WorkspaceService } from './workspace.service';

@Injectable({
  providedIn: 'root'
})
export class AppInitializerService {
  private localDb = inject(LocalDbService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private logger = inject(LoggerService);
  private workspaceService = inject(WorkspaceService);

  private apiPingUrl = `${API_BASE_URL}/health`;
  private userApiUrl = `${API_BASE_URL}/user`; // <-- Endpoint za provjeru tokena
  
  private _isOnlineMode = signal<boolean>(true);
  get isOnlineMode(): boolean {
    return this._isOnlineMode();
  }
  set isOnlineMode(val: boolean) {
    this._isOnlineMode.set(val);
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', async () => {
        this.isOnlineMode = await this.checkBackendHealth();
      });
      window.addEventListener('offline', () => {
        this.isOnlineMode = false;
      });
    }
  }

  /**
   * Glavna metoda koja pokreće sve provjere dok je korisnik na Splash Screenu.
   */
  async initializeApp(): Promise<'dashboard' | 'login' | 'error' | 'verify-email' | 'onboarding'> {
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
      if (!this.authService.isAuthenticated()) {
        this.logger.log('splash.session');
        return 'login';
      }

      let userProfile: any = null;

      if (this.isOnlineMode) {
        try {
          this.logger.log('splash.verifyingSession'); 
          userProfile = await firstValueFrom(this.http.get<any>(this.userApiUrl));
          await this.localDb.put('user_profile', userProfile);
          localStorage.setItem('user', JSON.stringify(userProfile));

          this.logger.log('splash.syncing');
          await this.syncFreshDataFromServer();

        } catch (error) {
          if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
            this.logger.warn('Token je nevažeći ili je istekao. Čišćenje sesije...');
            this.authService.clearToken();
            await this.localDb.clearStore('user_profile');
            return 'login';
          }
          
          const cachedUsers = await this.localDb.getAll('user_profile');
          if (!cachedUsers || cachedUsers.length === 0) {
            this.authService.clearToken();
            return 'login';
          }
          userProfile = cachedUsers[0];
          localStorage.setItem('user', JSON.stringify(userProfile));
        }
      } else {
        const cachedUsers = await this.localDb.getAll('user_profile');
        if (!cachedUsers || cachedUsers.length === 0) {
          this.authService.clearToken();
          return 'login';
        }
        userProfile = cachedUsers[0];
        localStorage.setItem('user', JSON.stringify(userProfile));
      }

      // 4. Sigurnosne provjere (Samo ako smo uspjeli dobiti userProfile)
      if (userProfile) {
        if (!userProfile.email_verified_at) {
          return 'verify-email';
        }

        if (!userProfile.onboarding_completed) {
          return 'onboarding';
        }

        // We can't inject async like that. Let's just set localStorage directly here if empty.
        if (typeof localStorage !== 'undefined') {
            const currentWsId = localStorage.getItem('active_workspace_id');
            const favWsId = userProfile.favorite_workspace_id;
            
            let targetWs = null;
            if (currentWsId) {
                targetWs = userProfile.workspaces.find((w: any) => String(w.id) === currentWsId || String(w.workspace_id) === currentWsId);
            }
            if (!targetWs) {
                targetWs = userProfile.workspaces.find((w: any) => w.id === favWsId) || userProfile.workspaces[0];
            }

            if (targetWs) {
              targetWs.workspace_id = targetWs.id; // Normalize
              this.workspaceService.setActiveWorkspace(targetWs);
            }
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
