import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { User } from '../../core/models/user.model';
import { API_BASE_URL } from '../../core/api.config';
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
  private http = inject(HttpClient);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private userRepo = inject(UserRepository);
  private translationService = inject(TranslationService);

  user: User | null = null;
  profileForm!: FormGroup;

  // Stanja komponente
  isEditMode = false;
  isPasswordCollapsed = true;
  isSaving = false;

  // Interaktivni Language Switcher Stanje
  currentLang = 'en';
  isLangDropdownOpen = false;

  // Slike / Privremeni prikazi
  selectedFile: File | null = null;
  photoPreview: string | null = null;

  ngOnInit() {
    this.currentLang = this.translationService.currentLang() || 'en';
    this.loadUserData();
  }

  loadUserData() {
    const timestamp = new Date().getTime();
    this.http.get<User>(`${API_BASE_URL}/user?v=${timestamp}`).subscribe({
      next: (user) => {
        this.user = user;
      },
      error: () => {
        alert(this.t('profile.loadFailed') || 'Failed to load user settings data.');
      }
    });
  }

  // Metode za upravljanje dropdownom jezika
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

  // Automatsko zatvaranje dropdowna ako se klikne izvan njega
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

  saveProfile() {
    if (this.profileForm.invalid || this.isSaving) return;
    this.isSaving = true;

    const formData = new FormData();
    formData.append('name', this.profileForm.get('name')?.value);

    if (this.selectedFile) {
      formData.append('profile_photo', this.selectedFile);
    }

    const password = this.profileForm.get('password')?.value;
    if (password) {
      formData.append('current_password', this.profileForm.get('current_password')?.value);
      formData.append('password', password);
      formData.append('password_confirmation', this.profileForm.get('password_confirmation')?.value);
    }

    this.http.post<User>(`${API_BASE_URL}/user/update`, formData).subscribe({
      next: (updatedUser) => {
        this.user = updatedUser;
        this.isEditMode = false;
        this.isSaving = false;
      },
      error: () => {
        this.isSaving = false;
        alert(this.t('profile.updateFailed') || 'Profile update failed.');
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  deleteAccount() {
    if (confirm(this.t('profile.deleteConfirmMsg') || 'Are you sure you want to permanently delete your account?')) {
      this.userRepo.deleteAccount().subscribe({
        next: () => this.logout(),
        error: () => alert('Failed to delete account. Please try again later.')
      });
    }
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }
}
