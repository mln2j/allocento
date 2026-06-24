import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Category, CategoryRepository } from '../../core/repositories/category.repository';
import { TranslationService } from '../../core/services/translation.service';
import { ModalComponent } from '../../shared/modal/modal.component';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { AppInitializerService } from '../../core/services/app-initializer';
import { DialogService } from '../../core/services/dialog.service';

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
  private location = inject(Location);
  private router = inject(Router);
  public workspaceService = inject(WorkspaceService);
  private appInitializer = inject(AppInitializerService);
  private dialogService = inject(DialogService);

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
  isOnline = signal<boolean>(true);
  
  isModalOpen = false;
  categoryForm!: FormGroup;
  isSaving = false;
  categoryToEdit: Category | null = null;
  isDeleting = false;

  ngOnInit() {
    this.isOnline.set(this.appInitializer.isOnlineMode);
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
        this.toastService.error(this.t('common.error'));
        this.isLoading.set(false);
      }
    });
  }

  openCreateModal() {
    this.categoryToEdit = null;
    this.categoryForm.reset({ type: 'expense' });
    this.categoryForm.enable();
    this.isModalOpen = true;
  }

  openEditModal(category: Category) {
    this.categoryToEdit = category;
    this.categoryForm.patchValue({
      name: category.name,
      type: category.type
    });
    
    // Global categories can't be edited if they don't belong to a workspace
    if (!category.workspace_id) {
      this.categoryForm.disable();
    } else {
      this.categoryForm.enable();
    }
    
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.categoryToEdit = null;
  }

  saveCategory() {
    if (this.categoryForm.invalid || this.isSaving) return;
    this.isSaving = true;

    const data = this.categoryForm.value;

    if (this.categoryToEdit) {
      this.categoryRepo.update(this.categoryToEdit.id, data).subscribe({
        next: (updated) => {
          this.categories.update(list => list.map(c => c.id === updated.id ? updated : c));
          this.toastService.success(this.t('common.success'));
          this.closeModal();
          this.isSaving = false;
        },
        error: () => {
          this.toastService.error(this.t('common.error'));
          this.isSaving = false;
        }
      });
    } else {
      this.categoryRepo.create(data).subscribe({
        next: (created) => {
          this.categories.update(list => [...list, created]);
          this.toastService.success(this.t('common.success'));
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

  deleteCategory() {
    if (!this.categoryToEdit || this.isDeleting) return;
    
    this.dialogService.confirm(
      this.t('common.delete') || 'Obriši',
      this.t('categories.deleteConfirm') || 'Jeste li sigurni da želite obrisati kategoriju?',
      this.t('common.delete') || 'Obriši',
      this.t('common.cancel') || 'Odustani'
    ).subscribe(confirmed => {
      if (confirmed) {
        this.isDeleting = true;
        this.categoryRepo.delete(this.categoryToEdit!.id).subscribe({
          next: () => {
            this.categories.update(list => list.filter(c => c.id !== this.categoryToEdit?.id));
            this.toastService.success(this.t('common.success'));
            this.closeModal();
            this.isDeleting = false;
          },
          error: () => {
            this.toastService.error(this.t('common.error'));
            this.isDeleting = false;
          }
        });
      }
    });
  }

  goToCategory(category: Category) {
    this.router.navigate(['/categories', category.id]);
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  goBack() {
    this.location.back();
  }
}

