import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { API_BASE_URL } from '../../../core/api.config';
import { AuthService } from '../../../core/services/auth.service';
import {NgIf} from '@angular/common';

interface RegisterResponse {
  token: string;
  user: { id: number; name: string; email: string };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    RouterLink,
    NgIf,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      passwordConfirm: ['', [Validators.required]],
    }, { validators: this.passwordsMatchValidator });
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

    const { name, email, password } = this.form.value;

    this.http.post<RegisterResponse>(
      `${API_BASE_URL}/register`,
      { name, email, password },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    ).subscribe({
      next: (res) => {
        this.loading = false;
        // automatski login nakon registracije
        this.auth.setToken(res.token);
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = 'Registration failed. Please check your data.';
        console.error('Register failed', err);
      },
    });
  }
}
