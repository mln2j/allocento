import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { AccountRepository } from '../../../core/repositories/account.repository';
import { TransactionRepository } from '../../../core/repositories/transaction.repository';
import { Account } from '../../../core/models/account.model';
import { TransactionType } from '../../../core/models/transaction.model';
import { NavigationService } from '../../../core/services/navigation.service';
import { ContainerComponent } from '../../../core/layout/container/container.component';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-transaction-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ContainerComponent
  ],
  templateUrl: './transaction-create.component.html',
})
export class TransactionCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private accountRepo = inject(AccountRepository);
  private txRepo = inject(TransactionRepository);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private navigation = inject(NavigationService);
  private translationService = inject(TranslationService);

  form!: FormGroup;
  submitting = false;
  errorMessage: string | null = null;

  accounts: Account[] = [];
  defaultAccountId: number | null = null;

  ngOnInit(): void {
    this.form = this.fb.group({
      accountId: [null, Validators.required],
      type: ['expense' as TransactionType, Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      datetime: [this.nowLocal(), Validators.required],
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
      },
      error: err => {
        console.error('Failed to load accounts', err);
        this.errorMessage = 'Failed to load accounts.';
      },
    });
  }

  private nowLocal(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`; // za input[type=datetime-local]
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

    const payload = {
      type: value.type as TransactionType,
      amount: Number(value.amount),
      date: isoDate,
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

  t(key: string): string {
    return this.translationService.translate(key);
  }
}
