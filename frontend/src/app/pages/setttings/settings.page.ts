import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { UserRepository } from '../../core/repositories/user.repository';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.page.html',
})
export class SettingsPage implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private userRepo = inject(UserRepository); // <--- Sada ga koristimo punim plućima
  private translationService = inject(TranslationService);

  user: User | null = null;
  profileForm!: FormGroup;

  isEditMode = false;
  isPasswordCollapsed = true;
  isSaving = false;

  currentLang = 'en';
  isLangDropdownOpen = false;

  selectedFile: File | null = null;
  photoPreview: string | null = null;

  ngOnInit() {
    this.currentLang = this.translationService.currentLang() || 'en';
    this.loadUserData();
  }

  // KORIŠTENJE REPOZITORIJA ZA DOHVAT USERA
  loadUserData() {
    const timestamp = new Date().getTime();
    this.userRepo.getCurrentUser(timestamp).subscribe({
      next: (user) => {
        this.user = user;
      },
      error: () => {
        alert(this.t('profile.loadFailed') || 'Failed to load user settings data.');
      }
    });
  }

  toggleLangDropdown() {
    this.isLangDropdownOpen = !this.isLangDropdownOpen;
  }

  closeLangDropdown() {
    this.isLangDropdownOpen = false;
  }

  setLang(lang: 'hr' | 'en') {
    this.currentLang = lang;
    this.closeLangDropdown();
    if (typeof this.translationService.setLanguage === 'function') {
      this.translationService.setLanguage(lang);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.isLangDropdownOpen) return;

    const target = event.target as HTMLElement;
    if (target && !target.closest('.relative.font-mono.text-xs')) {
      this.closeLangDropdown();
    }
  }

  enableEditMode() {
    if (!this.user) return;

    this.profileForm = this.fb.group({
      name: [this.user.name, [Validators.required, Validators.minLength(2)]],
      email: [this.user.email, [Validators.required, Validators.email]],
      current_password: [''],
      password: [''],
      password_confirmation: ['']
    }, { validators: this.passwordMatchValidator });

    this.isEditMode = true;
    this.isPasswordCollapsed = true;
    this.photoPreview = null;
    this.selectedFile = null;
  }

  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirmation = g.get('password_confirmation')?.value;
    return password === confirmation ? null : { notMatching: true };
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  cancelEdit() {
    this.isEditMode = false;
    this.photoPreview = null;
    this.selectedFile = null;
    this.isPasswordCollapsed = true;
    if (this.profileForm) {
      this.profileForm.reset();
    }
  }

  // KORIŠTENJE REPOZITORIJA ZA SPREMANJE PROFILA
  saveProfile() {
    if (this.profileForm.invalid || this.isSaving) return;
    this.isSaving = true;

    const requests: { [key: string]: Observable<any> } = {};

    const profileData = {
      name: this.profileForm.get('name')?.value,
      email: this.profileForm.get('email')?.value
    };

    // Koristimo repozitorij umjesto direktnog http.put
    requests['profile'] = this.userRepo.updateProfile(profileData);

    if (this.selectedFile) {
      // Koristimo repozitorij za sliku
      requests['photo'] = this.userRepo.uploadPhoto(this.selectedFile);
    }

    const password = this.profileForm.get('password')?.value;
    if (password) {
      const passwordData = {
        current_password: this.profileForm.get('current_password')?.value,
        password: password,
        password_confirmation: this.profileForm.get('password_confirmation')?.value
      };
      // Koristimo repozitorij za lozinku
      requests['password'] = this.userRepo.changePassword(passwordData);
    }

    forkJoin(requests).pipe(
      switchMap(() => {
        const timestamp = new Date().getTime();
        return this.userRepo.getCurrentUser(timestamp);
      })
    ).subscribe({
      next: (updatedUser) => {
        // Kada vraćaš iz repozitorija, Laravel u updateProfile metodi omata objekt
        // u listu sa strukturom { message, user }, pa nam u switchMapu s getCurrentUser()
        // ponovo sjeda čisti User objekt na idućoj liniji:
        this.user = updatedUser;
        this.isEditMode = false;
        this.isSaving = false;
        this.selectedFile = null;
        this.photoPreview = null;

        if (this.profileForm) {
          this.profileForm.get('current_password')?.setValue('');
          this.profileForm.get('password')?.setValue('');
          this.profileForm.get('password_confirmation')?.setValue('');
        }
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Update failed:', err);

        if (err.status === 422 && err.error?.message) {
          alert(err.error.message);
        } else {
          alert(this.t('profile.updateFailed') || 'Profile update failed. Please check your data.');
        }
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  // KORIŠTENJE REPOZITORIJA ZA BRISANJE RAČUNA
  deleteAccount() {
    if (confirm(this.t('profile.deleteConfirmMsg') || 'Are you sure you want to permanently delete your account?')) {
      this.userRepo.deleteAccount().subscribe({
        next: () => this.logout(),
        error: (err) => {
          if (err.status === 403 && err.error?.message) {
            alert(err.error.message);
          } else {
            alert('Failed to delete account. Please try again later.');
          }
        }
      });
    }
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }
}
