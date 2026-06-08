import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TransactionRepository } from '../../core/repositories/transaction.repository';
import { AccountRepository } from '../../core/repositories/account.repository';
import { TranslationService } from '../../core/services/translation.service';
import { AppInitializerService } from '../../core/services/app-initializer';
import { LoadingService } from '../../core/services/loading/loading.service';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';
import { Transaction } from '../../core/models/transaction.model';
import { Account } from '../../core/models/account.model';
import { ModalComponent } from '../../shared/modal/modal.component';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ModalComponent],
  templateUrl: './transactions.page.html',
})
export class TransactionsPage implements OnInit {
  private transactionRepo = inject(TransactionRepository);
  private accountRepo = inject(AccountRepository);
  private translationService = inject(TranslationService);
  private appInitializer = inject(AppInitializerService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);
  private fb = inject(FormBuilder);

  transactions = signal<Transaction[]>([]);
  accounts = signal<Account[]>([]);
  isOnline = signal<boolean>(true);

  // Search & Filter State
  searchQuery = signal<string>('');
  activeFilter = signal<'all' | 'income' | 'expense'>('all');

  // Expanded details tracking
  expandedTxId = signal<number | null>(null);

  // Modal form state
  isModalOpen = false;
  isSaving = false;
  transactionForm!: FormGroup;
  editingTxId: number | null = null;
  isAccountDropdownOpen = false;

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
    this.initForm();
    this.loadData();
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  initForm() {
    this.transactionForm = this.fb.group({
      accountId: ['', [Validators.required]],
      type: ['expense', [Validators.required]],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      date: [new Date().toISOString().substring(0, 16), [Validators.required]],
      description: ['', [Validators.maxLength(255)]]
    });
  }

  loadData() {
    this.loadingService.show();
    
    // Load accounts list for selector dropdown
    this.accountRepo.listForCurrentUser().subscribe({
      next: (accs) => {
        this.accounts.set(accs);
        
        // Default to primary account if available
        const primary = accs.find(a => a.is_primary) || accs[0];
        if (primary && !this.editingTxId) {
          this.transactionForm.get('accountId')?.setValue(primary.id);
        }
      }
    });

    // Load transactions list
    this.transactionRepo.listAll().subscribe({
      next: (data) => {
        this.transactions.set(data);
        this.loadingService.hide();
      },
      error: (err) => {
        this.loadingService.hide();
        console.error('Failed to load transactions:', err);
        this.toastService.error(this.t('transactions.loadFailed') || 'Failed to load transactions.');
      }
    });
  }

  toggleTx(txId: number) {
    if (this.expandedTxId() === txId) {
      this.expandedTxId.set(null);
    } else {
      this.expandedTxId.set(txId);
    }
  }

  setFilter(filter: 'all' | 'income' | 'expense') {
    this.activeFilter.set(filter);
  }

  openCreateModal() {
    this.editingTxId = null;
    const primary = this.accounts().find(a => a.is_primary) || this.accounts()[0];
    this.transactionForm.reset({
      accountId: primary ? primary.id : '',
      type: 'expense',
      amount: 0,
      date: new Date().toISOString().substring(0, 16),
      description: ''
    });
    this.isModalOpen = true;
  }

  openEditModal(tx: Transaction, event: Event) {
    event.stopPropagation();
    this.editingTxId = tx.id;

    // Format date for datetime-local input YYYY-MM-DDTHH:MM
    const d = new Date(tx.date);
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    const dateStr = localDate.toISOString().substring(0, 16);

    this.transactionForm.reset({
      accountId: tx.accountId,
      type: tx.type,
      amount: tx.amount,
      date: dateStr,
      description: tx.description
    });
    this.isModalOpen = true;
  }

  deleteTransaction(tx: Transaction, event: Event) {
    event.stopPropagation();
    this.dialogService.confirm(
      this.t('transactions.deleteTitle') || 'Delete Transaction',
      this.t('transactions.deleteConfirm') || 'Are you sure you want to delete this transaction?',
      this.t('common.delete') || 'Delete',
      this.t('common.cancel') || 'Cancel'
    ).subscribe(confirmed => {
      if (!confirmed) return;

      this.loadingService.show();
      this.transactionRepo.delete(tx.accountId, tx.id).subscribe({
        next: () => {
          this.toastService.success(this.t('transactions.deleteSuccess') || 'Transaction deleted successfully!');
          this.loadData();
        },
        error: (err) => {
          this.loadingService.hide();
          this.toastService.error(err.error?.message || this.t('transactions.deleteFailed') || 'Failed to delete transaction.');
        }
      });
    });
  }

  closeModal() {
    this.isModalOpen = false;
    this.isAccountDropdownOpen = false;
  }

  toggleAccountDropdown() {
    this.isAccountDropdownOpen = !this.isAccountDropdownOpen;
  }

  selectAccount(accId: number) {
    this.transactionForm.get('accountId')?.setValue(accId);
    this.isAccountDropdownOpen = false;
  }

  getSelectedAccountName(): string {
    const id = this.transactionForm.get('accountId')?.value;
    const acc = this.accounts().find(a => a.id === id);
    return acc ? acc.name : (this.t('transactions.selectAccount') || 'Select Account');
  }

  setTxType(type: 'income' | 'expense') {
    this.transactionForm.get('type')?.setValue(type);
  }

  saveTransaction() {
    if (this.transactionForm.invalid || this.isSaving) return;
    this.isSaving = true;

    const payload = this.transactionForm.value;
    const accId = payload.accountId;

    if (this.editingTxId) {
      this.transactionRepo.update(accId, this.editingTxId, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.toastService.success(this.t('transactions.updateSuccess') || 'Transaction updated successfully!');
          this.loadData();
        },
        error: (err) => {
          this.isSaving = false;
          this.toastService.error(err.error?.message || this.t('transactions.updateFailed') || 'Failed to update transaction.');
        }
      });
    } else {
      this.transactionRepo.create(accId, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.toastService.success(this.t('transactions.createSuccess') || 'Transaction recorded successfully!');
          this.loadData();
        },
        error: (err) => {
          this.isSaving = false;
          this.toastService.error(err.error?.message || this.t('transactions.createFailed') || 'Failed to record transaction.');
        }
      });
    }
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
}
