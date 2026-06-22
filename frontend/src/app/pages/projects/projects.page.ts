import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Project, ProjectRepository } from '../../core/repositories/project.repository';
import { TranslationService } from '../../core/services/translation.service';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { AppInitializerService } from '../../core/services/app-initializer';

import { ModalComponent } from '../../shared/modal/modal.component';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ModalComponent],
  templateUrl: './projects.page.html'
})
export class ProjectsPage implements OnInit {
  private projectRepo = inject(ProjectRepository);
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
      return prefs.includes('projects');
    } catch {
      return false;
    }
  }

  projects = signal<Project[]>([]);
  isLoading = signal<boolean>(true);
  isOnline = signal<boolean>(true);
  
  isModalOpen = false;
  projectForm!: FormGroup;
  isSaving = false;

  ngOnInit() {
    this.isOnline.set(this.appInitializer.isOnlineMode);
    this.initForm();
    this.loadProjects();
  }

  initForm() {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['']
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
        this.toastService.error(this.t('common.error'));
        this.isLoading.set(false);
      }
    });
  }

  openCreateModal() {
    this.projectForm.reset();
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveProject() {
    if (this.projectForm.invalid || this.isSaving) return;
    this.isSaving = true;

    const data = this.projectForm.value;

    this.projectRepo.create(data).subscribe({
      next: (created) => {
        this.projects.update(list => [...list, created]);
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

  goToProject(project: Project) {
    this.router.navigate(['/projects', project.id]);
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  goBack() {
    this.location.back();
  }
}
