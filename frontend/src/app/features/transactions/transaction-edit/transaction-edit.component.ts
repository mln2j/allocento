import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { AccountRepository } from '../../../core/repositories/account.repository';
import { TransactionRepository } from '../../../core/repositories/transaction.repository';
import { Account } from '../../../core/models/account.model';
import { Transaction, TransactionType } from '../../../core/models/transaction.model';
import { NavigationService } from '../../../core/services/navigation.service';
import { ContainerComponent } from '../../../core/layout/container/container.component';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-transaction-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ContainerComponent
  ],
  templateUrl: './transaction-edit.component.html',
})
export class TransactionEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private accountRepo = inject(AccountRepository);
  private txRepo = inject(TransactionRepository);
  private navigation = inject(NavigationService);
  private translationService = inject(TranslationService);

  form!: FormGroup;
  submitting = false;
  errorMessage: string | null = null;

  accounts: Account[] = [];
  transaction!: Transaction;

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
      amount: [null, [Validators.required, Validators.min(0.01)]],
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
          },
          error: err => {
            console.error('Failed to load accounts', err);
            this.errorMessage = 'Failed to load accounts.';
          },
        });
      },
      error: err => {
        console.error('Failed to load transaction', err);
        this.errorMessage = 'Failed to load transaction.';
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

  deleteTransaction(): void {
    if (confirm('Delete this transaction?')) {
      this.submitting = true;
      this.txRepo.delete(this.transaction.accountId, this.transaction.id).subscribe({
        next: () => {
          this.submitting = false;
          this.navigation.back();
        },
        error: err => {
          console.error('Failed to delete transaction', err);
          this.errorMessage = 'Failed to delete transaction.';
          this.submitting = false;
        }
      });
    }
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }
}
