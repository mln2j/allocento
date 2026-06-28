import { Component, inject, effect, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslationService } from '../../services/translation.service';
import { LoggerService } from '../../services/logger.service';
import { WorkspaceService } from '../../services/workspace.service';
import { AuthService } from '../../services/auth.service';

interface NavItem {
  id: string;
  path: string;
  translationKey: string;
  iconPath: string;
}

const ALL_NAV_ITEMS: Record<string, Omit<NavItem, 'id'>> = {
  'dashboard': {
    path: '/dashboard',
    translationKey: 'nav.dashboard',
    iconPath: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z'
  },
  'transactions': {
    path: '/transactions',
    translationKey: 'nav.transactions',
    iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01'
  },
  'accounts': {
    path: '/accounts',
    translationKey: 'nav.accounts',
    iconPath: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
  },
  'workspaces': {
    path: '/workspaces',
    translationKey: 'nav.workspace',
    iconPath: 'M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9'
  },
  'settings': {
    path: '/settings',
    translationKey: 'nav.settings',
    iconPath: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
  },
  'categories': {
    path: '/categories',
    translationKey: 'nav.categories',
    iconPath: 'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3zM6 6h.008v.008H6V6z'
  },
  'reports': {
    path: '/reports',
    translationKey: 'nav.reports',
    iconPath: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25C7.004 12 7.5 12.504 7.5 13.125v6.75C7.5 20.496 7.004 21 6.375 21h-2.25C3.504 21 3 20.496 3 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z'
  }
};

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
  public workspaceService = inject(WorkspaceService);
  private authService = inject(AuthService);

  activeIndex = signal<number>(0);
  navPrefs = signal<string[]>(['dashboard', 'accounts', 'settings']);

  navItems = computed(() => {
    const prefs = this.navPrefs();
    
    // Middle items: filter out fixed and disabled items, keep up to 2
    const middlePrefs = prefs
      .filter(p => p !== 'dashboard' && p !== 'settings' && p !== 'transactions')
      .slice(0, 2);
    
    const finalKeys = ['dashboard', ...middlePrefs, 'settings'];
    
    return finalKeys.map((key: string) => ({
      id: key,
      ...ALL_NAV_ITEMS[key]
    })).filter((i: any) => !!i.path);
  });

  private loadPrefs() {
    const saved = localStorage.getItem('nav_preferences');
    if (saved) {
      try {
        this.navPrefs.set(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }

  currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event: NavigationEnd) => event.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  constructor() {
    this.loadPrefs();
    window.addEventListener('nav-prefs-updated', () => {
      this.loadPrefs();
    });

    effect(() => {
      const url = this.currentUrl();
      if (url) {
        const baseLog = this.t('logs.navigationActive');
        const formattedLog = baseLog.includes('{url}')
          ? baseLog.replace('{url}', url)
          : `Navigation active on route: ${url}`;

        this.logger.log(formattedLog);

        const items = this.navItems();
        let idx = items.findIndex(item => {
          if (item.path === '/dashboard') return url === '/dashboard';
          return url.startsWith(item.path);
        });
        
        // Ako nije naÄ‘ena ruta u bottom navu, a ruta je pod "settings", oznaÄi settings active
        if (idx === -1) {
            if (['/settings', '/workspaces', '/categories', '/projects'].some(p => url.startsWith(p))) {
                idx = items.length - 1; // Settings
            }
        }

        if (idx !== -1) {
          this.activeIndex.set(idx);
        }
      }
    });
  }

  t(key: string, params?: any): string {
    return this.translationService.translate(key, params) || key.split('.').pop() || key;
  }

  getTranslationKey(item: NavItem): string {
    if (item.path === '/accounts') {
      const activeWS = this.workspaceService.activeWorkspace();
      if (activeWS?.type === 'company') {
        return 'nav.projects';
      }
    }
    return item.translationKey;
  }

  isActive(itemPath: string): boolean {
    const url = this.currentUrl();
    if (!url) return false;
    if (itemPath === '/dashboard') return url === '/dashboard';
    if (itemPath === '/settings') {
        if (url.startsWith('/settings')) return true;
        // Ako je neka ruta koja nije u bottom navu a postoji u sustavu
        const items = this.navItems();
        const isInNav = items.some(i => i.path === '/dashboard' ? url === '/dashboard' : url.startsWith(i.path));
        if (!isInNav) {
            return ['/workspaces', '/categories', '/projects', '/reports', '/accounts', '/transactions'].some(p => url.startsWith(p));
        }
    }
    return url.startsWith(itemPath);
  }

  isHidden(): boolean {
    return false;
  }
}

