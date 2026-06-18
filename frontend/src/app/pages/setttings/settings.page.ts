import { Component, OnInit, inject, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { UserRepository } from '../../core/repositories/user.repository';
import { TranslationService } from '../../core/services/translation.service';
import { AppInitializerService } from '../../core/services/app-initializer';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';
import { RouterModule } from '@angular/router';
import { WorkspaceService } from '../../core/services/workspace.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './settings.page.html',
})
export class SettingsPage implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private userRepo = inject(UserRepository);
  private workspaceService = inject(WorkspaceService);
  private translationService = inject(TranslationService);
  private appInitializer = inject(AppInitializerService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);

  user = signal<User | null>(null);
  profileForm!: FormGroup;

  isEditMode = false;
  isPasswordCollapsed = true;
  isSaving = false;

  currentLang = 'en';
  isLangDropdownOpen = false;
  isOnline = signal<boolean>(true);

  selectedFile: File | null = null;
  photoPreview: string | null = null;

  availableNavOptions = [
    { id: 'accounts', translationKey: 'nav.accounts' },
    { id: 'workspaces', translationKey: 'nav.workspace' },
    { id: 'categories', translationKey: 'nav.categories' },
    { id: 'projects', translationKey: 'nav.projects' }
  ];
  selectedNavPrefs: string[] = [];
  hasNavChanges = false;

  hasFeature(feature: string): boolean {
    const ws = this.workspaceService.activeWorkspace();
    return ws?.enabled_features?.includes(feature) || false;
  }

  ngOnInit() {
    this.isOnline.set(this.appInitializer.isOnlineMode);
    this.currentLang = this.translationService.currentLang() || 'en';
    this.loadUserData();
  }

  loadUserData() {
    const timestamp = new Date().getTime();
    this.userRepo.getCurrentUser(timestamp).subscribe({
      next: (u) => {
        this.user.set(u);
        this.selectedNavPrefs = (u.nav_preferences || []).filter(p => p !== 'dashboard' && p !== 'menu' && p !== 'settings' && p !== 'transactions');
      },
      error: () => {
        this.toastService.error(this.t('profile.loadFailed') || 'Failed to load user settings.');
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
    if (!this.isOnline()) {
      this.toastService.warning(this.t('profile.offlineNotice') || 'Action not available offline.');
      return;
    }

    const currentUser = this.user();
    if (!currentUser) return;

    this.profileForm = this.fb.group({
      name: [currentUser.name, [Validators.required, Validators.minLength(2)]],
      email: [currentUser.email, [Validators.required, Validators.email]],
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
    if (!this.isOnline()) return;
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
    if (!this.isOnline()) {
      this.toastService.warning(this.t('profile.offlineNotice') || 'Action not available offline.');
      return;
    }

    if (this.profileForm.invalid || this.isSaving) return;
    this.isSaving = true;

    const requests: { [key: string]: Observable<any> } = {};

    const profileData = {
      name: this.profileForm.get('name')?.value,
      email: this.profileForm.get('email')?.value
    };

    requests['profile'] = this.userRepo.updateProfile(profileData);

    if (this.selectedFile) {
      requests['photo'] = this.userRepo.uploadPhoto(this.selectedFile);
    }

    const password = this.profileForm.get('password')?.value;
    if (password) {
      const passwordData = {
        current_password: this.profileForm.get('current_password')?.value,
        password: password,
        password_confirmation: this.profileForm.get('password_confirmation')?.value
      };
      requests['password'] = this.userRepo.changePassword(passwordData);
    }

    forkJoin(requests).pipe(
      switchMap(() => {
        const timestamp = new Date().getTime();
        return this.userRepo.getCurrentUser(timestamp);
      })
    ).subscribe({
      next: (updatedUser) => {
        this.user.set(updatedUser);
        this.isEditMode = false;
        this.isSaving = false;
        this.selectedFile = null;
        this.photoPreview = null;
        this.toastService.success(this.t('profile.successUpdate') || 'Profile updated successfully!');

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
          this.toastService.error(err.error.message);
        } else {
          this.toastService.error(this.t('profile.updateFailed') || 'Profile update failed.');
        }
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  deleteAccount() {
    if (!this.isOnline()) {
      this.toastService.warning(this.t('profile.offlineNotice') || 'Action not available offline.');
      return;
    }

    this.dialogService.confirm(
      this.t('profile.deleteAccount') || 'Delete Account',
      this.t('profile.deleteConfirmMsg') || 'Are you sure you want to permanently delete your account?',
      this.t('common.accept') || 'Delete',
      this.t('common.cancel') || 'Cancel'
    ).subscribe(confirmed => {
      if (!confirmed) return;

      this.userRepo.deleteAccount().subscribe({
        next: () => {
          this.toastService.success(this.t('profile.deleteSuccess') || 'Account deleted successfully.');
          this.logout();
        },
        error: (err) => {
          if (err.error && err.error.message) {
            this.toastService.error(err.error.message);
          } else {
            this.toastService.error(this.t('profile.deleteFailed') || 'Failed to delete account.');
          }
        }
      });
    });
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  toggleNavPref(id: string, event: any) {
    const isChecked = event.target.checked;
    if (isChecked) {
      if (!this.selectedNavPrefs.includes(id)) {
        this.selectedNavPrefs.push(id);
      }
    } else {
      this.selectedNavPrefs = this.selectedNavPrefs.filter(p => p !== id);
    }
    this.hasNavChanges = true;
  }

  saveNavPrefs() {
    if (!this.isOnline()) return;
    this.isSaving = true;
    
    // We update via updateProfile
    const finalPrefs = ['dashboard', ...this.selectedNavPrefs, 'settings'];

    const profileData = {
      nav_preferences: finalPrefs
    };
    
    this.userRepo.updateProfile(profileData).subscribe({
      next: () => {
        this.isSaving = false;
        this.hasNavChanges = false;
        this.toastService.success(this.t('profile.successUpdate') || 'Navigation preferences updated.');
        localStorage.setItem('nav_preferences', JSON.stringify(finalPrefs));
        window.dispatchEvent(new Event('nav-prefs-updated'));
      },
      error: () => {
        this.isSaving = false;
        this.toastService.error(this.t('profile.updateFailed') || 'Failed to update preferences.');
      }
    });
  }
}
