import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AccountRepository } from '../../core/repositories/account.repository';
import { Account } from '../../core/models/account.model';
import { ContainerComponent } from '../../core/layout/container/container.component';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [
    CommonModule,
    ContainerComponent
  ],
  templateUrl: './accounts.component.html',
})
export class AccountsComponent implements OnInit {
  private accountRepo = inject(AccountRepository);
  private router = inject(Router);
  private translationService = inject(TranslationService);

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

  t(key: string): string {
    return this.translationService.translate(key);
  }
}
