import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Project, ProjectRepository } from '../../core/repositories/project.repository';
import { TranslationService } from '../../core/services/translation.service';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';
import { WorkspaceService } from '../../core/services/workspace.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './projects.page.html'
})
export class ProjectsPage implements OnInit {
  private projectRepo = inject(ProjectRepository);
  private fb = inject(FormBuilder);
  private translationService = inject(TranslationService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);
  public workspaceService = inject(WorkspaceService);

  projects = signal<Project[]>([]);
  isLoading = signal<boolean>(true);
  
  isModalOpen = false;
  projectForm!: FormGroup;
  editingProject: Project | null = null;
  isSaving = false;

  ngOnInit() {
    this.initForm();
    this.loadProjects();
  }

  initForm() {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      color: ['#4f46e5', [Validators.required]],
      description: [''],
      status: ['active']
    });
  }

  loadProjects() {
    this.isLoading.set(true);
    this.projectRepo.getAll().subscribe({
      next: (data) => {
        this.projects.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error(this.t('common.error') || 'Failed to load projects');
        this.isLoading.set(false);
      }
    });
  }

  openCreateModal() {
    this.editingProject = null;
    this.projectForm.reset({ color: '#4f46e5', status: 'active' });
    this.isModalOpen = true;
  }

  openEditModal(project: Project) {
    this.editingProject = project;
    this.projectForm.patchValue({
      name: project.name,
      color: project.color,
      description: project.description,
      status: project.status
    });
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingProject = null;
  }

  saveProject() {
    if (this.projectForm.invalid || this.isSaving) return;
    this.isSaving = true;

    const data = this.projectForm.value;

    if (this.editingProject) {
      this.projectRepo.update(this.editingProject.id, data).subscribe({
        next: (updated) => {
          this.projects.update(list => list.map(p => p.id === updated.id ? updated : p));
          this.toastService.success(this.t('common.success') || 'Project updated');
          this.closeModal();
          this.isSaving = false;
        },
        error: () => {
          this.toastService.error(this.t('common.error') || 'Update failed');
          this.isSaving = false;
        }
      });
    } else {
      this.projectRepo.create(data).subscribe({
        next: (created) => {
          this.projects.update(list => [...list, created]);
          this.toastService.success(this.t('common.success') || 'Project created');
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

  deleteProject(project: Project) {
    this.dialogService.confirm(
      this.t('projects.deleteTitle') || 'Delete Project',
      this.t('projects.deleteConfirm') || 'Are you sure you want to delete this project?',
      this.t('common.accept') || 'Delete',
      this.t('common.cancel') || 'Cancel'
    ).subscribe(confirmed => {
      if (!confirmed) return;
      
      this.projectRepo.delete(project.id).subscribe({
        next: () => {
          this.projects.update(list => list.filter(p => p.id !== project.id));
          this.toastService.success(this.t('common.success') || 'Project deleted');
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
}
