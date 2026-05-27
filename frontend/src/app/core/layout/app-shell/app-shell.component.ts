import { Component, OnInit, HostListener, inject } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';

import { User } from '../../models/user.model';
import { API_BASE_URL } from '../../api.config';
import { AuthService } from '../../services/auth.service';
import { AppInitializerService } from '../../services/app-initializer';
import { LocalDbService } from '../../services/local-db';
import { InvitationRepository } from '../../repositories/invitation.repository';
import { LoadingService } from '../../services/loading/loading.service';
import { LoadingComponent } from '../../services/loading/loading.component'
import { TranslationService } from '../../services/translation.service';
import { LoggerService } from '../../services/logger.service';

import { HeaderComponent } from '../header/header.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    BottomNavComponent,
    LoadingComponent
  ],
  templateUrl: './app-shell.component.html',
})
export class AppShellComponent implements OnInit {
  title = 'Allocento';
  pageTitle = 'Allocento';
  user: User | null = null;
  pendingInvitations: any[] = [];
  isNotificationsOpen = false;

  private translationService = inject(TranslationService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private inviteRepo = inject(InvitationRepository);
  private logger = inject(LoggerService);

  public loadingService = inject(LoadingService);
  public appInitializer = inject(AppInitializerService);
  private localDb = inject(LocalDbService);

  t(key: string, params?: any): string {
    return this.translationService.translate(key, params);
  }

  private updatePageTitle(url: string): void {
    const cleanUrl = url.split('/').slice(0, 2).join('/');
    const titleKey = cleanUrl.replace('/', '') || 'dashboard';
    this.pageTitle = this.t('pageTitles.' + titleKey);
  }

  ngOnInit(): void {
    this.loadUserContext();
    this.updatePageTitle(this.router.url);

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updatePageTitle(event.urlAfterRedirects);
        this.isNotificationsOpen = false;
      });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const targetElement = event.target as HTMLElement;
    const clickedInsideNotificationButton = targetElement.closest('.notification-trigger');
    const clickedInsideModal = targetElement.closest('.modal-content');

    if (!clickedInsideNotificationButton && !clickedInsideModal) {
      this.isNotificationsOpen = false;
    }
  }

  private async loadUserContext(): Promise<void> {
    if (this.appInitializer.isOnlineMode) {
      this.http.get<User>(`${API_BASE_URL}/user`).subscribe({
        next: async (user) => {
          this.user = user;
          await this.localDb.put('user_profile', user);
          this.loadPendingInvitations();
        },
        error: async (err) => {
          this.logger.error('Greška pri dohvaćanju korisnika, prebacujem na lokalni cache', err);
          await this.loadUserFromCache();
        }
      });
    } else {
      this.logger.warn('splash.offlineMode');
      await this.loadUserFromCache();
    }
  }

  private async loadUserFromCache(): Promise<void> {
    try {
      const cachedUsers = await this.localDb.getAll('user_profile');
      if (cachedUsers && cachedUsers.length > 0) {
        this.user = cachedUsers[0];
      } else {
        this.user = { id: 0, name: 'Offline User', email: '' } as User;
      }
    } catch (err) {
      this.logger.error('Kritična greška pri čitanju korisnika iz IndexedDB', err);
    }
  }

  loadPendingInvitations() {
    if (!this.appInitializer.isOnlineMode) {
      this.pendingInvitations = [];
      return;
    }

    this.inviteRepo.getPending().subscribe({
      next: (invites) => (this.pendingInvitations = invites),
      error: (err) => this.logger.error('Greška pri učitavanju pozivnica', err)
    });
  }

  toggleNotifications() {
    if (!this.appInitializer.isOnlineMode) {
      return;
    }
    this.isNotificationsOpen = !this.isNotificationsOpen;
    this.logger.log(this.isNotificationsOpen ? 'Obavijesti otvorene' : 'Obavijesti zatvorene');
  }

  respondToInvitation(id: number, accept: boolean) {
    const endpoint = accept ? 'accept' : 'reject';
    this.logger.log(`Odgovor na pozivnicu ${id}: ${endpoint}`);

    this.http.post(`${API_BASE_URL}/invitations/${id}/${endpoint}`, {}).subscribe({
      next: () => {
        this.loadPendingInvitations();
        this.http.get<User>(`${API_BASE_URL}/user`).subscribe(u => this.user = u);
      },
      error: (err) => this.logger.error(`Neuspješan odgovor na pozivnicu ${id}`, err)
    });
  }

  onLogout(): void {
    this.logger.log('Korisnik pokrenuo odjavu');
    this.authService.logout();
    this.localDb.clearStore('user_profile');
    this.router.navigate(['/auth/login']);
  }
}
