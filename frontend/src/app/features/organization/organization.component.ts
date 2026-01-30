import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { OrganizationRepository, Organization } from '../../core/repositories/organization.repository';
import { InvitationRepository } from '../../core/repositories/invitation.repository';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { User } from '../../core/models/user.model';
import { API_BASE_URL } from '../../core/api.config';

@Component({
  selector: 'app-organization',
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
    MatTooltipModule
  ],
  templateUrl: './organization.component.html',
  styleUrl: './organization.component.scss'
})
export class OrganizationComponent implements OnInit {
  organization: Organization | null = null;
  currentUser: User | null = null;
  isLoading = true;
  isEditing = false;
  
  createForm: FormGroup;
  inviteForm: FormGroup;
  editForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private orgRepo: OrganizationRepository,
    private inviteRepo: InvitationRepository,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private http: HttpClient,
    private router: Router
  ) {
    this.createForm = this.fb.group({
      name: ['', [Validators.required]],
      description: ['']
    });

    this.inviteForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.editForm = this.fb.group({
      name: ['', [Validators.required]],
      description: ['']
    });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.http.get<User>(`${API_BASE_URL}/user`).subscribe({
      next: (user) => {
        this.currentUser = user;
        this.loadOrganization();
      },
      error: () => this.isLoading = false
    });
  }

  loadOrganization() {
    this.orgRepo.get().subscribe({
      next: (o) => {
        this.organization = o;
        this.editForm.patchValue({
          name: o.name,
          description: o.description
        });
        this.isLoading = false;
      },
      error: () => {
        this.organization = null;
        this.isLoading = false;
      }
    });
  }

  get isOwner(): boolean {
    return this.organization?.owner_id === this.currentUser?.id;
  }

  onCreate() {
    if (this.createForm.invalid) return;
    this.orgRepo.create(this.createForm.value.name, this.createForm.value.description).subscribe({
      next: () => {
        this.snackBar.open('Organization created!', 'Close', { duration: 3000 });
        this.loadData();
      }
    });
  }

  onUpdate() {
    if (this.editForm.invalid) return;
    this.http.put(`${API_BASE_URL}/organization`, this.editForm.value).subscribe({
      next: () => {
        this.isEditing = false;
        this.snackBar.open('Organization updated!', 'Close', { duration: 3000 });
        this.loadOrganization();
      }
    });
  }

  onDelete() {
    if (!this.organization) return;
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Organization',
        message: 'Are you sure you want to delete this organization? All team members will be removed and business data will be lost.',
        confirmText: 'Delete Organization'
      }
    });

    dialogRef.afterClosed().subscribe(confirm => {
      if (confirm && this.organization) {
        this.http.delete(`${API_BASE_URL}/organizations/${this.organization.id}`).subscribe({
          next: () => {
            this.snackBar.open('Organization deleted.', 'Close', { duration: 3000 });
            this.loadData();
          }
        });
      }
    });
  }

  onInvite() {
    if (this.inviteForm.invalid || !this.organization) return;
    this.inviteRepo.invite(this.inviteForm.value.email, 'organization', this.organization.id).subscribe({
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
