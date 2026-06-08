import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AccountRepository } from '../../core/repositories/account.repository';
import { TranslationService } from '../../core/services/translation.service';
import { AppInitializerService } from '../../core/services/app-initializer';
import { LoadingService } from '../../core/services/loading/loading.service';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';
import { Account, AccountType } from '../../core/models/account.model';
import { ModalComponent } from '../../shared/modal/modal.component';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ModalComponent],
  templateUrl: './accounts.page.html',
})
export class AccountsPage implements OnInit {
  private accountRepo = inject(AccountRepository);
  private fb = inject(FormBuilder);
  private translationService = inject(TranslationService);
  private appInitializer = inject(AppInitializerService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);

  accounts = signal<Account[]>([]);
  isOnline = signal<boolean>(true);
  totalLiquidBalance = signal<number>(0);

  // Modal State
  isModalOpen = false;
  isSaving = false;
  accountForm!: FormGroup;
  editingAccountId: number | null = null;
  isTypeDropdownOpen = false;

  accountTypes: AccountType[] = ['checking', 'savings', 'cash', 'credit', 'investment', 'other'];

  ngOnInit() {
    this.isOnline.set(this.appInitializer.isOnlineMode);
    this.initForm();
    this.loadAccounts();
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  initForm() {
    this.accountForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      type: ['checking', [Validators.required]],
      currency: ['EUR', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
      balance: [0, [Validators.required, Validators.min(0)]]
    });
  }

  loadAccounts() {
    this.loadingService.show();
    this.accountRepo.listForCurrentUser().subscribe({
      next: (data) => {
        this.accounts.set(data);
        this.calculateTotalBalance(data);
        this.loadingService.hide();
      },
      error: (err) => {
        this.loadingService.hide();
        console.error('Failed to load accounts:', err);
        this.toastService.error(this.t('accounts.loadFailed') || 'Failed to load accounts.');
      }
    });
  }

  calculateTotalBalance(list: Account[]) {
    const total = list.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    this.totalLiquidBalance.set(total);
  }

  openCreateModal() {
    if (!this.isOnline()) {
      this.toastService.warning(this.t('accounts.offlineNotice') || 'Offline: Add/Edit disabled');
      return;
    }
    this.editingAccountId = null;
    this.accountForm.reset({
      name: '',
      type: 'checking',
      currency: 'EUR',
      balance: 0
    });
    this.isModalOpen = true;
  }

  openEditModal(acc: Account) {
    if (!this.isOnline()) {
      this.toastService.warning(this.t('accounts.offlineNotice') || 'Offline: Add/Edit disabled');
      return;
    }
    this.editingAccountId = acc.id;
    this.accountForm.reset({
      name: acc.name,
      type: acc.type,
      currency: acc.currency,
      balance: acc.balance
    });
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.isTypeDropdownOpen = false;
  }

  toggleTypeDropdown() {
    this.isTypeDropdownOpen = !this.isTypeDropdownOpen;
  }

  selectType(type: AccountType) {
    this.accountForm.get('type')?.setValue(type);
    this.isTypeDropdownOpen = false;
  }

  saveAccount() {
    if (this.accountForm.invalid || this.isSaving) return;
    this.isSaving = true;

    const payload = this.accountForm.value;

    if (this.editingAccountId) {
      this.accountRepo.update(this.editingAccountId, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.toastService.success(this.t('accounts.updateSuccess') || 'Account updated successfully!');
          this.loadAccounts();
        },
        error: (err) => {
          this.isSaving = false;
          this.toastService.error(err.error?.message || this.t('accounts.updateFailed') || 'Failed to update account.');
        }
      });
    } else {
      this.accountRepo.create(payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.toastService.success(this.t('accounts.createSuccess') || 'Account created successfully!');
          this.loadAccounts();
        },
        error: (err) => {
          this.isSaving = false;
          this.toastService.error(err.error?.message || this.t('accounts.createFailed') || 'Failed to create account.');
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
        this.toastService.success(this.t('accounts.setPrimarySuccess') || 'Primary account updated successfully!');
        this.loadAccounts();
      },
      error: () => {
        this.loadingService.hide();
        this.toastService.error(this.t('accounts.setPrimaryFailed') || 'Failed to set primary account.');
      }
    });
  }

  deleteAccount(acc: Account, event: MouseEvent) {
    event.stopPropagation();
    if (!this.isOnline()) return;

    this.dialogService.confirm(
      this.t('accounts.deleteTitle') || 'Delete Account',
      this.t('accounts.deleteConfirm') || 'Are you sure you want to delete this account?',
      this.t('common.delete') || 'Delete',
      this.t('common.cancel') || 'Cancel'
    ).subscribe(confirmed => {
      if (!confirmed) return;

      this.loadingService.show();
      this.accountRepo.delete(acc.id).subscribe({
        next: () => {
          this.toastService.success(this.t('accounts.deleteSuccess') || 'Account deleted successfully!');
          this.loadAccounts();
        },
        error: (err) => {
          this.loadingService.hide();
          this.toastService.error(err.error?.message || this.t('accounts.deleteFailed') || 'Failed to delete account.');
        }
      });
    });
  }

  formatAmount(amount: number): string {
    return amount.toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
