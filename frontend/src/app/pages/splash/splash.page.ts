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
  templateUrl: './splash.page.html'
})
export class SplashPage implements OnInit {
  private router = inject(Router);
  private translationService = inject(TranslationService);
  private appInitializer = inject(AppInitializerService);
  private syncService = inject(SyncService);
  private logger = inject(LoggerService);

  // Reaktivni signali za UI
  currentKey = signal<string>('splash.initializing');
  progressWidth = signal<number>(0);

  async ngOnInit() {
    this.translationService.initLanguage();
    this.logger.log('splash.initializing');

    try {
      this.updateStep('splash.security', 15);
      await this.delay(500);

      this.updateStep('splash.offlineDb', 35);

      const targetRoute = await this.appInitializer.initializeApp();

      if (targetRoute === 'error') {
        this.logger.warn('error.criticalTitle');
        this.router.navigate(['/error']);
        return;
      }

      if (this.appInitializer.isOnlineMode && targetRoute === 'dashboard') {
        this.updateStep('splash.server', 60);
        await this.delay(400);

        this.updateStep('splash.syncing', 80);
        await this.syncService.syncOfflineQueue();
      } else if (!this.appInitializer.isOnlineMode && targetRoute === 'dashboard') {
        this.updateStep('splash.offlineMode', 80);
        await this.delay(800);
      }

      this.updateStep('splash.workspace', 95);
      await this.delay(400);

      this.updateStep('splash.ready', 100);
      await this.delay(300);

      if (targetRoute === 'login') {
        this.router.navigate(['/auth/login']);
      } else if (targetRoute === 'verify-email') {
        this.router.navigate(['/auth/verify-email']);
      } else if (targetRoute === 'onboarding') {
        this.router.navigate(['/auth/onboarding']);
      } else {
        this.router.navigate(['/dashboard']);
      }

    } catch (error) {
      this.logger.error('Kritična greška na Splash screenu:', error);
      this.router.navigate(['/error']);
    }
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  private updateStep(key: string, progress: number) {
    this.currentKey.set(key);
    this.progressWidth.set(progress);
    this.logger.log(key);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
