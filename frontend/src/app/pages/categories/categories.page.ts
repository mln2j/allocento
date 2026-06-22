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
        this.toastService.error(this.t('common.error') || 'Failed to load categories');
        this.isLoading.set(false);
      }
    });
  }

  openCreateModal() {
    this.categoryForm.reset({ type: 'expense' });
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveCategory() {
    if (this.categoryForm.invalid || this.isSaving) return;
    this.isSaving = true;

    const data = this.categoryForm.value;

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

