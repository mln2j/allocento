import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Category, CategoryRepository, CategoryDetailsResponse } from '../../core/repositories/category.repository';
import { TranslationService } from '../../core/services/translation.service';
import { ToastService } from '../../core/services/toast.service';
import { Transaction } from '../../core/models/transaction.model';
import { ModalComponent } from '../../shared/modal/modal.component';
import { TransactionModalService } from '../../core/services/transaction-modal.service';

@Component({
  selector: 'app-category-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ModalComponent],
  templateUrl: './category-details.page.html'
})
export class CategoryDetailsPage implements OnInit {
  private categoryRepo = inject(CategoryRepository);
  private fb = inject(FormBuilder);
  private translationService = inject(TranslationService);
  private toastService = inject(ToastService);
  private location = inject(Location);
  private route = inject(ActivatedRoute);
  private transactionModalService = inject(TransactionModalService);

  details = signal<CategoryDetailsResponse | null>(null);
  isLoading = signal<boolean>(true);
  
  isModalOpen = false;
  categoryForm!: FormGroup;
  isSaving = false;

  get category(): Category | null {
    return this.details()?.category || null;
  }

  get transactions(): Transaction[] {
    return (this.details() as any)?.category?.transactions || [];
  }

  ngOnInit() {
    this.initForm();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDetails(Number(id));
    }

    this.transactionModalService.saved$.subscribe(() => {
      if (id) {
        this.loadDetails(Number(id));
      }
    });
  }

  openTxModal(tx: Transaction) {
    this.transactionModalService.openModal(tx);
  }

  initForm() {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      type: ['global', [Validators.required]]
    });
  }

  loadDetails(id: number) {
    this.isLoading.set(true);
    this.categoryRepo.getById(id).subscribe({
      next: (data) => {
        this.details.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error(this.t('common.error') || 'Failed to load category details');
        this.isLoading.set(false);
        this.goBack();
      }
    });
  }

  openEditModal() {
    if (!this.category) return;
    this.categoryForm.patchValue({
      name: this.category.name,
      type: this.category.type
    });
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveCategory() {
    if (this.categoryForm.invalid || this.isSaving || !this.category) return;
    this.isSaving = true;

    const data = this.categoryForm.value;

    this.categoryRepo.update(this.category.id, data).subscribe({
      next: (updated) => {
        const currentDetails = this.details();
        if (currentDetails) {
            this.details.set({
                ...currentDetails,
                category: { ...currentDetails.category, ...updated }
            });
        }
        this.toastService.success(this.t('common.success') || 'Category updated');
        this.closeModal();
        this.isSaving = false;
      },
      error: () => {
        this.toastService.error(this.t('common.error') || 'Update failed');
        this.isSaving = false;
      }
    });
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  get currentUserId(): number | null {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u?.id || null;
    } catch {
      return null;
    }
  }

  isFuture(tx: any): boolean {
    if (!tx || !tx.date) return false;
    return new Date(tx.date).getTime() > Date.now();
  }

  goBack() {
    this.location.back();
  }
}


