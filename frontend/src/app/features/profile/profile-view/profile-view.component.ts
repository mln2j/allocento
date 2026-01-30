import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { User } from '../../../core/models/user.model';
import { API_BASE_URL } from '../../../core/api.config';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ChangePasswordDialogComponent } from '../change-password-dialog/change-password-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { UserRepository } from '../../../core/repositories/user.repository';
import { AuthService } from '../../../core/services/auth.service';

import { HouseholdRepository } from '../../../core/repositories/household.repository';
import { OrganizationRepository } from '../../../core/repositories/organization.repository';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [
    CommonModule, 
    MatButtonModule, 
    MatIconModule, 
    MatCardModule, 
    MatDialogModule, 
    MatSnackBarModule,
    RouterLink
  ],
  templateUrl: './profile-view.component.html',
  styleUrl: './profile-view.component.scss'
})
export class ProfileViewComponent implements OnInit {
  user: User | null = null;
  householdOwnerId: number | null = null;
  organizationOwnerId: number | null = null;
  householdName: string | null = null;
  organizationName: string | null = null;
  isLoading = true;

  constructor(
    private http: HttpClient, 
    private router: Router,
    private dialog: MatDialog,
    private userRepo: UserRepository,
    private householdRepo: HouseholdRepository,
    private orgRepo: OrganizationRepository,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.http.get<User>(`${API_BASE_URL}/user`).subscribe({
      next: (user) => {
        this.user = user;
        this.loadOwnerData(user);
      },
      error: () => this.isLoading = false
    });
  }

  loadOwnerData(user: User) {
    const requests: any = {};
    
    if (user.household_id) {
      requests.household = this.householdRepo.get().pipe(catchError(() => of(null)));
    }
    
    if (user.organization_id) {
      requests.org = this.orgRepo.get().pipe(catchError(() => of(null)));
    }

    if (Object.keys(requests).length > 0) {
      forkJoin(requests).subscribe({
        next: (res: any) => {
          if (res.household) {
            this.householdOwnerId = res.household.owner_id;
            this.householdName = res.household.name;
          }
          if (res.org) {
            this.organizationOwnerId = res.org.owner_id;
            this.organizationName = res.org.name;
          }
          this.isLoading = false;
        },
        error: () => this.isLoading = false
      });
    } else {
      this.isLoading = false;
    }
  }

  editProfile() {
    this.router.navigate(['/profile/edit']);
  }

  changePassword() {
    this.dialog.open(ChangePasswordDialogComponent, {
      width: '400px'
    });
  }

  deleteAccount() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Account',
        message: 'Are you sure you want to delete your account? This action cannot be undone. Your personal accounts will be removed, but shared history remains.',
        confirmText: 'Delete My Account',
        cancelText: 'Keep My Account'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.userRepo.deleteAccount().subscribe({
          next: () => {
            this.authService.logout();
            this.router.navigate(['/auth/login']);
            this.snackBar.open('Account deleted successfully.', 'Close', { duration: 5000 });
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Error deleting account', 'Close', { duration: 5000 });
          }
        });
      }
    });
  }
}
