import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TransactionRepository } from '../../core/repositories/transaction.repository';
import { Transaction } from '../../core/models/transaction.model';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    RouterLink
  ],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent implements OnInit {
  transactions: Transaction[] = [];

  constructor(private transactionRepo: TransactionRepository) {}

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
}
