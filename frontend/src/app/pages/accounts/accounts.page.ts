import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AccountRepository } from '../../core/repositories/account.repository';
import { TranslationService } from '../../core/services/translation.service';
import { AppInitializerService } from '../../core/services/app-initializer';
import { LoadingService } from '../../core/services/loading/loading.service';
import { Account, AccountType } from '../../core/models/account.model';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './accounts.page.html',
})
export class AccountsPage implements OnInit {
  private accountRepo = inject(AccountRepository);
  private fb = inject(FormBuilder);
  private translationService = inject(TranslationService);
  private appInitializer = inject(AppInitializerService);
  private loadingService = inject(LoadingService);

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
        alert(this.t('workspaces.loadFailed'));
      }
    });
  }

  calculateTotalBalance(list: Account[]) {
    const total = list.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    this.totalLiquidBalance.set(total);
  }

  openCreateModal() {
    if (!this.isOnline()) {
      alert('Adding accounts is disabled in offline mode.');
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
      alert('Editing accounts is disabled in offline mode.');
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
          this.loadAccounts();
        },
        error: (err) => {
          this.isSaving = false;
          alert(err.error?.message || 'Failed to update account.');
        }
      });
    } else {
      this.accountRepo.create(payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadAccounts();
        },
        error: (err) => {
          this.isSaving = false;
          alert(err.error?.message || 'Failed to create account.');
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
        this.loadAccounts();
      },
      error: () => {
        this.loadingService.hide();
        alert('Failed to set primary account.');
      }
    });
  }

  deleteAccount(acc: Account, event: MouseEvent) {
    event.stopPropagation();
    if (!this.isOnline()) return;

    if (!confirm('Are you sure you want to delete this account?')) return;

    this.loadingService.show();
    this.accountRepo.delete(acc.id).subscribe({
      next: () => {
        this.loadAccounts();
      },
      error: () => {
        this.loadingService.hide();
        alert('Failed to delete account.');
      }
    });
  }

  formatAmount(amount: number): string {
    return amount.toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
