import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { AccountRepository } from '../../core/repositories/account.repository';
import { Account } from '../../core/models/account.model';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ContainerComponent } from '../../core/layout/container/container.component';
import { ButtonComponent } from '../../shared/button/button.component';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatCardModule,
    // Shared components
    ContainerComponent,
    ButtonComponent
  ],
  templateUrl: './accounts.component.html',
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
    private snackBar: MatSnackBar
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

  setPrimary(id: number): void {
    this.accountRepo.setPrimary(id).subscribe({
      next: () => {
        this.snackBar.open('Primary account updated', 'Close', { duration: 3000 });
        this.loadAccounts();
      }
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

  goToEdit(account: Account): void {
    this.router.navigate(['/accounts', account.id, 'edit']);
  }
}
