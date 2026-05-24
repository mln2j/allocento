import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { User } from '../../models/user.model';
import { API_BASE_URL } from '../../api.config';

import { AuthService } from '../../services/auth.service';
import { AppInitializerService } from '../../services/app-initializer'; // <-- DODANO
import { LocalDbService } from '../../services/local-db'; // <-- DODANO

import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InvitationRepository } from '../../repositories/invitation.repository';
import { NotificationsDialogComponent } from '../../../shared/notifications-dialog/notifications-dialog.component';
import { LoadingService } from '../../services/loading/loading.service';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './app-shell.component.html',
})
export class AppShellComponent implements OnInit {
  title = 'Allocento';
  pageTitle = 'Allocento';
  user: User | null = null;
  pendingInvitations: any[] = [];

  private readonly pageTitles: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/accounts': 'Accounts',
    '/transactions': 'Transactions',
    '/household': 'Household',
    '/organization': 'Organization',
    '/profile': 'Profile',
  };

  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private inviteRepo: InvitationRepository,
    private dialog: MatDialog,
    public loadingService: LoadingService,
    private appInitializer: AppInitializerService, // <-- INJEKTIRANO
    private localDb: LocalDbService // <-- INJEKTIRANO
  ) {}

  ngOnInit(): void {
    // Pokrećemo pametno učitavanje korisničkog konteksta ovisno o mreži
    this.loadUserContext();

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updatePageTitle(event.urlAfterRedirects);
      });
  }

  /**
   * Provjerava mrežni način rada i učitava podatke iz pravog izvora
   */
  private async loadUserContext(): Promise<void> {
    if (this.appInitializer.isOnlineMode) {
      // --- ONLINE NAČIN ---
      this.http.get<User>(`${API_BASE_URL}/user`).subscribe({
        next: async (user) => {
          this.user = user;
          // Odmah spremi profil u IndexedDB cache za idući put kad bude offline
          await this.localDb.put('user_profile', user);
          this.loadPendingInvitations();
        },
        error: async (err) => {
          console.error('Error fetching user for shell, switching to local backup', err);
          await this.loadUserFromCache();
        }
      });
    } else {
      // --- OFFLINE NAČIN ---
      console.log('📴 AppShell: Rad u offline načinu. Učitavam podatke iz lokalnog cachea...');
      await this.loadUserFromCache();
    }
  }

  /**
   * Pomoćna metoda za čitanje korisnika iz IndexedDB baze
   */
  private async loadUserFromCache(): Promise<void> {
    try {
      const cachedUsers = await this.localDb.getAll('user_profile');
      if (cachedUsers && cachedUsers.length > 0) {
        this.user = cachedUsers[0]; // Uzimamo spremljeni profil
        console.log('📦 Korisnik uspješno pročitan iz lokalnog cachea:', this.user);
      } else {
        // Ako je baza potpuno prazna (npr. prvo pokretanje ikad bez neta), stavljamo fallback
        this.user = { id: 0, name: 'Offline User', email: '' } as User;
      }
    } catch (err) {
      console.error('Greška pri čitanju korisnika iz IndexedDB:', err);
    }
  }

  private updatePageTitle(url: string): void {
    const cleanUrl = url.split('/').slice(0, 2).join('/');
    this.pageTitle = this.pageTitles[cleanUrl] || 'Allocento';
  }

  loadPendingInvitations() {
    // Pozivnice povlačimo samo ako smo online, jer nemaju smisla u offline načinu rada
    if (!this.appInitializer.isOnlineMode) {
      this.pendingInvitations = [];
      return;
    }

    this.inviteRepo.getPending().subscribe({
      next: (invites) => (this.pendingInvitations = invites),
      error: (err) => console.error('Error loading invitations', err)
    });
  }

  openNotifications() {
    // Blokiramo otvaranje obavijesti/pozivnica ako nema mreže
    if (!this.appInitializer.isOnlineMode) {
      console.log('Obavijesti nisu dostupne u offline načinu rada.');
      return;
    }

    const dialogRef = this.dialog.open(NotificationsDialogComponent, {
      width: '450px',
      data: { invitations: this.pendingInvitations }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPendingInvitations();
        if (this.appInitializer.isOnlineMode) {
          this.http.get<User>(`${API_BASE_URL}/user`).subscribe(u => this.user = u);
        }
      }
    });
  }

  onAddTransaction(): void {
    this.router.navigate(['/transactions/new']);
  }

  onLogout(): void {
    this.authService.logout();
    this.localDb.clearStore('user_profile'); // Čistimo i lokalni cache kod odjave
    this.router.navigate(['/auth/login']);
  }
}
