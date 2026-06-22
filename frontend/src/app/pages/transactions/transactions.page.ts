import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TransactionRepository } from '../../core/repositories/transaction.repository';
import { AccountRepository } from '../../core/repositories/account.repository';
import { ProjectRepository } from '../../core/repositories/project.repository';
import { TranslationService } from '../../core/services/translation.service';
import { AppInitializerService } from '../../core/services/app-initializer';
import { LoadingService } from '../../core/services/loading/loading.service';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { Transaction } from '../../core/models/transaction.model';
import { Account } from '../../core/models/account.model';
import { TransactionModalService } from '../../core/services/transaction-modal.service';
import { SyncService } from '../../core/services/sync';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './transactions.page.html',
})
export class TransactionsPage implements OnInit {
  private transactionRepo = inject(TransactionRepository);
  private translationService = inject(TranslationService);
  private appInitializer = inject(AppInitializerService);
  private toastService = inject(ToastService);
  private workspaceService = inject(WorkspaceService);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private transactionModalService = inject(TransactionModalService);
  private syncService = inject(SyncService);

  transactions = signal<Transaction[]>([]);
  isOnline = signal<boolean>(true);
  isLoading = signal<boolean>(false);

  // Search & Filter State
  searchQuery = signal<string>('');
  activeFilter = signal<'all' | 'income' | 'expense'>('all');

  // Filtered transactions computed signal
  filteredTransactions = computed(() => {
    let list = this.transactions();
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.activeFilter();

    if (filter === 'income') {
      list = list.filter(tx => tx.type === 'income');
    } else if (filter === 'expense') {
      list = list.filter(tx => tx.type === 'expense');
    }

    if (query) {
      list = list.filter(tx => 
        (tx.description && tx.description.toLowerCase().includes(query)) ||
        (tx.amount.toString().includes(query)) ||
        (tx.category && tx.category.name.toLowerCase().includes(query))
      );
    }

    return list;
  });

  ngOnInit() {
    this.isOnline.set(this.appInitializer.isOnlineMode);
    this.loadData();

    // Check query params to open modal
    this.route.queryParams.subscribe((params: any) => {
      if (params['action'] === 'new') {
        setTimeout(() => this.transactionModalService.openModal(), 100);
      }
    });

    // Refresh when modal says saved
    this.transactionModalService.saved$.subscribe(() => {
      this.loadData();
    });

    // Refresh when offline sync finishes
    this.syncService.syncCompleted$.subscribe(() => {
      this.loadData();
    });
  }

  get isMainNav(): boolean {
    try {
      const prefs = JSON.parse(localStorage.getItem('nav_preferences') || '[]');
      return prefs.includes('transactions');
    } catch {
      return false;
    }
  }

  get currentUserId(): number | null {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.id || null;
    } catch {
      return null;
    }
  }

  activeWorkspace = this.workspaceService.activeWorkspace;

  t(key: string): string {
    return this.translationService.translate(key) || key.split('.').pop() || key;
  }

  goBack() {
    this.location.back();
  }

  loadData() {
    this.isLoading.set(true);
    
    this.transactionRepo.listAll().subscribe({
      next: (txs) => {
        this.transactions.set(txs);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toastService.error(this.t('transactions.loadFailed'));
      }
    });
  }

  getTransactionStatus(tx: Transaction): string {
    if (tx.id < 0) {
      return this.t('transactions.statusQueued') || 'Queued Offline';
    }
    const txTime = new Date(tx.date).getTime();
    const now = Date.now();
    if (txTime > now) {
      return this.t('transactions.statusFuture') || 'Future';
    }
    return this.t('transactions.statusSettled') || 'Settled';
  }

  isFuture(tx: Transaction): boolean {
    if (!tx || !tx.date) return false;
    return new Date(tx.date).getTime() > Date.now();
  }

  formatAmount(amount: number | string): string {
    const val = typeof amount === 'string' ? parseFloat(amount) : amount;
    return val.toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Helper to group transactions by date for header rendering
  getGroupHeader(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return this.t('common.today') || 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return this.t('common.yesterday') || 'Yesterday';
    } else {
      const locale = this.translationService.currentLang() === 'hr' ? 'hr-HR' : 'en-US';
      return date.toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' });
    }
  }

  getGroupedTransactions() {
    const list = this.filteredTransactions();
    const groups: { dateHeader: string; items: Transaction[] }[] = [];

    list.forEach(tx => {
      const header = this.getGroupHeader(tx.date);
      let group = groups.find(g => g.dateHeader === header);
      if (!group) {
        group = { dateHeader: header, items: [] };
        groups.push(group);
      }
      group.items.push(tx);
    });

    return groups;
  }

  setFilter(filter: 'all' | 'income' | 'expense') {
    this.activeFilter.set(filter);
  }

  openTxModal(tx: Transaction | null = null) {
    this.transactionModalService.openModal(tx);
  }
}

