import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { InvitationRepository } from '../../core/repositories/invitation.repository';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-notifications-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatListModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Notifications</h2>
    <mat-dialog-content>
      @if (invitations.length === 0) {
        <div class="empty-notif">
          <mat-icon>notifications_none</mat-icon>
          <p>No new notifications.</p>
        </div>
      } @else {
        <div class="notif-list">
          @for (invite of invitations; track invite.token) {
            <div class="notif-item">
              <div class="notif-icon" [class]="invite.entity_type">
                <mat-icon>{{ invite.entity_type === 'household' ? 'home' : 'business' }}</mat-icon>
              </div>
              <div class="notif-body">
                <span class="notif-title">Invite to {{ invite.entity_name }}</span>
                <span class="notif-sub">You have been invited to join this {{ invite.entity_type }}.</span>
              </div>
              <div class="notif-actions">
                <button mat-icon-button color="primary" (click)="accept(invite.token)" matTooltip="Accept">
                  <mat-icon>check_circle</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="reject(invite.token)" matTooltip="Reject">
                  <mat-icon>cancel</mat-icon>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; min-width: 350px; }
    h2 { font-weight: 800; color: #1e293b; }
    
    .notif-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
    
    .notif-item {
      display: flex;
      align-items: center;
      padding: 12px;
      border-radius: 16px;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      gap: 12px;
    }

    .notif-icon {
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      &.household { background: #eff6ff; color: #3b82f6; }
      &.organization { background: #f0fdf4; color: #10b981; }
    }

    .notif-body {
      flex: 1; display: flex; flex-direction: column;
      .notif-title { font-weight: 700; color: #1e293b; font-size: 0.9rem; }
      .notif-sub { font-size: 0.75rem; color: #64748b; }
    }

    .notif-actions { display: flex; gap: 4px; }

    .empty-notif {
      text-align: center; padding: 32px; color: #94a3b8;
      mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.5; margin-bottom: 8px; }
    }
  `]
})
export class NotificationsDialogComponent {
  invitations: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<NotificationsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { invitations: any[] },
    private inviteRepo: InvitationRepository,
    private snackBar: MatSnackBar
  ) {
    this.invitations = data.invitations;
  }

  accept(token: string) {
    this.inviteRepo.accept(token).subscribe({
      next: () => {
        this.snackBar.open('Invitation accepted!', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Error', 'Close')
    });
  }

  reject(token: string) {
    this.inviteRepo.reject(token).subscribe({
      next: () => {
        this.snackBar.open('Invitation rejected.', 'Close', { duration: 3000 });
        this.invitations = this.invitations.filter(i => i.token !== token);
        if (this.invitations.length === 0) this.dialogRef.close(true);
      }
    });
  }
}
