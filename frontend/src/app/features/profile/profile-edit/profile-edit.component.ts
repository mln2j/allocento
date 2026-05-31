import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UserRepository } from '../../../core/repositories/user.repository';
import { User } from '../../../core/models/user.model';
import { API_BASE_URL } from '../../../core/api.config';
import { ContainerComponent } from '../../../core/layout/container/container.component';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ContainerComponent
  ],
  templateUrl: './profile-edit.component.html',
})
export class ProfileEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private userRepo = inject(UserRepository);
  private router = inject(Router);
  private translationService = inject(TranslationService);

  profileForm: FormGroup;
  user: User | null = null;
  isSaving = false;
  previewUrl: string | null = null;
  selectedFile: File | null = null;
  errorMessage: string | null = null;

  constructor() {
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
    this.errorMessage = null;
    const { name, email } = this.profileForm.value;

    this.userRepo.updateProfile({ name, email }).subscribe({
      next: () => {
        if (this.selectedFile) {
          this.userRepo.uploadPhoto(this.selectedFile).subscribe({
            next: () => this.finishSave(),
            error: () => {
              this.isSaving = false;
              this.errorMessage = 'Failed to upload photo.';
            }
          });
        } else {
          this.finishSave();
        }
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage = err.error?.message || 'Error updating profile.';
      }
    });
  }

  finishSave() {
    this.isSaving = false;
    this.router.navigate(['/profile']);
  }

  cancel() {
    this.router.navigate(['/profile']);
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }
}
