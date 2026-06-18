import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TranslationService } from '../../core/services/translation.service';
import { UserRepository } from '../../core/repositories/user.repository';
import { ToastService } from '../../core/services/toast.service';
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
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  mode = signal<'waiting'>('waiting');
  loading = signal(false);
  resendCooldown = signal<number>(0);
  private intervalId: any;

  codeForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
  });

  email = signal<string | null>(null);

  ngOnInit() {
    this.userRepo.getCurrentUser(Date.now()).subscribe({
      next: (user) => {
        this.email.set(user.email);
        
        // Automatski pošalji email ako ne postoji aktivni kod (bez rate limit problema)
        this.authService.checkAndSendVerificationEmail().subscribe({
          next: (res) => {
             if (res.message === 'Email sent') {
               // Možemo prikazati toast ili samo tiho pustiti
               this.startCooldown(60);
             }
          }
        });
      },
      error: () => {
        this.toast.error(this.t('auth.loadUserFailed') || 'Failed to load user info. Please log in again.');
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
        this.toast.success(this.t('auth.verify_success_desc') || 'Tvoj email je uspješno verificiran!');
        this.router.navigate(['/splash']);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.t('auth.invalidCode') || 'Invalid verification code.');
        this.codeForm.get('code')?.setValue('');
      }
    });
  }

  resendEmail() {
    if (this.resendCooldown() > 0) return;
    this.loading.set(true);
    this.authService.resendVerificationEmail().subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success(this.t('auth.codeResent') || 'New code sent to your email!');
        this.startCooldown(60);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 429) {
          this.toast.warning(this.t('auth.tooManyRequests') || 'Please wait a minute before requesting a new code.');
          this.startCooldown(60);
        } else {
          this.toast.error(this.t('auth.resendFailed') || 'Failed to resend code.');
        }
      }
    });
  }

  startCooldown(seconds: number) {
    this.resendCooldown.set(seconds);
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      const current = this.resendCooldown();
      if (current > 0) {
        this.resendCooldown.set(current - 1);
      } else {
        clearInterval(this.intervalId);
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  continueToApp() {
    this.router.navigate(['/splash']); 
  }
}
