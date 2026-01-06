import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AccountRepository } from '../../../core/repositories/account.repository';
import { TransactionRepository } from '../../../core/repositories/transaction.repository';
import { Account } from '../../../core/models/account.model';
import { Transaction } from '../../../core/models/transaction.model';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-account-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  templateUrl: './account-detail.component.html',
  styleUrl: './account-detail.component.scss',
})
export class AccountDetailComponent implements OnInit {
  account: Account | null = null;
  loadingAccount = true;

  transactions: Transaction[] = [];
  loadingTransactions = true;

  private accountId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountRepo: AccountRepository,
    private txRepo: TransactionRepository,
    private dialog: MatDialog,
  ) {}

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

    const data: ConfirmDialogData = {
      title: 'Delete account',
      message: `Are you sure you want to delete account "${this.account.name}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
    };

    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        maxWidth: '400px',
        data,
      },
    );

    ref.afterClosed().subscribe(result => {
      if (!result) return;

      this.accountRepo.delete(this.account!.id).subscribe({
        next: () => {
          this.router.navigate(['/accounts']);
        },
        error: err => console.error('Error deleting account', err),
      });
    });
  }

  onDeleteTransaction(tx: Transaction): void {
    if (!this.account) return;

    const data: ConfirmDialogData = {
      title: 'Delete transaction',
      message: 'Are you sure you want to delete this transaction?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    };

    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        maxWidth: '400px',
        data,
      },
    );

    ref.afterClosed().subscribe(result => {
      if (!result) return;

      this.txRepo.delete(this.account!.id, tx.id).subscribe({
        next: () => {
          this.loadAccount(this.accountId);
          this.loadTransactions(this.accountId);
        },
        error: err => console.error('Error deleting transaction', err),
      });
    });
  }

  onEditAccount(): void {
    this.router.navigate(['/accounts', this.account!.id, 'edit']);
  }
}
