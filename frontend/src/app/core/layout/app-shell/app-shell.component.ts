import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
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
    RouterLink,
    RouterLinkActive,
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
    public loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.http.get<User>(`${API_BASE_URL}/user`).subscribe({
      next: (user) => {
        this.user = user;
        this.loadPendingInvitations();
      },
      error: (err) => console.error('Error fetching user for shell', err)
    });

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updatePageTitle(event.urlAfterRedirects);
      });
  }

  private updatePageTitle(url: string): void {
    const cleanUrl = url.split('/').slice(0, 2).join('/');
    this.pageTitle = this.pageTitles[cleanUrl] || 'Allocento';
  }

  loadPendingInvitations() {
    this.inviteRepo.getPending().subscribe({
      next: (invites) => (this.pendingInvitations = invites)
    });
  }

  openNotifications() {
    const dialogRef = this.dialog.open(NotificationsDialogComponent, {
      width: '450px',
      data: { invitations: this.pendingInvitations }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPendingInvitations();
        // Optionally refresh user to see new household_id/org_id
        this.http.get<User>(`${API_BASE_URL}/user`).subscribe(u => this.user = u);
      }
    });
  }

  onAddTransaction(): void {
    this.router.navigate(['/transactions/new']);
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
