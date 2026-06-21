import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Project, ProjectRepository, ProjectDetailsResponse } from '../../core/repositories/project.repository';
import { TranslationService } from '../../core/services/translation.service';
import { ToastService } from '../../core/services/toast.service';
import { Transaction } from '../../core/models/transaction.model';
import { ModalComponent } from '../../shared/modal/modal.component';
import { TransactionModalService } from '../../services/transaction-modal.service';

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ModalComponent],
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

  details = signal<ProjectDetailsResponse | null>(null);
  isLoading = signal<boolean>(true);
  
  isModalOpen = false;
  projectForm!: FormGroup;
  isSaving = false;

  get project(): Project | null {
    return this.details()?.project || null;
  }

  get transactions(): Transaction[] {
    return (this.details() as any)?.project?.transactions || [];
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
        this.toastService.error(this.t('common.error') || 'Failed to load project details');
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
        this.toastService.success(this.t('common.success') || 'Project updated');
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


