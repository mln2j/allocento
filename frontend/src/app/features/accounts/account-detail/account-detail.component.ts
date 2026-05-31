import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccountRepository } from '../../../core/repositories/account.repository';
import { TransactionRepository } from '../../../core/repositories/transaction.repository';
import { Account } from '../../../core/models/account.model';
import { Transaction } from '../../../core/models/transaction.model';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-account-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
  ],
  templateUrl: './account-detail.component.html',
})
export class AccountDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private accountRepo = inject(AccountRepository);
  private txRepo = inject(TransactionRepository);
  private translationService = inject(TranslationService);

  account: Account | null = null;
  loadingAccount = true;

  transactions: Transaction[] = [];
  loadingTransactions = true;

  private accountId!: number;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/accounts']);
      return;
    }

    this.accountId = id;
    this.loadAccount(id);
    this.loadTransactions(id);
  }

  private loadAccount(id: number): void {
    this.loadingAccount = true;

    this.accountRepo.listForCurrentUser().subscribe({
      next: accounts => {
        this.account = accounts.find(a => a.id === id) ?? null;
        this.loadingAccount = false;
        if (!this.account) {
          this.router.navigate(['/accounts']);
        }
      },
      error: err => {
        console.error('Error loading account', err);
        this.loadingAccount = false;
        this.router.navigate(['/accounts']);
      },
    });
  }

  private loadTransactions(accountId: number): void {
    this.loadingTransactions = true;
    this.txRepo.listForAccount(accountId).subscribe({
      next: txs => {
        this.transactions = [...txs].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        this.loadingTransactions = false;
      },
      error: err => {
        console.error('Error loading transactions', err);
        this.loadingTransactions = false;
      },
    });
  }

  getCurrencySymbol(currency: string): string {
    const map: Record<string, string> = {
      EUR: '€',
      USD: '$',
      GBP: '£',
      JPY: '¥',
      CHF: 'Fr',
      CAD: 'C$',
      AUD: 'A$',
      HRK: 'kn',
    };
    return map[currency] ?? currency;
  }

  onBack(): void {
    this.router.navigate(['/accounts']);
  }

  onDeleteAccount(): void {
    if (!this.account) return;

    const message = `Are you sure you want to delete account "${this.account.name}"?`;
    if (confirm(message)) {
      this.accountRepo.delete(this.account.id).subscribe({
        next: () => {
          this.router.navigate(['/accounts']);
        },
        error: err => console.error('Error deleting account', err),
      });
    }
  }

  onDeleteTransaction(tx: Transaction): void {
    if (!this.account) return;

    const message = 'Are you sure you want to delete this transaction?';
    if (confirm(message)) {
      this.txRepo.delete(this.account.id, tx.id).subscribe({
        next: () => {
          this.loadAccount(this.accountId);
          this.loadTransactions(this.accountId);
        },
        error: err => console.error('Error deleting transaction', err),
      });
    }
  }

  onEditAccount(): void {
    this.router.navigate(['/accounts', this.account!.id, 'edit']);
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }
}
