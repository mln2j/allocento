import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.page.html',
})
export class RegisterPage implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private translationService = inject(TranslationService);

  form: FormGroup;
  loading = false;
  errorMessage: string | null = null;
  loaded = false;

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      passwordConfirm: ['', [Validators.required]],
    }, { validators: this.passwordsMatchValidator });
  }

  ngOnInit() {
    setTimeout(() => { this.loaded = true; }, 50);
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  private passwordsMatchValidator(group: FormGroup) {
    const pass = group.get('password')?.value;
    const confirm = group.get('passwordConfirm')?.value;
    return pass === confirm ? null : { passwordsMismatch: true };
  }

  submit(): void {
    if (this.form.invalid || this.loading) return;

    this.loading = true;
    this.errorMessage = null;

    this.auth.register(this.form.value).subscribe({
      next: () => {
        // Redirekcija na splash kako bi AppInitializerService povukao novi user profile
        // i usmjerio korisnika na email verification
        window.location.href = '/splash';
      },
      error: () => {
        this.loading = false;
        this.errorMessage = this.t('auth.registrationFailed');
      }
    });
  }
}
