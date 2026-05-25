import { Component, OnInit, HostListener, ElementRef, inject } from '@angular/core';
import { Router, NavigationEnd, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './app-shell.component.html',
})
export class AppShellComponent implements OnInit {
  title = 'Allocento';
  pageTitle = 'Allocento';
  user: User | null = null;
  pendingInvitations: any[] = [];
  private translationService = inject(TranslationService);

  // Kontrola samo za ugrađeni Tailwind modal obavijesti
  isNotificationsOpen = false;

  t(key: string, params?: any): string {
    return this.translationService.translate(key, params);
  }

  private updatePageTitle(url: string): void {
    const cleanUrl = url.split('/').slice(0, 2).join('/');
    const titleKey = cleanUrl.replace('/', '') || 'dashboard';
    this.pageTitle = this.t('pageTitles.' + titleKey);
  }

  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private inviteRepo: InvitationRepository,
    public loadingService: LoadingService,
    public appInitializer: AppInitializerService,
    private localDb: LocalDbService,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.loadUserContext();

    // 1. Postavi naslov odmah pri inicijalizaciji na temelju trenutnog URL-a
    this.updatePageTitle(this.router.url);

    // 2. Slušaj promjene za kasnije
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

    // Pronađi okidače i modal sadržaj
    const clickedInsideNotificationButton = targetElement.closest('.notification-trigger');
    const clickedInsideModal = targetElement.closest('.modal-content');

    // Zatvori modal ako je kliknuto izvan gumba i samog sadržaja modala
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
          console.error('Error fetching user for shell, switching to local backup', err);
          await this.loadUserFromCache();
        }
      });
    } else {
      console.log('📴 AppShell: Rad u offline načinu. Učitavam podatke iz lokalnog cachea...');
      await this.loadUserFromCache();
    }
  }

  private async loadUserFromCache(): Promise<void> {
    try {
      const cachedUsers = await this.localDb.getAll('user_profile');
      if (cachedUsers && cachedUsers.length > 0) {
        this.user = cachedUsers[0];
        console.log('📦 Korisnik uspješno pročitan iz lokalnog cachea:', this.user);
      } else {
        this.user = { id: 0, name: 'Offline User', email: '' } as User;
      }
    } catch (err) {
      console.error('Greška pri čitanju korisnika iz IndexedDB:', err);
    }
  }

  loadPendingInvitations() {
    if (!this.appInitializer.isOnlineMode) {
      this.pendingInvitations = [];
      return;
    }

    this.inviteRepo.getPending().subscribe({
      next: (invites) => (this.pendingInvitations = invites),
      error: (err) => console.error('Error loading invitations', err)
    });
  }

  toggleNotifications() {
    if (!this.appInitializer.isOnlineMode) {
      console.log('Obavijesti nisu dostupne u offline načinu rada.');
      return;
    }
    this.isNotificationsOpen = !this.isNotificationsOpen;
  }

  respondToInvitation(id: number, accept: boolean) {
    const endpoint = accept ? 'accept' : 'reject';
    this.http.post(`${API_BASE_URL}/invitations/${id}/${endpoint}`, {}).subscribe({
      next: () => {
        this.loadPendingInvitations();
        this.http.get<User>(`${API_BASE_URL}/user`).subscribe(u => this.user = u);
      },
      error: (err) => console.error('Error responding to invitation', err)
    });
  }

  onLogout(): void {
    this.authService.logout();
    this.localDb.clearStore('user_profile');
    this.router.navigate(['/auth/login']);
  }
}
