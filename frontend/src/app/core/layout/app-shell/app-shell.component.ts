import { Component, OnInit, HostListener, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

import { User } from '../../models/user.model';
import { API_BASE_URL } from '../../api.config';
import { AuthService } from '../../services/auth.service';
import { AppInitializerService } from '../../services/app-initializer';
import { LocalDbService } from '../../services/local-db';
import { InvitationRepository } from '../../repositories/invitation.repository';
import { LoadingService } from '../../services/loading/loading.service';
import { LoadingComponent } from '../../services/loading/loading.component';
import { TranslationService } from '../../services/translation.service';
import { LoggerService } from '../../services/logger.service';
import { ToastService } from '../../services/toast.service';
import { WorkspaceService } from '../../services/workspace.service';

import { HeaderComponent } from '../header/header.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { TransactionModalService } from '../../../services/transaction-modal.service';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    BottomNavComponent,
    LoadingComponent,
    ModalComponent
  ],
  templateUrl: './app-shell.component.html',
})
export class AppShellComponent implements OnInit {
  user: User | null = null;
  pendingInvitations: any[] = [];
  isNotificationsOpen = false;

  private translationService = inject(TranslationService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private inviteRepo = inject(InvitationRepository);
  private logger = inject(LoggerService);
  public workspaceService = inject(WorkspaceService);
  public transactionModalService = inject(TransactionModalService);

  public loadingService = inject(LoadingService);
  public appInitializer = inject(AppInitializerService);
  private localDb = inject(LocalDbService);
  public toastService = inject(ToastService);

  t(key: string, params?: any): string {
    return this.translationService.translate(key, params);
  }

  ngOnInit(): void {
    this.loadUserContext();

    // Poll invitations every 30 seconds
    setInterval(() => {
      this.loadPendingInvitations();
    }, 30000);
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
    try {
      // PRVO I NAJVAŽNIJE: Pričekaj da se IndexedDB asinkrono podigne i otvori!
      // Ovo sprječava prerano okidanje greške "Database not initialized"
      await this.localDb.initDatabase();

      // Nakon što je baza podignuta, TranslationService je sigurno spreman, a DB radi
      if (this.appInitializer.isOnlineMode) {
        this.http.get<User>(`${API_BASE_URL}/user`, {
          headers: { 'X-Skip-Loader': 'true' }
        }).subscribe({
          next: async (user) => {
            this.user = user;

            // Sync nav_preferences from server to local storage
            if (user.nav_preferences && user.nav_preferences.length > 0) {
              localStorage.setItem('nav_preferences', JSON.stringify(user.nav_preferences));
              window.dispatchEvent(new Event('nav-prefs-updated'));
            }

            await this.localDb.put('user_profile', user);
            this.loadPendingInvitations();
          },
          error: async (err) => {
            this.logger.error(this.t('logs.userFetchError'), err);
            await this.loadUserFromCache();
          }
        });
      } else {
        this.logger.warn(this.t('splash.offlineMode'));
        await this.loadUserFromCache();
      }
    } catch (dbErr) {
      this.logger.error(this.t('logs.dbCriticalSetupFailure'), dbErr);
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
      this.logger.error(this.t('logs.indexedDbError'), err);
    }
  }

  loadPendingInvitations() {
    if (!this.appInitializer.isOnlineMode) {
      this.pendingInvitations = [];
      return;
    }

    this.inviteRepo.getPending().subscribe({
      next: (invites) => (this.pendingInvitations = invites),
      error: (err) => this.logger.error(this.t('logs.invitationsLoadError'), err)
    });
  }

  toggleNotifications() {
    if (!this.appInitializer.isOnlineMode) {
      return;
    }
    this.isNotificationsOpen = !this.isNotificationsOpen;

    // Logovi prevedeni dinamički ovisno o stanju modala
    const logKey = this.isNotificationsOpen ? 'logs.notificationsOpened' : 'logs.notificationsClosed';
    this.logger.log(this.t(logKey));
  }

  respondToInvitation(invite: any, accept: boolean) {
    const action = accept ? this.inviteRepo.accept : this.inviteRepo.reject;

    action.call(this.inviteRepo, invite.token).subscribe({
      next: () => {
        this.loadPendingInvitations();

        this.http.get<User>(`${API_BASE_URL}/user`, {
          headers: { 'X-Skip-Loader': 'true' }
        }).subscribe(u => {
          this.user = u;
          if (accept) {
            window.dispatchEvent(new Event('workspace-invitation-accepted'));
          }
        });
      },
      error: (err) =>
        this.logger.error(this.t('logs.invitationResponseFailed'), err)
    });
  }

  onLogout(): void {
    this.logger.log(this.t('logs.userLogout'));
    this.authService.logout();
    this.localDb.clearStore('user_profile');
    this.router.navigate(['/auth/login']);
  }

  get shouldShowFab(): boolean {
    const url = this.router.url;
    return url.startsWith('/dashboard') || url.startsWith('/transactions');
  }
}
