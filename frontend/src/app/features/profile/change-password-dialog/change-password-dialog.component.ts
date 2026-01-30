import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserRepository } from '../../../core/repositories/user.repository';

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>Change Password</h2>
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <mat-dialog-content>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Current Password</mat-label>
          <input matInput formControlName="current_password" type="password">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>New Password</mat-label>
          <input matInput formControlName="password" type="password">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Confirm New Password</mat-label>
          <input matInput formControlName="password_confirmation" type="password">
          @if (form.hasError('notMatching') && form.get('password_confirmation')?.touched) {
            <mat-error>Passwords do not match.</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button type="button" mat-button (click)="dialogRef.close()">Cancel</button>
        <button type="submit" mat-flat-button color="primary" [disabled]="form.invalid || isSaving">
          {{ isSaving ? 'Changing...' : 'Change Password' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`.full-width { width: 100%; margin-top: 0.5rem; }`]
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
