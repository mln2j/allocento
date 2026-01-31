import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HouseholdRepository, Household } from '../../core/repositories/household.repository';
import { InvitationRepository } from '../../core/repositories/invitation.repository';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { API_BASE_URL } from '../../core/api.config';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-household',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatListModule,
    MatSnackBarModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './household.component.html',
  styleUrl: './household.component.scss'
})
export class HouseholdComponent implements OnInit {
  household: Household | null = null;
  currentUser: User | null = null;
  isLoading = true;
  isEditing = false;
  
  createForm: FormGroup;
  inviteForm: FormGroup;
  editForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private householdRepo: HouseholdRepository,
    private inviteRepo: InvitationRepository,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private http: HttpClient,
    private router: Router
  ) {
    this.createForm = this.fb.group({
      name: ['', [Validators.required]]
    });

    this.inviteForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.editForm = this.fb.group({
      name: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.http.get<User>(`${API_BASE_URL}/user`).subscribe(user => {
      this.currentUser = user;
      this.loadHousehold();
    });
  }

  loadHousehold() {
    this.householdRepo.get().subscribe({
      next: (h) => {
        this.household = h;
        this.editForm.patchValue({ name: h.name });
        this.isLoading = false;
      },
      error: () => {
        this.household = null;
        this.isLoading = false;
      }
    });
  }

  get isOwner(): boolean {
    return this.household?.owner_id === this.currentUser?.id;
  }

  onCreate() {
    if (this.createForm.invalid) return;
    this.householdRepo.create(this.createForm.value.name).subscribe({
      next: () => {
        this.snackBar.open('Household created!', 'Close', { duration: 3000 });
        this.loadData();
      }
    });
  }

  onUpdate() {
    if (this.editForm.invalid) return;
    
    this.http.put(`${API_BASE_URL}/household`, this.editForm.value).subscribe({
      next: () => {
        this.isEditing = false;
        this.snackBar.open('Household updated!', 'Close', { duration: 3000 });
        this.loadHousehold();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error updating household', 'Close', { duration: 3000 });
      }
    });
  }

  cancelEdit() {
    this.isEditing = false;
    if (this.household) {
      this.editForm.patchValue({ name: this.household.name });
    }
  }

  onDelete() {
    if (!this.household) return;
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Household',
        message: 'Are you sure you want to delete this household? All members will be removed and shared settings will be lost.',
        confirmText: 'Delete Household'
      }
    });

    dialogRef.afterClosed().subscribe(confirm => {
      if (confirm && this.household) {
        this.householdRepo.delete(this.household.id).subscribe({
          next: () => {
            this.snackBar.open('Household deleted.', 'Close', { duration: 3000 });
            this.loadData();
          }
        });
      }
    });
  }

  onInvite() {
    if (this.inviteForm.invalid || !this.household) return;
    this.inviteRepo.invite(this.inviteForm.value.email, 'household', this.household.id).subscribe({
      next: (res) => {
        this.snackBar.open('Invitation sent!', 'Close', { duration: 3000 });
        this.inviteForm.reset();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error sending invite', 'Close', { duration: 3000 });
      }
    });
  }
}
