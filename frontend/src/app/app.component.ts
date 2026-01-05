import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AddTransactionDialogComponent } from './shared/add-transaction-dialog/add-transaction-dialog.component';
import { TransactionRepository } from './core/repositories/transaction.repository';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'Allocento';

  constructor(
    private dialog: MatDialog,
    private transactionRepo: TransactionRepository,
  ) {}

  onAddTransaction() {
    const ref = this.dialog.open(AddTransactionDialogComponent, {
      width: '400px',
      maxWidth: '95vw',
      data: { defaultType: 'expense' },
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;

      const { accountId, type, amount, description } = result;

      this.transactionRepo.create(accountId, {
        accountId,
        type,
        amount,
        date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
        description,
      }).subscribe({
        next: (tx) => {
          console.log('Created transaction', tx);
          // TODO: refresh dashboard/accounts
        },
        error: (err) => {
          console.error('Failed to create transaction', err);
        }
      });
    });
  }
}
