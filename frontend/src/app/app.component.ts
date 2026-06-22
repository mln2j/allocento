import { Component, OnInit, inject, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './core/layout/toast/toast.component';
import { TransactionModalComponent } from './shared/components/transaction-modal/transaction-modal.component';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { ToastService } from './core/services/toast.service';
import { TranslationService, LangCode } from './core/services/translation.service';
import { UserRepository } from './core/repositories/user.repository';
import { AuthService } from './core/services/auth.service';
import { LocalDbService } from './core/services/local-db';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, TransactionModalComponent],
  template: `
    <router-outlet/>
    <app-toast/>
    <app-transaction-modal/>
  `,
})
export class AppComponent implements OnInit {
  private swUpdate = inject(SwUpdate);
  private toastService = inject(ToastService);
  private translationService = inject(TranslationService);
  private userRepo = inject(UserRepository);
  private authService = inject(AuthService);
  private localDb = inject(LocalDbService);

  ngOnInit() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.checkForUpdate();
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          this.toastService.success(this.translationService.translate('splash.appUpdate') || 'Nova verzija preuzeta, osvježavam...');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        });
    }

    // Dodajemo globalni listener za vidljivost aplikacije kako bismo ostvarili brzi "Live Sync"
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => this.onVisibilityChange());
    }
  }

  private onVisibilityChange() {
    if (document.visibilityState === 'visible' && this.authService.isAuthenticated()) {
      const timestamp = new Date().getTime();
      this.userRepo.getCurrentUser(timestamp).subscribe({
        next: async (user: any) => {
          // Ažuriraj lokalnu keširanu verziju
          localStorage.setItem('user', JSON.stringify(user));
          await this.localDb.put('user_profile', user);

          // 1. Sync jezika
          const backendLang = user.preferred_language || 'hr';
          if (this.translationService.currentLang() !== backendLang) {
            this.translationService.setLanguage(backendLang as LangCode);
          }

          // 2. Sync navigacijskih preferencija
          const currentPrefs = localStorage.getItem('nav_preferences');
          const backendPrefs = JSON.stringify(user.nav_preferences || ['dashboard', 'settings']);
          if (currentPrefs !== backendPrefs) {
            localStorage.setItem('nav_preferences', backendPrefs);
            window.dispatchEvent(new Event('nav-prefs-updated'));
          }
        },
        error: (err) => {
          console.error('Tihi live sync nije uspio', err);
        }
      });
    }
  }
}
