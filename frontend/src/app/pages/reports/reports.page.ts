import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionRepository } from '../../core/repositories/transaction.repository';
import { WorkspaceService } from '../../core/services/workspace.service';
import { TranslationService } from '../../core/services/translation.service';
import { HeaderComponent } from '../../core/layout/header/header.component';
import { Transaction } from '../../core/models/transaction.model';
import { SyncService } from '../../core/services/sync';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './reports.page.html',
  styleUrl: './reports.page.css'
})
export class ReportsPage implements OnInit {
  private transactionRepo = inject(TransactionRepository);
  private workspaceService = inject(WorkspaceService);
  private translation = inject(TranslationService);
  private syncService = inject(SyncService);

  t = this.translation.translate.bind(this.translation);

  // States
  isLoading = signal<boolean>(true);
  allTransactions = signal<Transaction[]>([]);
  
  // Filters
  startDate = signal<string>('');
  endDate = signal<string>('');
  selectedProject = signal<number | null>(null);
  selectedCategory = signal<number | null>(null);

  // Lists for dropdowns
  projects = computed(() => {
    const txs = this.allTransactions();
    const projMap = new Map<number, { id: number, name: string }>();
    txs.forEach(t => {
      if (t.project) {
        projMap.set(t.project.id, t.project);
      }
    });
    return Array.from(projMap.values());
  });
  
  categories = computed(() => {
    const txs = this.allTransactions();
    const catMap = new Map<number, { id: number, name: string }>();
    txs.forEach(t => {
      if (t.category) {
        catMap.set(t.category.id, t.category);
      }
    });
    return Array.from(catMap.values());
  });

  // Filtered transactions
  filteredTransactions = computed(() => {
    let txs = this.allTransactions();

    if (this.startDate()) {
      const start = new Date(this.startDate());
      txs = txs.filter(t => new Date(t.date) >= start);
    }

    if (this.endDate()) {
      const end = new Date(this.endDate());
      end.setHours(23, 59, 59, 999);
      txs = txs.filter(t => new Date(t.date) <= end);
    }

    if (this.selectedProject()) {
      txs = txs.filter(t => t.projectId === this.selectedProject());
    }

    if (this.selectedCategory()) {
      txs = txs.filter(t => t.categoryId === this.selectedCategory());
    }

    return txs;
  });

  // Calculations
  totalIncome = computed(() => {
    return this.filteredTransactions()
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  });

  totalExpense = computed(() => {
    return this.filteredTransactions()
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  });

  balance = computed(() => this.totalIncome() - this.totalExpense());

  ngOnInit() {
    this.loadTransactions();
    
    // Default to this month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    this.startDate.set(firstDay.toISOString().split('T')[0]);
    this.endDate.set(lastDay.toISOString().split('T')[0]);

    // Osvježi kad se dogodi sinkronizacija
    this.syncService.syncCompleted$.subscribe(() => {
      this.loadTransactions();
    });
  }

  loadTransactions() {
    this.isLoading.set(true);
    this.transactionRepo.listAll().subscribe({
      next: (txs) => {
        this.allTransactions.set(txs);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load transactions for reports', err);
        this.isLoading.set(false);
      }
    });
  }

  exportToCsv() {
    const txs = this.filteredTransactions();
    if (txs.length === 0) return;

    // CSV Headers
    const headers = ['Datum', 'Tip', 'Iznos', 'Kategorija', 'Projekt', 'Opis'];
    
    const rows = txs.map(t => {
      const date = new Date(t.date).toLocaleDateString('hr-HR');
      const type = t.type === 'income' ? 'Prihod' : 'Rashod';
      const amount = Number(t.amount).toFixed(2);
      const cat = t.category?.name || '';
      const proj = t.project?.name || '';
      const desc = t.description ? t.description.replace(/"/g, '""') : '';
      
      return `"${date}","${type}","${amount}","${cat}","${proj}","${desc}"`;
    });

    const csvContent = headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `izvjestaj_${this.startDate()}_${this.endDate()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
