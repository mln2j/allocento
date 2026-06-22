import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, isDevMode, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';
import { loadingInterceptor } from './core/services/loading/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideCharts(withDefaultRegisterables()),
    provideHttpClient(
      withInterceptors([
        loadingInterceptor,
        (req, next) => {
          const auth = inject(AuthService);
          const lang = localStorage.getItem('allocento_lang') || 'hr';
          
          const token = auth.getToken();
          const headers: Record<string, string> = {
            'Accept-Language': lang
          };

          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const wsId = localStorage.getItem('active_workspace_id');
          if (wsId) {
            headers['X-Workspace-ID'] = wsId;
          }
          
          const authReq = req.clone({
            setHeaders: headers,
          });
          return next(authReq);
        },
      ])
    ),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
