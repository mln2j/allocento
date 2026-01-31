import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { AccountRepository, AccountUpdatePayload } from '../../../core/repositories/account.repository';
import { Account } from '../../../core/models/account.model';
import { User } from '../../../core/models/user.model';
import { API_BASE_URL } from '../../../core/api.config';
import { forkJoin } from 'rxjs';

type AccountType = 'personal' | 'household' | 'organization';

@Component({
  selector: 'app-account-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule
  ],
  templateUrl: './account-edit.component.html',
  styleUrl: './account-edit.component.scss',
})
export class AccountEditComponent implements OnInit {
  form!: FormGroup;
  isLoading = true;
  isSubmitting = false;
  accountId!: number;
  
  householdAvailable = false;
  organizationAvailable = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private accountRepo: AccountRepository,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      type: ['personal' as AccountType, Validators.required],
      currency: ['EUR', Validators.required],
      balance: [0, [Validators.required]],
    });

    const idFromRoute = this.route.snapshot.paramMap.get('id');
    this.accountId = Number(idFromRoute);

    if (!this.accountId) {
      this.router.navigate(['/accounts']);
      return;
    }

    // Load both account and user data in parallel
    forkJoin({
      account: this.accountRepo.getById(this.accountId),
      user: this.http.get<User>(`${API_BASE_URL}/user`)
    }).subscribe({
      next: (data) => {
        const { account, user } = data;
        
        this.householdAvailable = !!user.household_id;
        this.organizationAvailable = !!user.organization_id;

        this.form.patchValue({
          name: account.name,
          type: account.type,
          currency: account.currency,
          balance: account.balance,
        });
        
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.router.navigate(['/accounts']);
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const value = this.form.value;

    const payload: AccountUpdatePayload = {
      name: value.name,
      type: value.type,
      currency: value.currency,
      balance: Number(value.balance),
    };

    this.accountRepo.update(this.accountId, payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/accounts', this.accountId]);
      },
      error: () => {
        this.isSubmitting = false;
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/accounts', this.accountId]);
  }
}
