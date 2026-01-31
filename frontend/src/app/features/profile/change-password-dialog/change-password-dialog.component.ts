import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserRepository } from '../../../core/repositories/user.repository';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIcon
  ],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title>Security</h2>
      <p class="subtitle">Update your password to keep your account safe.</p>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <mat-dialog-content>
          <div class="form-stack">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Current Password</mat-label>
              <mat-icon matPrefix>lock_open</mat-icon>
              <input matInput formControlName="current_password" type="password">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>New Password</mat-label>
              <mat-icon matPrefix>lock_closed</mat-icon>
              <input matInput formControlName="password" type="password">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Confirm New Password</mat-label>
              <mat-icon matPrefix>password</mat-icon>
              <input matInput formControlName="password_confirmation" type="password">
              @if (form.hasError('notMatching') && form.get('password_confirmation')?.touched) {
                <mat-error>Passwords do not match.</mat-error>
              }
            </mat-form-field>
          </div>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
          <button type="button" mat-button (click)="dialogRef.close()">Cancel</button>
          <button type="submit" mat-flat-button color="primary" class="submit-btn" [disabled]="form.invalid || isSaving">
            {{ isSaving ? 'Updating...' : 'Save Password' }}
          </button>
        </mat-dialog-actions>
      </form>
    </div>
  `,
  styles: [`
    .dialog-container { padding: 12px 16px; }
    h2 { font-weight: 800; color: #1e293b; margin: 0 0 4px !important; padding: 0 !important; }
    .subtitle { color: #64748b; font-size: 0.9rem; margin: 0 0 24px 0; }
    .form-stack { display: flex; flex-direction: column; gap: 4px; padding-top: 4px; }
    .full-width { width: 100%; }
    mat-dialog-content { padding: 0 !important; margin: 0 !important; overflow: visible; }
    mat-dialog-actions { padding: 16px 0 0; gap: 12px; }
    .submit-btn { border-radius: 12px; height: 48px; font-weight: 600; padding: 0 24px; }

    mat-form-field {
      ::ng-deep .mat-mdc-text-field-wrapper { background-color: white !important; }
    }
  `]
})
export class ChangePasswordDialogComponent {
  form: FormGroup;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private userRepo: UserRepository,
    public dialogRef: MatDialogRef<ChangePasswordDialogComponent>,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      current_password: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', [Validators.required]]
    }, {
      validators: (group: FormGroup) => {
        const pass = group.get('password')?.value;
        const confirm = group.get('password_confirmation')?.value;
        return pass === confirm ? null : { notMatching: true };
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.isSaving = true;

    this.userRepo.changePassword(this.form.value).subscribe({
      next: () => {
        this.snackBar.open('Password changed successfully', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isSaving = false;
        this.snackBar.open(err.error?.message || 'Error changing password', 'Close', { duration: 3000 });
      }
    });
  }
}
