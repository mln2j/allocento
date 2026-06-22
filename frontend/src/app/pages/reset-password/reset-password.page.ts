import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.html'
})
export class ResetPassword implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  token = '';
  email = '';

  form: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  loading = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      this.email = params['email'] || '';
    });
  }

  submit() {
    if (this.form.invalid || !this.token || !this.email) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = {
      token: this.token,
      email: this.email,
      password: this.form.value.password,
    };

    this.authService.resetPassword(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.successMessage.set('Lozinka uspješno promijenjena!');
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Neuspješna promjena lozinke. Link je možda istekao.');
      }
    });
  }
}
