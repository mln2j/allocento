import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TranslationService } from '../../core/services/translation.service';
import { UserRepository } from '../../core/repositories/user.repository';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './verify-email.html'
})
export class VerifyEmail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private tService = inject(TranslationService);
  private userRepo = inject(UserRepository);
  private fb = inject(FormBuilder);

  mode = signal<'waiting' | 'success' | 'error'>('waiting');
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  codeForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
  });

  email = signal<string | null>(null);

  ngOnInit() {
    this.userRepo.getCurrentUser(Date.now()).subscribe({
      next: (user) => {
        this.email.set(user.email);
      },
      error: () => {
        this.mode.set('error');
        this.errorMessage.set(this.t('auth.loadUserFailed') || 'Failed to load user info. Please log in again.');
      }
    });
  }

  t(key: string): string {
    return this.tService.translate(key);
  }

  verifyCode() {
    const emailVal = this.email();
    const codeVal = this.codeForm.get('code')?.value;
    
    if (!emailVal || !codeVal || codeVal.length !== 6) return;

    this.loading.set(true);
    this.authService.verifyEmailCode(emailVal, codeVal).subscribe({
      next: () => {
        this.loading.set(false);
        this.mode.set('success');
      },
      error: (err) => {
        this.loading.set(false);
        this.mode.set('error');
        this.errorMessage.set(err.error?.message || this.t('auth.invalidCode') || 'Invalid verification code.');
      }
    });
  }

  resendEmail() {
    this.loading.set(true);
    this.authService.resendVerificationEmail().subscribe({
      next: () => {
        this.loading.set(false);
        alert(this.t('auth.codeResent') || 'New code sent to your email!');
        this.mode.set('waiting');
      },
      error: () => {
        this.loading.set(false);
        alert(this.t('auth.resendFailed') || 'Failed to resend code.');
      }
    });
  }

  continueToApp() {
    this.router.navigate(['/splash']); 
  }
}
