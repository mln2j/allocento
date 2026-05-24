import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslationService } from '../../core/services/translation.service';
import { AppInitializerService } from '../../core/services/app-initializer';
import { SyncService } from '../../core/services/sync';
import { LoggerService } from '../../core/services/logger.service';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [],
  templateUrl: './splash.component.html'
})
export class SplashComponent implements OnInit {
  private router = inject(Router);
  private translationService = inject(TranslationService);
  private appInitializer = inject(AppInitializerService);
  private syncService = inject(SyncService);
  private logger = inject(LoggerService);

  // Reaktivni signali za UI
  currentKey = signal<string>('splash.initializing');
  progressWidth = signal<number>(0);

  async ngOnInit() {
    // 1. Prvo inicijaliziramo jezik kako bi LoggerService mogao ispravno prevoditi logove
    this.translationService.initLanguage();

    this.logger.log('splash.initializing');

    try {
      // KORAK 1: Sigurnost i lokalna baza (IndexedDB)
      this.updateStep('splash.security', 15);
      await this.delay(500);

      this.updateStep('splash.offlineDb', 35);

      // Dohvaćamo destinaciju ('dashboard', 'login' ili 'error')
      const targetRoute = await this.appInitializer.initializeApp();

      // HITNA KOČNICA: Ako je initializer vratio error, odmah bježi na /error i prekini daljnje korake!
      if (targetRoute === 'error') {
        this.logger.warn('error.criticalTitle');
        this.router.navigate(['/error']);
        return;
      }

      // KORAK 2: Server i sinkronizacija (samo ako smo utvrdili da smo online)
      if (this.appInitializer.isOnlineMode && targetRoute === 'dashboard') {
        this.updateStep('splash.server', 60);
        await this.delay(400);

        this.updateStep('splash.syncing', 80);
        await this.syncService.syncOfflineQueue();
      } else if (!this.appInitializer.isOnlineMode && targetRoute === 'dashboard') {
        this.updateStep('splash.offlineMode', 80);
        await this.delay(800);
      }

      // KORAK 3: Priprema radnog prostora i završetak
      this.updateStep('splash.workspace', 95);
      await this.delay(400);

      this.updateStep('splash.ready', 100);
      await this.delay(300);

      if (targetRoute === 'login') {
        this.router.navigate(['/auth/login']);
      } else {
        this.router.navigate(['/dashboard']);
      }

    } catch (error) {
      this.logger.error('Kritična greška na Splash screenu:', error);
      this.router.navigate(['/error']);
    }
  }

  // Pomoćna metoda za dohvat prijevoda u HTML-u
  t(key: string): string {
    return this.translationService.translate(key);
  }

  /**
   * Pomoćna metoda za ažuriranje stanja na ekranu i automatsko logiranje
   */
  private updateStep(key: string, progress: number) {
    this.currentKey.set(key);
    this.progressWidth.set(progress);
    this.logger.log(key); // <-- AUTOMATSKO LOGIRANJE: Svaki korak se sada prevodi i zapisuje u konzolu
  }

  /**
   * Umjetni delay kako koraci ne bi proletjeli u milisekundi ako je PC prebrz
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
