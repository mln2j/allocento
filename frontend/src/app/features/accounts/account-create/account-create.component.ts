import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AccountRepository, AccountCreatePayload } from '../../../core/repositories/account.repository';
import { API_BASE_URL } from '../../../core/api.config';
import { User } from '../../../core/models/user.model';

type AccountType = 'personal' | 'household' | 'organization';

interface AccountCreateForm {
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
}

@Component({
  selector: 'app-account-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './account-create.component.html',
  styleUrl: './account-create.component.scss',
})
export class AccountCreateComponent implements OnInit {
  isSubmitting = false;
  isLoadingUser = true;
  form: FormGroup;
  
  householdAvailable = false;
  organizationAvailable = false;

  constructor(
    private fb: FormBuilder,
    private accountRepo: AccountRepository,
    private router: Router,
    private http: HttpClient
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      type: ['personal', Validators.required],
      currency: ['EUR', Validators.required],
      balance: [0, [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.http.get<User>(`${API_BASE_URL}/user`).subscribe({
      next: (user) => {
        this.householdAvailable = !!user.household_id;
        this.organizationAvailable = !!user.organization_id;
        this.isLoadingUser = false;
      },
      error: (err) => {
        console.error('Failed to fetch user context', err);
        this.isLoadingUser = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const value = this.form.value as AccountCreateForm;

    const payload: AccountCreatePayload = {
      name: value.name,
      type: value.type,
      currency: value.currency,
      balance: Number(value.balance ?? 0),
    };

    this.accountRepo.create(payload).subscribe({
      next: (account) => {
        this.isSubmitting = false;
        this.router.navigate(['/accounts', account.id]);
      },
      error: (err) => {
        console.error('Error creating account', err);
        this.isSubmitting = false;
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/accounts']);
  }
}
