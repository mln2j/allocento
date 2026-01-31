import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>{{ data.title }}</h2>
    </div>

    <mat-dialog-content>
      <p class="dialog-msg">{{ data.message }}</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" class="btn-cancel">
        {{ data.cancelText || 'Cancel' }}
      </button>
      <button mat-flat-button color="warn" (click)="onConfirm()" class="btn-confirm">
        {{ data.confirmText || 'Delete' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; padding: 8px; }
    h2 { font-weight: 800; color: #1e293b; margin-bottom: 8px; }
    .dialog-msg { color: #64748b; font-size: 1rem; line-height: 1.5; }
    mat-dialog-actions { padding: 16px 0 8px; gap: 8px; }
    .btn-cancel, .btn-confirm { border-radius: 12px; height: 44px; font-weight: 600; }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
