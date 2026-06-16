import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.html'
})
export class ForgotPassword {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private router = inject(Router);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    code: [''],
    password: [''],
    password_confirmation: ['']
  }, { validators: this.passwordMatchValidator });

  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirm = g.get('password_confirmation')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  loading = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  step = signal<number>(1);

  t(key: string): string {
    return this.translationService.translate(key);
  }

  get userEmail(): string {
    return this.form.get('email')?.value || '';
  }

  submitEmail() {
    if (this.form.get('email')?.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.forgotPassword(this.form.value.email).subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set(2);
        this.form.get('code')?.setValidators([Validators.required, Validators.minLength(6)]);
        this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
        this.form.get('password_confirmation')?.setValidators([Validators.required]);
        this.form.get('code')?.updateValueAndValidity();
        this.form.get('password')?.updateValueAndValidity();
        this.form.get('password_confirmation')?.updateValueAndValidity();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Error occurred. Try again.');
      }
    });
  }

  goToStep3() {
    if (this.form.get('code')?.invalid) return;
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.step.set(3);
  }

  goBackTo(step: number) {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.step.set(step);
  }

  submitReset() {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.resetPassword({
      email: this.form.value.email,
      token: this.form.value.code,
      password: this.form.value.password,
    }).subscribe({
      next: () => {
        // Odmah automatski logiramo korisnika nakon promjene lozinke
        this.authService.login(this.form.value.email, this.form.value.password).subscribe({
          next: () => {
            this.loading.set(false);
            this.router.navigate(['/dashboard']);
          },
          error: () => {
            // Ako login slučajno pukne, barem prikažemo success i vratimo ga na početak
            this.loading.set(false);
            this.successMessage.set(this.t('auth.resetSuccess') || 'Password changed.');
            this.form.reset();
            this.step.set(1);
          }
        });
      },
      error: (err) => {
        this.loading.set(false);
        if (err.error?.message === 'passwords.token') {
          this.step.set(2);
          this.errorMessage.set(this.t('auth.invalidCode') || 'Invalid code.');
        } else {
          this.errorMessage.set(err.error?.message || 'Error occurred.');
        }
      }
    });
  }
}
