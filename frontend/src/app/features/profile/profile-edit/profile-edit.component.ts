import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { UserRepository } from '../../../core/repositories/user.repository';
import { User } from '../../../core/models/user.model';
import { API_BASE_URL } from '../../../core/api.config';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCardModule
  ],
  templateUrl: './profile-edit.component.html',
  styleUrl: './profile-edit.component.scss'
})
export class ProfileEditComponent implements OnInit {
  profileForm: FormGroup;
  user: User | null = null;
  isLoading = true;
  isSaving = false;
  previewUrl: string | null = null;
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private userRepo: UserRepository,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit() {
    this.http.get<User>(`${API_BASE_URL}/user`).subscribe({
      next: (user) => {
        this.user = user;
        this.previewUrl = user.profile_photo_url || null;
        this.profileForm.patchValue({
          name: user.name,
          email: user.email
        });
        this.isLoading = false;
      },
      error: () => {
        this.router.navigate(['/profile']);
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit() {
    if (this.profileForm.invalid) return;

    this.isSaving = true;
    const { name, email } = this.profileForm.value;

    this.userRepo.updateProfile({ name, email }).subscribe({
      next: () => {
        if (this.selectedFile) {
          this.userRepo.uploadPhoto(this.selectedFile).subscribe({
            next: () => this.finishSave(),
            error: () => this.isSaving = false
          });
        } else {
          this.finishSave();
        }
      },
      error: (err) => {
        this.isSaving = false;
        this.snackBar.open(err.error?.message || 'Error updating profile', 'Close', { duration: 3000 });
      }
    });
  }

  finishSave() {
    this.isSaving = false;
    this.snackBar.open('Profile updated successfully', 'Close', { duration: 2000 });
    this.router.navigate(['/profile']);
  }

  cancel() {
    this.router.navigate(['/profile']);
  }
}