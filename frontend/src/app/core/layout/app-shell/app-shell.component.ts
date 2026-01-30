import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
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
import { InvitationRepository } from '../../repositories/invitation.repository';
import { NotificationsDialogComponent } from '../../../shared/notifications-dialog/notifications-dialog.component';

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
    MatDialogModule
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent implements OnInit {
  title = 'Allocento';
  user: User | null = null;
  pendingInvitations: any[] = [];

  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private inviteRepo: InvitationRepository,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.http.get<User>(`${API_BASE_URL}/user`).subscribe({
      next: (user) => {
        this.user = user;
        this.loadPendingInvitations();
      },
      error: (err) => console.error('Error fetching user for shell', err)
    });
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
