import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AccountRepository } from '../../core/repositories/account.repository';
import { TranslationService } from '../../core/services/translation.service';
import { AppInitializerService } from '../../core/services/app-initializer';
import { LoadingService } from '../../core/services/loading/loading.service';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';
import { Account, AccountType } from '../../core/models/account.model';
import { ModalComponent } from '../../shared/modal/modal.component';
import { WorkspaceService } from '../../core/services/workspace.service';
import { WorkspaceRepository, Workspace } from '../../core/repositories/workspace.repository';
import { firstValueFrom } from 'rxjs';
import { SelectComponent } from '../../shared/select/select.component';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ModalComponent, RouterModule, SelectComponent],
  templateUrl: './accounts.page.html',
})
export class AccountsPage implements OnInit {
  private accountRepo = inject(AccountRepository);
  private workspaceRepo = inject(WorkspaceRepository);
  private fb = inject(FormBuilder);
  private translationService = inject(TranslationService);
  private appInitializer = inject(AppInitializerService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);
  private workspaceService = inject(WorkspaceService);
  private location = inject(Location);

  accounts = signal<Account[]>([]);
  isOnline = computed(() => this.appInitializer.isOnlineMode);
  totalLiquidBalance = signal<number>(0);
  activeWorkspace = computed(() => this.workspaceService.activeWorkspace());
  isLoading = signal<boolean>(false);

  // Sharing workspaces checklist
  workspacesList = signal<Workspace[]>([]);
  selectedWorkspacesMap: { [id: number]: boolean } = {};
  initialWorkspacesMap: { [id: number]: boolean } = {};

  // Modal State
  isModalOpen = false;
  isTypeDropdownOpen = false;
  isSaving = false;
  accountForm!: FormGroup;
  editingAccountId: number | null = null;
  editingAccount: any = null;
  canManageAccount = true;

  get typeOptions() {
    return [
      { value: 'bank', label: this.t('accounts.types.bank') || 'Bank' },
      { value: 'cash', label: this.t('accounts.types.cash') || 'Cash' }
    ];
  }

  get isMainNav(): boolean {
    try {
      const prefs = JSON.parse(localStorage.getItem('nav_preferences') || '[]');
      return prefs.includes('accounts');
    } catch {
      return false;
    }
  }

  ngOnInit() {
    this.initForm();
    this.loadAccounts();
    this.loadWorkspacesForSharing();
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  goBack() {
    this.location.back();
  }

  initForm() {
    this.accountForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      type: ['bank', [Validators.required]],
      currency: ['EUR', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
      balance: [0, [Validators.required, Validators.min(0)]]
    });
  }

  loadWorkspacesForSharing() {
    if (!this.isOnline()) return;
    this.workspaceRepo.getWorkspaces().subscribe({
      next: (data) => {
        // Only show household/company workspaces as share targets
        this.workspacesList.set(data.filter(ws => ws.type !== 'personal'));
      }
    });
  }

  loadAccounts() {
    this.isLoading.set(true);
    this.accountRepo.listForCurrentUser().subscribe({
      next: (data) => {
        this.accounts.set(data);
        this.calculateTotalBalance(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Failed to load accounts:', err);
        this.toastService.error(this.t('accounts.loadFailed'));
      }
    });
  }

  calculateTotalBalance(list: Account[]) {
    const total = list.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    this.totalLiquidBalance.set(total);
  }

  openCreateModal() {
    if (!this.isOnline()) {
      this.toastService.warning(this.t('accounts.offlineNotice'));
      return;
    }
    this.editingAccountId = null;
    this.editingAccount = null;
    this.selectedWorkspacesMap = {};
    this.initialWorkspacesMap = {};
    this.accountForm.reset({
      name: '',
      type: 'bank',
      currency: 'EUR',
      balance: 0
    });
    this.isModalOpen = true;
  }

  openEditModal(acc: Account) {
    if (!this.isOnline()) {
      this.toastService.warning(this.t('accounts.offlineNotice'));
      return;
    }
    this.editingAccountId = acc.id;
    this.editingAccount = acc;
    
    // Map existing shared workspaces
    const linkedIds = acc.workspaces || [];
    this.selectedWorkspacesMap = {};
    this.initialWorkspacesMap = {};
    this.workspacesList().forEach(ws => {
      const isLinked = linkedIds.includes(ws.id);
      this.selectedWorkspacesMap[ws.id] = isLinked;
      this.initialWorkspacesMap[ws.id] = isLinked;
    });

    this.accountForm.reset({
      name: acc.name,
      type: acc.type,
      currency: acc.currency,
      balance: acc.balance
    });
    
    // Check ownership permissions from backend
    this.canManageAccount = acc.can_manage ?? true;
    if (!this.canManageAccount) {
      this.accountForm.disable(); // Read-only mode
    } else {
      this.accountForm.enable();
    }

    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveAccount() {
    if (this.accountForm.invalid || this.isSaving) return;
    this.isSaving = true;

    const payload = { ...this.accountForm.value };
    payload.balance = this.parseAmount(payload.balance);

    if (this.editingAccountId) {
      // Build sharing sync calls
      const sharePromises: Promise<any>[] = [];
      this.workspacesList().forEach(ws => {
        const isChecked = !!this.selectedWorkspacesMap[ws.id];
        const wasChecked = !!this.initialWorkspacesMap[ws.id];
        if (isChecked && !wasChecked) {
          sharePromises.push(firstValueFrom(this.accountRepo.shareWithWorkspace(String(ws.id), this.editingAccountId!)));
        } else if (!isChecked && wasChecked) {
          sharePromises.push(firstValueFrom(this.accountRepo.unshareFromWorkspace(String(ws.id), this.editingAccountId!)));
        }
      });

      this.accountRepo.update(this.editingAccountId, payload).subscribe({
        next: async () => {
          try {
            if (sharePromises.length > 0) {
              await Promise.all(sharePromises);
            }
            this.isSaving = false;
            this.closeModal();
            this.toastService.success(this.t('accounts.updateSuccess'));
            this.loadAccounts();
          } catch (err) {
            console.error('Failed to sync account sharing:', err);
            this.isSaving = false;
            this.toastService.error(this.t('accounts.shareUpdateFailed'));
            this.closeModal();
            this.loadAccounts();
          }
        },
        error: (err) => {
          this.isSaving = false;
          this.loadingService.hide();
          const apiMsg = err.error?.message;
          const translatedApiMsg = apiMsg ? this.t(apiMsg) : null;
          this.toastService.error(translatedApiMsg || this.t('accounts.updateFailed'));
        }
      });
    } else {
      this.accountRepo.create(payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.toastService.success(this.t('accounts.createSuccess'));
          this.loadAccounts();
        },
        error: (err) => {
          this.isSaving = false;
          const apiMsg = err.error?.message;
          const translatedApiMsg = apiMsg ? this.t(apiMsg) : null;
          this.toastService.error(translatedApiMsg || this.t('accounts.createFailed'));
        }
      });
    }
  }

  setAsPrimary(acc: Account, event: MouseEvent) {
    event.stopPropagation();
    if (!this.isOnline()) return;
    
    this.loadingService.show();
    this.accountRepo.setPrimary(acc.id).subscribe({
      next: () => {
        this.toastService.success(this.t('accounts.setPrimarySuccess'));
        this.loadAccounts();
      },
      error: () => {
        this.loadingService.hide();
        this.toastService.error(this.t('accounts.setPrimaryFailed'));
      }
    });
  }

  deleteAccount(acc: Account, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    if (!this.isOnline()) return;

    const isCompany = this.activeWorkspace()?.type === 'company';
    const deleteTitle = isCompany ? (this.t('accounts.deleteTitle')?.replace('Account', 'Project')?.replace('Račun', 'Projekt') || 'Delete Project') : (this.t('accounts.deleteTitle') || 'Delete Account');
    const deleteConfirm = isCompany ? (this.t('accounts.deleteConfirm')?.replace('account', 'project')?.replace('račun', 'projekt') || 'Are you sure you want to delete this project?') : (this.t('accounts.deleteConfirm') || 'Are you sure you want to delete this account?');

    this.dialogService.confirm(
      deleteTitle,
      deleteConfirm,
      this.t('common.delete') || 'Delete',
      this.t('common.cancel') || 'Cancel'
    ).subscribe(confirmed => {
      if (!confirmed) return;

      this.loadingService.show();
      this.accountRepo.delete(acc.id).subscribe({
        next: () => {
          this.toastService.success(isCompany ? 'Project deleted successfully!' : (this.t('accounts.deleteSuccess') || 'Account deleted successfully!'));
          this.closeModal();
          this.loadAccounts();
        },
        error: (err) => {
          this.loadingService.hide();
          const apiMsg = err.error?.message;
          const translatedApiMsg = apiMsg ? this.t(apiMsg) : null;
          this.toastService.error(translatedApiMsg || this.t('accounts.deleteFailed'));
        }
      });
    });
  }

  deleteAccountFromModal() {
    if (!this.editingAccountId) return;
    const acc = this.accounts().find(a => a.id === this.editingAccountId);
    if (acc) {
      this.deleteAccount(acc);
    }
  }

  formatAmount(amount: number | string | null | undefined): string {
    if (amount === null || amount === undefined || amount === '') return '0,00';
    const val = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(val)) return '0,00';
    const locale = this.translationService.currentLang() === 'hr' ? 'hr-HR' : 'en-US';
    return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  }

  parseAmount(val: any): number {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    
    let str = String(val).trim();
    if (str.includes('.') && str.includes(',')) {
      const lastDot = str.lastIndexOf('.');
      const lastComma = str.lastIndexOf(',');
      if (lastComma > lastDot) {
        str = str.replace(/\./g, '').replace(',', '.');
      } else {
        str = str.replace(/,/g, '');
      }
    } else if (str.includes(',')) {
      str = str.replace(',', '.');
    }
    return parseFloat(str) || 0;
  }

  getBudgetSpentPercent(acc: Account): number {
    const budget = acc.opening_balance || 0;
    if (budget === 0) return 100; // If no budget, it's all spent technically, or just return 100% full
    const spent = Math.max(0, budget - acc.balance);
    return Math.min(100, Math.round((spent / budget) * 100));
  }
}
