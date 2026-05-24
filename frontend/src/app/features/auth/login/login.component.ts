import {Component, inject, OnInit} from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
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
    // Mali delay za efekt animacije
    setTimeout(() => {
      this.loaded = true;
    }, 50);
  }

  // Funkcija za dohvat prijevoda identična onoj u ErrorComponent
  t(key: string): string {
    return this.translationService.translate(key);
  }

  submit(): void {
    if (this.form.invalid || this.loading) return;

    this.loading = true;
    this.errorMessage = null;

    this.auth.login(this.form.value.email, this.form.value.password).subscribe({
      next: () => {
        this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard');
      },
      error: () => {
        this.loading = false;
        // Prevedena poruka greške
        this.errorMessage = this.t('auth.invalidCredentials');
      }
    });
  }
}
