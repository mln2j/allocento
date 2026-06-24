import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Project, ProjectRepository, ProjectDetailsResponse } from '../../core/repositories/project.repository';
import { TranslationService } from '../../core/services/translation.service';
import { ToastService } from '../../core/services/toast.service';
import { Transaction } from '../../core/models/transaction.model';
import { ModalComponent } from '../../shared/modal/modal.component';
import { TransactionModalService } from '../../core/services/transaction-modal.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { computed } from '@angular/core';
import { WorkspaceService } from '../../core/services/workspace.service';
import { DialogService } from '../../core/services/dialog.service';

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ModalComponent, BaseChartDirective],
  templateUrl: './project-details.page.html'
})
export class ProjectDetailsPage implements OnInit {
  private projectRepo = inject(ProjectRepository);
  private fb = inject(FormBuilder);
  private translationService = inject(TranslationService);
  private toastService = inject(ToastService);
  private location = inject(Location);
  private route = inject(ActivatedRoute);
  private transactionModalService = inject(TransactionModalService);
  private dialogService = inject(DialogService);
  private router = inject(Router);

  details = signal<ProjectDetailsResponse | null>(null);
  isLoading = signal<boolean>(true);
  
  isModalOpen = false;
  projectForm!: FormGroup;
  isSaving = false;
  isDeleting = false;

  get project(): Project | null {
    return this.details()?.project || null;
  }

  get transactions(): Transaction[] {
    return (this.details() as any)?.project?.transactions || [];
  }

  // Analytics Computed Properties
  activeWorkspace = inject(WorkspaceService).activeWorkspace;

  topCategories = computed(() => {
    const txs = this.transactions;
    const catMap = new Map<number, { name: string; amount: number; color?: string }>();
    
    txs.forEach(t => {
      if (t.category) {
        const current = catMap.get(t.category.id) || { name: t.category.name, amount: 0, color: '#7f5af0' };
        current.amount += Number(t.amount);
        catMap.set(t.category.id, current);
      }
    });

    return Array.from(catMap.values())
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
          backgroundColor: '#3b82f6',
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
  }

  openTxModal(tx: Transaction) {
    this.transactionModalService.openModal(tx);
  }

  initForm() {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['']
    });
  }

  loadDetails(id: number) {
    this.isLoading.set(true);
    this.projectRepo.getById(id).subscribe({
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
    if (!this.project) return;
    this.projectForm.patchValue({
      name: this.project.name,
      description: this.project.description
    });
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  deleteProject() {
    if (!this.project || this.isDeleting) return;

    this.dialogService.confirm(
      this.t('common.delete') || 'Obriši',
      this.t('projects.deleteConfirm') || 'Jeste li sigurni da želite obrisati projekt?',
      this.t('common.delete') || 'Obriši',
      this.t('common.cancel') || 'Odustani'
    ).subscribe(confirmed => {
      if (confirmed) {
        this.isDeleting = true;
        this.projectRepo.delete(this.project!.id).subscribe({
          next: () => {
            this.toastService.success(this.t('common.success'));
            this.closeModal();
            this.isDeleting = false;
            this.router.navigate(['/projects']);
          },
          error: () => {
            this.toastService.error(this.t('common.error'));
            this.isDeleting = false;
          }
        });
      }
    });
  }

  saveProject() {
    if (this.projectForm.invalid || this.isSaving || !this.project) return;
    this.isSaving = true;

    const data = this.projectForm.value;

    this.projectRepo.update(this.project.id, data).subscribe({
      next: (updated) => {
        const currentDetails = this.details();
        if (currentDetails) {
            this.details.set({
                ...currentDetails,
                project: { ...currentDetails.project, ...updated }
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


