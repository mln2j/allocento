import { Component, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.page.html',
})
export class LoginPage implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private translationService = inject(TranslationService);

  loaded = false;
  form: FormGroup;
  loading = false;
  errorMessage: string | null = null;

  constructor() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  ngOnInit() {
    setTimeout(() => {
      this.loaded = true;
    }, 50);
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  submit(): void {
    if (this.form.invalid || this.loading) return;

    this.loading = true;
    this.errorMessage = null;

    this.auth.login(this.form.value.email, this.form.value.password).subscribe({
      next: () => {
        window.location.href = this.route.snapshot.queryParamMap.get('returnUrl') || '/splash';
      },
      error: () => {
        this.loading = false;
        this.errorMessage = this.t('auth.invalidCredentials');
      }
    });
  }
}
