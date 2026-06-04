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
    {
      path: '/dashboard',
      translationKey: 'nav.dashboard',
      iconPath: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z'
    },
    {
      path: '/transactions',
      translationKey: 'nav.transactions',
      iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01'
    },
    {
      path: '/accounts',
      translationKey: 'nav.accounts',
      iconPath: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
    },
    {
      path: '/workspaces',
      translationKey: 'nav.workspace',
      iconPath: 'M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9'
    },
    {
      path: '/settings',
      translationKey: 'nav.settings',
      iconPath: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
    }
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
        // Prvo povučemo bazični prijevod "Navigation active on route: {url}"
        const baseLog = this.t('logs.navigationActive');

        // Ručno mijenjamo {url} sa stvarnom rutom kako bi izbjegli greške u parseru
        const formattedLog = baseLog.includes('{url}')
          ? baseLog.replace('{url}', url)
          : `Navigation active on route: ${url}`; // fallback ako ključ fali

        this.logger.log(formattedLog);

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

  t(key: string, params?: any): string {
    return this.translationService.translate(key, params);
  }

  isActive(itemPath: string): boolean {
    const url = this.currentUrl();
    if (!url) return false;
    if (itemPath === '/dashboard') return url === '/dashboard';
    return url.startsWith(itemPath);
  }
}
