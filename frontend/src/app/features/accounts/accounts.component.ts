import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AccountRepository } from '../../core/repositories/account.repository';
import { Account } from '../../core/models/account.model';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './accounts.component.html',
  styleUrl: './accounts.component.scss',
})
export class AccountsComponent implements OnInit {
  accounts: Account[] = [];
  loading = true;

  // Currency symbol mapping
  private readonly currencySymbols: { [key: string]: string } = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    JPY: '¥',
    CHF: 'Fr',
    CAD: 'C$',
    AUD: 'A$',
    HRK: 'kn',
  };

  constructor(
    private accountRepo: AccountRepository,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.loading = true;
    this.accountRepo.listForCurrentUser().subscribe({
      next: (accounts: Account[]) => {
        this.accounts = accounts;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading accounts:', err);
        this.loading = false;
      },
    });
  }

  getCurrencySymbol(currency: string): string {
    return this.currencySymbols[currency] || currency;
  }

  goToCreate(): void {
    this.router.navigate(['/accounts', 'new']);
  }

  goToDetail(account: Account): void {
    this.router.navigate(['/accounts', account.id]);
  }
}
