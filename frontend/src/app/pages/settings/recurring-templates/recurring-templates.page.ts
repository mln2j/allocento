import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { RecurringTemplate, RecurringTemplateService } from '../../../core/services/recurring-template';
import { TranslationService } from '../../../core/services/translation.service';
import { ToastService } from '../../../core/services/toast.service';
import { DialogService } from '../../../core/services/dialog.service';
import { AccountRepository } from '../../../core/repositories/account.repository';
import { Account } from '../../../core/models/account.model';
import { Category, CategoryRepository } from '../../../core/repositories/category.repository';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { AmountInputDirective } from '../../../shared/directives/amount-input.directive';
import { AmountPipe } from '../../../shared/pipes/amount.pipe';

@Component({
  selector: 'app-recurring-templates',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ModalComponent, AmountInputDirective, AmountPipe],
  templateUrl: './recurring-templates.page.html'
})
export class RecurringTemplatesPage implements OnInit {
  private templateService = inject(RecurringTemplateService);
  private accountRepo = inject(AccountRepository);
  private categoryRepo = inject(CategoryRepository);
  private fb = inject(FormBuilder);
  private translationService = inject(TranslationService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);
  private location = inject(Location);
  
  templates = signal<RecurringTemplate[]>([]);
  accounts = signal<Account[]>([]);
  categories = signal<Category[]>([]);
  isLoading = signal<boolean>(true);
  
  isModalOpen = false;
  isSaving = false;
  templateForm!: FormGroup;
  editingTemplateId: number | null = null;
  
  ngOnInit() {
    this.initForm();
    this.loadData();
  }
  
  initForm() {
    this.templateForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      type: ['expense', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      account_id: ['', Validators.required],
      category_id: [''],
      description: [''],
      frequency: ['monthly', Validators.required],
      day_of_month: [1, [Validators.min(1), Validators.max(31)]],
      is_active: [true]
    });
    
    // Auto clear category if type changes and category type doesn't match
    this.templateForm.get('type')?.valueChanges.subscribe(type => {
      const catId = this.templateForm.get('category_id')?.value;
      if (catId) {
        const cat = this.categories().find(c => c.id == catId);
        if (cat && cat.type !== type) {
          this.templateForm.get('category_id')?.setValue('');
        }
      }
    });
  }
  
  loadData() {
    this.isLoading.set(true);
    
    // Load accounts and categories first, then templates
    this.accountRepo.listForCurrentUser().subscribe(accs => {
      this.accounts.set(accs);
      
      this.categoryRepo.getAll().subscribe(cats => {
        this.categories.set(cats);
        
        this.templateService.getAll().subscribe({
          next: (tpls) => {
            this.templates.set(tpls);
            this.isLoading.set(false);
          },
          error: () => {
            this.toastService.error(this.t('common.error'));
            this.isLoading.set(false);
          }
        });
      });
    });
  }
  
  get filteredCategories() {
    const type = this.templateForm.get('type')?.value;
    return this.categories().filter(c => c.type === type);
  }
  
  openModal(template?: RecurringTemplate) {
    if (template) {
      this.editingTemplateId = template.id;
      this.templateForm.patchValue({
        name: template.name,
        type: template.type,
        amount: template.amount,
        account_id: template.account_id,
        category_id: template.category_id || '',
        description: template.description || '',
        frequency: template.frequency,
        day_of_month: template.day_of_month || 1,
        is_active: template.is_active
      });
    } else {
      this.editingTemplateId = null;
      this.templateForm.reset({
        type: 'expense',
        frequency: 'monthly',
        day_of_month: 1,
        is_active: true
      });
      // preselect first account
      if (this.accounts().length > 0) {
        this.templateForm.patchValue({ account_id: this.accounts()[0].id });
      }
    }
    this.isModalOpen = true;
  }
  
  closeModal() {
    this.isModalOpen = false;
  }
  
  saveTemplate() {
    if (this.templateForm.invalid || this.isSaving) return;
    this.isSaving = true;
    
    const data = this.templateForm.value;
    if (!data.category_id) data.category_id = null;
    if (data.frequency !== 'monthly' && data.frequency !== 'yearly') {
       data.day_of_month = null;
    }
    
    if (this.editingTemplateId) {
      this.templateService.update(this.editingTemplateId, data).subscribe({
        next: () => {
          this.toastService.success(this.t('common.success'));
          this.loadData();
          this.closeModal();
          this.isSaving = false;
        },
        error: () => {
          this.toastService.error(this.t('common.error'));
          this.isSaving = false;
        }
      });
    } else {
      this.templateService.create(data).subscribe({
        next: () => {
          this.toastService.success(this.t('common.success'));
          this.loadData();
          this.closeModal();
          this.isSaving = false;
        },
        error: () => {
          this.toastService.error(this.t('common.error'));
          this.isSaving = false;
        }
      });
    }
  }
  
  toggleActive(template: RecurringTemplate, event: any) {
    const isActive = event.target.checked;
    this.templateService.update(template.id, { is_active: isActive }).subscribe({
      next: () => {
        const current = this.templates();
        const index = current.findIndex(t => t.id === template.id);
        if (index > -1) {
           current[index] = { ...current[index], is_active: isActive };
           this.templates.set([...current]);
        }
      },
      error: () => {
        event.target.checked = !isActive; // revert
        this.toastService.error(this.t('common.error'));
      }
    });
  }
  
  deleteTemplate(id: number) {
    this.dialogService.confirm(
      this.t('common.delete') || 'Obriši',
      'Jeste li sigurni da želite obrisati ovaj predložak?',
      this.t('common.delete') || 'Obriši',
      this.t('common.cancel') || 'Odustani'
    ).subscribe(confirmed => {
      if (!confirmed) return;
      
      this.templateService.delete(id).subscribe({
        next: () => {
          this.templates.update(list => list.filter(t => t.id !== id));
          this.toastService.success(this.t('common.success'));
        },
        error: () => {
          this.toastService.error(this.t('common.error'));
        }
      });
    });
  }
  
  goBack() {
    this.location.back();
  }
  
  t(key: string): string {
    return this.translationService.translate(key);
  }
}

