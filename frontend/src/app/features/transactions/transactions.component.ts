import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { TransactionRepository } from '../../core/repositories/transaction.repository';
import { ContainerComponent } from '../../core/layout/container/container.component';
import { Transaction } from '../../core/models/transaction.model';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ContainerComponent
  ],
  templateUrl: './transactions.component.html',
})
export class TransactionsComponent implements OnInit {
  private transactionRepo = inject(TransactionRepository);
  private router = inject(Router);
  private translationService = inject(TranslationService);

  transactions: Transaction[] = [];

  ngOnInit() {
    this.loadTransactions();
  }

  loadTransactions() {
    this.transactionRepo.listAll().subscribe({
      next: (list) => {
        this.transactions = list;
      }
    });
  }

  onAddTransaction() {
    this.router.navigate(['/transactions', 'new']);
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }
}
