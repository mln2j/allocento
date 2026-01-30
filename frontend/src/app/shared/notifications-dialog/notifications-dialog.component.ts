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
        <p>No new notifications.</p>
      } @else {
        <mat-list>
          @for (invite of invitations; track invite.token) {
            <mat-list-item>
              <mat-icon matListItemIcon>{{ invite.entity_type === 'household' ? 'home' : 'business' }}</mat-icon>
              <div matListItemTitle>Invite to {{ invite.entity_name }}</div>
              <div matListItemLine>You have been invited to join this {{ invite.entity_type }}.</div>
              <div matListItemMeta>
                <button mat-icon-button color="primary" (click)="accept(invite.token)" matTooltip="Accept">
                  <mat-icon>check_circle</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="reject(invite.token)" matTooltip="Reject">
                  <mat-icon>cancel</mat-icon>
                </button>
              </div>
            </mat-list-item>
          }
        </mat-list>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-list-item { margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
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
