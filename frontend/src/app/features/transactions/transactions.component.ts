import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TransactionRepository } from '../../core/repositories/transaction.repository';
import { ContainerComponent } from '../../core/layout/container/container.component';
import { ButtonComponent } from '../../shared/button/button.component';
import { Transaction } from '../../core/models/transaction.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    ContainerComponent,
    ButtonComponent
  ],
  templateUrl: './transactions.component.html',
})
export class TransactionsComponent implements OnInit {
  transactions: Transaction[] = [];

  constructor(private transactionRepo: TransactionRepository, private router: Router) {}

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
}
