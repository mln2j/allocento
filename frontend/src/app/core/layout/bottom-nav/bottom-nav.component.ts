import { Component, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslationService } from '../../services/translation.service';
import { LoggerService } from '../../services/logger.service';

interface NavItem {
  path: string;
  translationKey: string;
  iconPath: string;
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './bottom-nav.component.html'
})
export class BottomNavComponent {
  private router = inject(Router);
  private translationService = inject(TranslationService);
  private logger = inject(LoggerService);

  // Signal koji drži indeks aktivnog gumba za pokretanje animacije
  activeIndex = signal<number>(0);

  navItems: NavItem[] = [
    { path: '/dashboard', translationKey: 'nav.dashboard', iconPath: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z' },
    { path: '/transactions', translationKey: 'nav.transactions', iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { path: '/accounts', translationKey: 'nav.accounts', iconPath: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { path: '/household', translationKey: 'nav.workspace', iconPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { path: '/profile', translationKey: 'nav.profile', iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
  ];

  currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event: NavigationEnd) => event.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  constructor() {
    effect(() => {
      const url = this.currentUrl();
      if (url) {
        this.logger.log(`Navigacija aktivna na ruti: ${url}`);

        // Pronađi indeks trenutne rute i ažuriraj signal
        const idx = this.navItems.findIndex(item => {
          if (item.path === '/dashboard') return url === '/dashboard';
          return url.startsWith(item.path);
        });

        if (idx !== -1) {
          this.activeIndex.set(idx);
        }
      }
    });
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  isActive(itemPath: string): boolean {
    const url = this.currentUrl();
    if (!url) return false;
    if (itemPath === '/dashboard') return url === '/dashboard';
    return url.startsWith(itemPath);
  }
}
