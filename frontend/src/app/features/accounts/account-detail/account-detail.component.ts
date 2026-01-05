import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AccountRepository } from '../../../core/repositories/account.repository';
import { TransactionRepository } from '../../../core/repositories/transaction.repository';
import { Account } from '../../../core/models/account.model';
import { Transaction } from '../../../core/models/transaction.model';

@Component({
  selector: 'app-account-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './account-detail.component.html',
  styleUrl: './account-detail.component.scss',
})
export class AccountDetailComponent implements OnInit {
  account: Account | null = null;
  loadingAccount = true;

  transactions: Transaction[] = [];
  loadingTransactions = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountRepo: AccountRepository,
    private txRepo: TransactionRepository,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/accounts']);
      return;
    }

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
        this.transactions = txs;
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

    const confirmed = confirm(`Delete account "${this.account.name}"?`);
    if (!confirmed) return;

    this.accountRepo.delete(this.account.id).subscribe({
      next: () => {
        this.router.navigate(['/accounts']);
      },
      error: err => console.error('Error deleting account', err),
    });
  }

  onDeleteTransaction(tx: Transaction): void {
    if (!this.account) return;

    const confirmed = confirm('Delete this transaction?');
    if (!confirmed) return;

    this.txRepo.delete(this.account.id, tx.id).subscribe({
      next: () => {
        this.transactions = this.transactions.filter(t => t.id !== tx.id);
      },
      error: err => console.error('Error deleting transaction', err),
    });
  }

  onEditAccount(): void {
    // kasnije: /accounts/:id/edit
    // this.router.navigate(['/accounts', this.account!.id, 'edit']);
  }
}
