import { Component, OnInit, inject, signal, effect, computed, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TransactionModalService } from '../../../core/services/transaction-modal.service';
import { TransactionRepository } from '../../../core/repositories/transaction.repository';
import { AccountRepository } from '../../../core/repositories/account.repository';
import { ProjectRepository, Project } from '../../../core/repositories/project.repository';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { TranslationService } from '../../../core/services/translation.service';
import { DialogService } from '../../../core/services/dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { Account } from '../../../core/models/account.model';
import { Transaction } from '../../../core/models/transaction.model';
import { ModalComponent } from '../../modal/modal.component';

@Component({
  selector: 'app-transaction-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ModalComponent],
  templateUrl: './transaction-modal.component.html'
})
export class TransactionModalComponent implements OnInit {
  public modalService = inject(TransactionModalService);
  private fb = inject(FormBuilder);
  private accountRepo = inject(AccountRepository);
  private transactionRepo = inject(TransactionRepository);
  private projectRepo = inject(ProjectRepository);
  private workspaceService = inject(WorkspaceService);
  public translationService = inject(TranslationService);
  private dialogService = inject(DialogService);
  private toastService = inject(ToastService);

  transactionForm!: FormGroup;
  accounts = signal<Account[]>([]);
  categories = signal<any[]>([]);
  projects = signal<Project[]>([]);
  
  isEditing = false;
  isSaving = false;
  isReadonly = false;
  
  isAccountDropdownOpen = false;
  isCategoryDropdownOpen = false;
  isProjectDropdownOpen = false;

  constructor() {
    effect(() => {
      const state = this.modalService.state();
      if (state.isOpen) {
        untracked(() => {
          this.loadData();
          this.initForm(state.transaction);
        });
      }
    });
  }

  ngOnInit() {
    this.transactionForm = this.fb.group({
      accountId: ['', Validators.required],
      type: ['expense', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      date: [this.getCurrentDateTimeLocal(), Validators.required],
      description: ['', Validators.required],
      categoryId: [''],
      projectId: ['']
    });
  }

  getCurrentDateTimeLocal(): string {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().substring(0, 16);
  }

  initForm(tx: Transaction | null) {
    if (tx) {
      this.isEditing = true;
      
      let dateStr = tx.date;
      if (dateStr) {
        // If the date doesn't have a timezone indicator and uses space instead of T
        if (dateStr.includes(' ') && !dateStr.includes('Z')) {
          dateStr = dateStr.replace(' ', 'T') + 'Z';
        }
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const offset = d.getTimezoneOffset();
          const local = new Date(d.getTime() - offset * 60 * 1000);
          dateStr = local.toISOString().substring(0, 16);
        } else {
          dateStr = tx.date.replace(' ', 'T').substring(0, 16);
        }
      }

      this.transactionForm.patchValue({
        accountId: tx.accountId || (tx as any).account_id,
        type: tx.type,
        amount: tx.amount,
        date: dateStr,
        description: tx.description,
        categoryId: tx.categoryId || (tx as any).category_id || '',
        projectId: tx.projectId || (tx as any).project_id || ''
      });
      this.checkPermissions(tx.accountId);
    } else {
      this.isEditing = false;
      this.isReadonly = false;
      const primary = this.accounts().find(a => a.is_primary) || this.accounts()[0];
      this.transactionForm.reset({
        accountId: primary ? primary.id : '',
        type: 'expense',
        amount: null,
        date: this.getCurrentDateTimeLocal(),
        description: '',
        categoryId: '',
        projectId: ''
      });
      if (primary) {
        this.checkPermissions(primary.id);
      }
    }
  }

  checkPermissions(accountId: number | string) {
    const acc = this.accounts().find(a => a.id === Number(accountId));
    if (acc) {
      const ws = this.workspaceService.activeWorkspace();
      const user = JSON.parse(localStorage.getItem('current_user') || '{}');
      
      let canEdit = true;
      if (ws && user?.id) {
        const wsUser = ws.users?.find((u: any) => u.id === user.id);
        if (wsUser && wsUser.pivot?.role === 'member') {
            canEdit = false;
        }
      }
      this.isReadonly = !canEdit;
    }
  }

  loadData() {
    this.accountRepo.listForCurrentUser().subscribe({
      next: (accs) => {
        this.accounts.set(accs);
        if (!this.isEditing && !this.transactionForm.get('accountId')?.value) {
           const primary = accs.find(a => a.is_primary) || accs[0];
           if (primary) {
             this.transactionForm.patchValue({ accountId: primary.id });
             this.checkPermissions(primary.id);
           }
        }
      }
    });

    this.transactionRepo.getCategories().subscribe(cats => this.categories.set(cats));
    this.projectRepo.getAll().subscribe(projs => this.projects.set(projs));
  }

  closeModal() {
    this.modalService.closeModal();
    this.closeDropdowns();
  }

  closeDropdowns() {
    this.isAccountDropdownOpen = false;
    this.isCategoryDropdownOpen = false;
    this.isProjectDropdownOpen = false;
  }

  toggleAccountDropdown() {
    if (this.isReadonly) return;
    this.isAccountDropdownOpen = !this.isAccountDropdownOpen;
    this.isCategoryDropdownOpen = false;
    this.isProjectDropdownOpen = false;
  }

  selectAccount(accId: number) {
    this.transactionForm.get('accountId')?.setValue(accId);
    this.checkPermissions(accId);
    this.closeDropdowns();
  }

  getSelectedAccount(): Account | undefined {
    const accId = this.transactionForm.get('accountId')?.value;
    if (!accId) return undefined;
    return this.accounts().find(a => a.id === Number(accId));
  }

  toggleCategoryDropdown() {
    if (this.isReadonly) return;
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
    this.isAccountDropdownOpen = false;
    this.isProjectDropdownOpen = false;
  }

  selectCategory(catId: number | string | null) {
    this.transactionForm.get('categoryId')?.setValue(catId || '');
    this.closeDropdowns();
  }

  getSelectedCategoryName(): string {
    const id = this.transactionForm.get('categoryId')?.value;
    if (!id) return this.t('transactions.uncategorized') || 'Uncategorized';
    const cat = this.categories().find(c => c.id === Number(id));
    return cat ? cat.name : (this.t('transactions.uncategorized') || 'Uncategorized');
  }

  toggleProjectDropdown() {
    if (this.isReadonly) return;
    this.isProjectDropdownOpen = !this.isProjectDropdownOpen;
    this.isAccountDropdownOpen = false;
    this.isCategoryDropdownOpen = false;
  }

  selectProject(projId: number | string | null) {
    this.transactionForm.get('projectId')?.setValue(projId || '');
    this.closeDropdowns();
  }

  getSelectedProjectName(): string {
    const id = this.transactionForm.get('projectId')?.value;
    if (!id) return this.t('transactions.unprojected') || 'None';
    const proj = this.projects().find(p => p.id === Number(id));
    return proj ? proj.name : (this.t('transactions.unprojected') || 'None');
  }

  setTxType(type: 'income' | 'expense') {
    if (this.isReadonly) return;
    this.transactionForm.get('type')?.setValue(type);
  }

  t(key: string): string {
    return this.translationService.translate(key) || key.split('.').pop() || key;
  }

  saveTransaction() {
    if (this.transactionForm.invalid || this.isSaving || this.isReadonly) return;
    this.isSaving = true;

    const payload = { ...this.transactionForm.value };
    // Convert local datetime string from input to UTC ISO string for backend
    if (payload.date) {
      payload.date = new Date(payload.date).toISOString();
    }
    payload.categoryId = payload.categoryId ? Number(payload.categoryId) : null;
    payload.projectId = payload.projectId ? Number(payload.projectId) : null;

    const accId = payload.accountId;
    const txState = this.modalService.state().transaction;
    
    // When editing, send the request to the OLD account endpoint if the backend doesn't support changing accounts.
    // However, if we do allow changing accounts, we'll send it to the old account URL but with the new accountId in the payload?
    // Actually we'll just use the new accountId in the URL and update TransactionController.
    const urlAccountId = this.isEditing && txState ? (txState.accountId || (txState as any).account_id) : accId;

    const request$ = this.isEditing && txState
      ? this.transactionRepo.update(urlAccountId, txState.id, payload)
      : this.transactionRepo.create(accId, payload);

    request$.subscribe({
      next: () => {
        this.isSaving = false;
        this.toastService.success(this.isEditing ? (this.t('transactions.updateSuccess') || 'Transaction updated') : (this.t('transactions.createSuccess') || 'Transaction recorded'));
        this.modalService.notifySaved();
        this.closeModal();
      },
      error: (err) => {
        this.isSaving = false;
        this.toastService.error(err.error?.message || (this.isEditing ? (this.t('transactions.updateFailed') || 'Failed to update') : (this.t('transactions.createFailed') || 'Failed to create')));
      }
    });
  }

  deleteTransaction() {
    if (this.isSaving || this.isReadonly || !this.isEditing) return;
    const txState = this.modalService.state().transaction;
    if (!txState) return;

    this.dialogService.confirm(
      this.t('transactions.deleteTitle') || 'Brisanje transakcije',
      this.t('transactions.deleteConfirm') || 'Jeste li sigurni da želite obrisati ovu transakciju?',
      this.t('common.delete') || 'Obriši',
      this.t('common.cancel') || 'Odustani'
    ).subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.isSaving = true;
      const accId = txState.accountId || (txState as any).account_id;
      
      this.transactionRepo.delete(accId, txState.id).subscribe({
        next: () => {
          this.isSaving = false;
          this.toastService.success(this.t('transactions.deleteSuccess') || 'Transaction deleted');
          this.modalService.notifySaved();
          this.closeModal();
        },
        error: (err) => {
          this.isSaving = false;
          this.toastService.error(this.t('transactions.deleteFailed') || 'Failed to delete');
        }
      });
    });
  }
}






