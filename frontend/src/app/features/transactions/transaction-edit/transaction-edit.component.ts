import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { AccountRepository } from '../../../core/repositories/account.repository';
import { TransactionRepository } from '../../../core/repositories/transaction.repository';
import { Account } from '../../../core/models/account.model';
import { Transaction, TransactionType } from '../../../core/models/transaction.model';
import { NavigationService } from '../../../core/services/navigation.service';

@Component({
  selector: 'app-transaction-edit',
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
  templateUrl: './transaction-edit.component.html',
  styleUrl: './transaction-edit.component.scss',
})
export class TransactionEditComponent implements OnInit {
  form!: FormGroup;
  loading = true;
  submitting = false;
  errorMessage: string | null = null;

  accounts: Account[] = [];
  transaction!: Transaction;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private accountRepo: AccountRepository,
    private txRepo: TransactionRepository,
    private navigation: NavigationService,
  ) {}

  ngOnInit(): void {
    const txIdParam = this.route.snapshot.paramMap.get('id');
    const txId = Number(txIdParam);

    if (!txId) {
      this.navigation.back();
      return;
    }

    this.form = this.fb.group({
      accountId: [null, Validators.required],
      type: ['expense' as TransactionType, Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      datetime: ['', Validators.required],
      description: [''],
    });

    // 1) dohvati transakciju
    this.txRepo.getById(txId).subscribe({
      next: tx => {
        this.transaction = tx;

        // 2) dohvati račune
        this.accountRepo.listForCurrentUser().subscribe({
          next: accounts => {
            this.accounts = accounts;

            this.form.patchValue({
              accountId: tx.accountId,
              type: tx.type,
              amount: tx.amount,
              datetime: this.toLocalInputValue(tx.date),
              description: tx.description ?? '',
            });

            this.loading = false;
          },
          error: err => {
            console.error('Failed to load accounts', err);
            this.errorMessage = 'Failed to load accounts.';
            this.loading = false;
          },
        });
      },
      error: err => {
        console.error('Failed to load transaction', err);
        this.errorMessage = 'Failed to load transaction.';
        this.loading = false;
      },
    });
  }

  private toLocalInputValue(dateStr: string): string {
    const d = new Date(dateStr);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  cancel(): void {
    this.navigation.back();
  }

  submit(): void {
    if (this.form.invalid || this.submitting) return;

    this.submitting = true;
    this.errorMessage = null;

    const value = this.form.value;
    const isoDate = new Date(value.datetime).toISOString();

    const payload: Partial<Transaction> = {
      type: value.type as TransactionType,
      amount: Number(value.amount),
      date: isoDate,
      description: value.description || null,
    };

    const accountId = Number(value.accountId);

    this.txRepo.update(accountId, this.transaction.id, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.navigation.back();
      },
      error: err => {
        console.error('Failed to update transaction', err);
        this.errorMessage = 'Failed to update transaction.';
        this.submitting = false;
      },
    });
  }
}
