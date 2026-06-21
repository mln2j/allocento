import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Category, CategoryRepository } from '../../core/repositories/category.repository';
import { TranslationService } from '../../core/services/translation.service';
import { ModalComponent } from '../../shared/modal/modal.component';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';
import { WorkspaceService } from '../../core/services/workspace.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ModalComponent],
  templateUrl: './categories.page.html'
})
export class CategoriesPage implements OnInit {
  private categoryRepo = inject(CategoryRepository);
  private fb = inject(FormBuilder);
  private translationService = inject(TranslationService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);
  private location = inject(Location);
  public workspaceService = inject(WorkspaceService);

  get isMainNav(): boolean {
    try {
      const prefs = JSON.parse(localStorage.getItem('nav_preferences') || '[]');
      return prefs.includes('categories');
    } catch {
      return false;
    }
  }

  categories = signal<Category[]>([]);
  isLoading = signal<boolean>(true);
  
  isModalOpen = false;
  categoryForm!: FormGroup;
  editingCategory: Category | null = null;
  isSaving = false;

  ngOnInit() {
    this.initForm();
    this.loadCategories();
  }

  initForm() {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      type: ['global', [Validators.required]]
    });
  }

  loadCategories() {
    this.isLoading.set(true);
    this.categoryRepo.getAll().subscribe({
      next: (data) => {
        this.categories.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error(this.t('common.error') || 'Failed to load categories');
        this.isLoading.set(false);
      }
    });
  }

  openCreateModal() {
    this.editingCategory = null;
    this.categoryForm.reset({ type: 'expense' });
    this.isModalOpen = true;
  }

  openEditModal(category: Category) {
    this.editingCategory = category;
    this.categoryForm.patchValue({
      name: category.name,
      type: category.type
    });
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingCategory = null;
  }

  saveCategory() {
    if (this.categoryForm.invalid || this.isSaving) return;
    this.isSaving = true;

    const data = this.categoryForm.value;

    if (this.editingCategory) {
      this.categoryRepo.update(this.editingCategory.id, data).subscribe({
        next: (updated) => {
          this.categories.update(list => list.map(c => c.id === updated.id ? updated : c));
          this.toastService.success(this.t('common.success') || 'Category updated');
          this.closeModal();
          this.isSaving = false;
        },
        error: () => {
          this.toastService.error(this.t('common.error') || 'Update failed');
          this.isSaving = false;
        }
      });
    } else {
      this.categoryRepo.create(data).subscribe({
        next: (created) => {
          this.categories.update(list => [...list, created]);
          this.toastService.success(this.t('common.success') || 'Category created');
          this.closeModal();
          this.isSaving = false;
        },
        error: () => {
          this.toastService.error(this.t('common.error') || 'Creation failed');
          this.isSaving = false;
        }
      });
    }
  }

  deleteCategory(category: Category) {
    this.dialogService.confirm(
      this.t('categories.deleteTitle') || 'Delete Category',
      this.t('categories.deleteConfirm') || 'Are you sure you want to delete this category?',
      this.t('common.accept') || 'Delete',
      this.t('common.cancel') || 'Cancel'
    ).subscribe(confirmed => {
      if (!confirmed) return;
      
      this.categoryRepo.delete(category.id).subscribe({
        next: () => {
          this.categories.update(list => list.filter(c => c.id !== category.id));
          this.toastService.success(this.t('common.success') || 'Category deleted');
        },
        error: () => {
          this.toastService.error(this.t('common.error') || 'Deletion failed');
        }
      });
    });
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  goBack() {
    this.location.back();
  }
}

