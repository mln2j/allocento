import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { AccountRepository } from '../../../core/repositories/account.repository';
import { TransactionRepository } from '../../../core/repositories/transaction.repository';
import { Account } from '../../../core/models/account.model';
import { TransactionType } from '../../../core/models/transaction.model';
import { NavigationService } from '../../../core/services/navigation.service';

@Component({
  selector: 'app-transaction-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
  ],
  templateUrl: './transaction-create.component.html',
  styleUrl: './transaction-create.component.scss',
})
export class TransactionCreateComponent implements OnInit {
  form!: FormGroup;
  loading = true;
  submitting = false;
  errorMessage: string | null = null;

  accounts: Account[] = [];
  defaultAccountId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private accountRepo: AccountRepository,
    private txRepo: TransactionRepository,
    private router: Router,
    private route: ActivatedRoute,
    private navigation: NavigationService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      accountId: [null, Validators.required],
      type: ['expense' as TransactionType, Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      date: [this.today(), Validators.required],
      description: [''],
    });

    const accountIdFromQuery = this.route.snapshot.queryParamMap.get('accountId');
    this.defaultAccountId = accountIdFromQuery ? Number(accountIdFromQuery) : null;

    this.accountRepo.listForCurrentUser().subscribe({
      next: accounts => {
        this.accounts = accounts;

        const defaultId = this.defaultAccountId ?? (accounts[0]?.id ?? null);
        if (defaultId !== null) {
          this.form.get('accountId')?.setValue(defaultId);
        }

        this.loading = false;
      },
      error: err => {
        console.error('Failed to load accounts', err);
        this.errorMessage = 'Failed to load accounts.';
        this.loading = false;
      },
    });
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  cancel(): void {
    this.navigation.back();
  }

  submit(): void {
    if (this.form.invalid || this.submitting) return;

    this.submitting = true;
    this.errorMessage = null;

    const value = this.form.value;
    const payload = {
      type: value.type,
      amount: Number(value.amount),
      date: value.date,
      description: value.description || null,
    };

    const accountId = Number(value.accountId);

    this.txRepo.create(accountId, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.navigation.back();
      },
      error: err => {
        console.error('Failed to create transaction', err);
        this.errorMessage = 'Failed to create transaction.';
        this.submitting = false;
      },
    });
  }
}
