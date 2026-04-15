import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { AccountRepository } from '../../../core/repositories/account.repository';
import { API_BASE_URL } from '../../../core/api.config';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-account-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatSelectModule
  ],
  templateUrl: './account-create.component.html',
  styleUrl: './account-create.component.scss',
})
export class AccountCreateComponent implements OnInit {
  accountForm: FormGroup;
  currentUser: User | null = null;

  constructor(
    private fb: FormBuilder,
    private accountRepo: AccountRepository,
    private router: Router,
    private http: HttpClient
  ) {
    this.accountForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      type: ['personal', Validators.required],
      currency: ['EUR', Validators.required],
      balance: [0, [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.http.get<User>(`${API_BASE_URL}/user`).subscribe({
      next: (user) => {
        this.currentUser = user;
      },
      error: (err) => {
        console.error('Failed to fetch user context', err);
      }
    });
  }

  onSubmit(): void {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }

    const payload = {
      name: this.accountForm.value.name,
      type: this.accountForm.value.type,
      currency: this.accountForm.value.currency,
      balance: Number(this.accountForm.value.balance ?? 0),
    };

    this.accountRepo.create(payload).subscribe({
      next: (account) => {
        this.router.navigate(['/accounts', account.id]);
      },
      error: (err) => {
        console.error('Error creating account', err);
      },
    });
  }
}
