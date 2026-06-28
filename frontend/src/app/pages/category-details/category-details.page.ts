import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Category, CategoryRepository, CategoryDetailsResponse } from '../../core/repositories/category.repository';
import { TranslationService } from '../../core/services/translation.service';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';
import { Transaction } from '../../core/models/transaction.model';
import { ModalComponent } from '../../shared/modal/modal.component';
import { TransactionModalService } from '../../core/services/transaction-modal.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { computed } from '@angular/core';
import { WorkspaceService } from '../../core/services/workspace.service';
import { AppInitializerService } from '../../core/services/app-initializer';

@Component({
  selector: 'app-category-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ModalComponent, BaseChartDirective],
  templateUrl: './category-details.page.html'
})
export class CategoryDetailsPage implements OnInit {
  private categoryRepo = inject(CategoryRepository);
  private fb = inject(FormBuilder);
  private translationService = inject(TranslationService);
  private toastService = inject(ToastService);
  private location = inject(Location);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private transactionModalService = inject(TransactionModalService);
  private dialogService = inject(DialogService);
  appInitializer = inject(AppInitializerService);

  details = signal<CategoryDetailsResponse | null>(null);
  isLoading = signal<boolean>(true);
  
  isModalOpen = false;
  categoryForm!: FormGroup;
  isSaving = false;
  isDeleting = false;
  isMergeModalOpen = false;
  isMerging = false;
  categories = signal<Category[]>([]);
  mergeForm!: FormGroup;

  get category(): Category | null {
    return this.details()?.category || null;
  }

  get transactions(): Transaction[] {
    return (this.details() as any)?.category?.transactions || [];
  }

  // Analytics Computed Properties
  activeWorkspace = inject(WorkspaceService).activeWorkspace;

  topProjects = computed(() => {
    const txs = this.transactions;
    const projectMap = new Map<number, { name: string; amount: number; color?: string }>();
    
    txs.forEach(t => {
      if (t.project) {
        const current = projectMap.get(t.project.id) || { name: t.project.name, amount: 0, color: '#7f5af0' };
        current.amount += Number(t.amount);
        projectMap.set(t.project.id, current);
      }
    });

    return Array.from(projectMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  });

  barChartData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const txs = this.transactions;
    if (!txs.length) return { labels: [], datasets: [] };

    // Group by month
    const monthMap = new Map<string, number>();
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString(this.translationService.currentLang(), { month: 'short', year: '2-digit' });
      monthMap.set(label, 0);
    }

    txs.forEach(t => {
      const date = new Date(t.date);
      if (date >= new Date(now.getFullYear(), now.getMonth() - 5, 1)) {
        const label = date.toLocaleDateString(this.translationService.currentLang(), { month: 'short', year: '2-digit' });
        if (monthMap.has(label)) {
          monthMap.set(label, monthMap.get(label)! + Number(t.amount));
        }
      }
    });

    return {
      labels: Array.from(monthMap.keys()),
      datasets: [
        {
          data: Array.from(monthMap.values()),
          label: this.t('common.spending') || 'Spending',
          backgroundColor: '#7f5af0',
          borderRadius: 4
        }
      ]
    };
  });

  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { grid: { display: false } },
      y: { border: { display: false } }
    }
  };

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

    this.categoryRepo.getAll().subscribe(cats => {
      this.categories.set(cats);
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
    
    this.mergeForm = this.fb.group({
      targetId: ['', [Validators.required]]
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
        this.toastService.error(this.t('common.error'));
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
    this.isMergeModalOpen = false;
  }

  openMergeModal() {
    if (!this.category || !this.appInitializer.isOnlineMode) return;
    this.mergeForm.reset();
    this.isMergeModalOpen = true;
  }

  get mergeableCategories(): Category[] {
    if (!this.category) return [];
    return this.categories().filter(c => c.id !== this.category!.id);
  }

  mergeCategory() {
    if (this.mergeForm.invalid || this.isMerging || !this.category) return;
    const targetId = this.mergeForm.value.targetId;
    if (!targetId) return;

    this.isMerging = true;
    this.categoryRepo.merge(this.category.id, Number(targetId)).subscribe({
      next: () => {
        this.toastService.success(this.t('categories.mergeSuccess') || 'Kategorije uspješno spojene!');
        this.closeModal();
        this.isMerging = false;
        this.router.navigate(['/categories']);
      },
      error: () => {
        this.toastService.error(this.t('categories.mergeFailed') || 'Spajanje kategorija nije uspjelo.');
        this.isMerging = false;
      }
    });
  }

  deleteCategory() {
    if (!this.category || this.isDeleting) return;
    
    this.dialogService.confirm(
      this.t('common.delete') || 'Obriši',
      this.t('categories.deleteConfirm') || 'Jeste li sigurni da želite obrisati kategoriju?',
      this.t('common.delete') || 'Obriši',
      this.t('common.cancel') || 'Odustani'
    ).subscribe(confirmed => {
      if (confirmed) {
        this.isDeleting = true;
        this.categoryRepo.delete(this.category!.id).subscribe({
          next: () => {
            this.toastService.success(this.t('common.success'));
            this.closeModal();
            this.isDeleting = false;
            this.router.navigate(['/categories']);
          },
          error: () => {
            this.toastService.error(this.t('common.error'));
            this.isDeleting = false;
          }
        });
      }
    });
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


