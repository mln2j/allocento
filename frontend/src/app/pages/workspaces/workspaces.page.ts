import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { WorkspaceRepository, Workspace } from '../../core/repositories/workspace.repository';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './workspaces.page.html',
})
export class WorkspacesPage implements OnInit {
  private workspaceRepo = inject(WorkspaceRepository);
  private fb = inject(FormBuilder);
  private translationService = inject(TranslationService);

  workspaces: Workspace[] = [];
  workspaceForm!: FormGroup;

  isLoading = true;
  isModalOpen = false;
  isSaving = false;

  selectedWorkspace: Workspace | null = null;
  isLoadingDetails = false;

  availableIcons = ['💼', '🏠', '🚀', '🍕', '📈', '🛒', '🚗', '🛠️'];

  ngOnInit() {
    this.initForm();
    this.loadWorkspaces();
  }

  // Helper za prijevode
  t(key: string): string {
    return this.translationService.translate(key);
  }

  initForm() {
    this.workspaceForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      type: ['household', [Validators.required]],
      icon: ['🏠'],
      currency: ['EUR', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]]
    });
  }

  loadWorkspaces() {
    this.isLoading = true;
    this.workspaceRepo.getWorkspaces().subscribe({
      next: (data) => {
        this.workspaces = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        alert(this.t('workspaces.loadFailed'));
      }
    });
  }

  // --- NOVO: Ulazak u detalje pojedinog workspacea ---
  viewDetails(workspace: Workspace) {
    const id = workspace.workspace_id || workspace.id;
    this.isLoadingDetails = true;

    this.workspaceRepo.getWorkspaceDetails(id).subscribe({
      next: (fullWorkspace) => {
        this.selectedWorkspace = fullWorkspace;
        this.isLoadingDetails = false;
      },
      error: () => {
        this.isLoadingDetails = false;
        alert('Failed to load workspace details.');
      }
    });
  }

  // --- NOVO: Povratak na glavnu listu ---
  closeDetails() {
    this.selectedWorkspace = null;
    // Osvježavamo listu u slučaju da je korisnik obrisao članove ili promijenio nešto
    this.loadWorkspaces();
  }

  // --- NOVO: Brisanje člana (povezano s tvojim removeMember na backendu) ---
  removeMember(userId: number) {
    if (!this.selectedWorkspace) return;
    if (!confirm(this.t('workspaces.confirmRemoveMember'))) return;

    const wsId = this.selectedWorkspace.workspace_id || this.selectedWorkspace.id;

    // Pretpostavljamo da si dodao removeMember u svoj WorkspaceRepository
    // Ako nisi, poziv ide otprilike ovako kroz HttpClient ili ga dodaj u repo:
    // this.http.delete(`${API_BASE_URL}/workspaces/${wsId}/members/${userId}`)
    alert('Micanje člana s ID-em: ' + userId);

    // Primjer lokalnog micanja iz polja nakon uspješnog API odgovora:
    // this.selectedWorkspace.users = this.selectedWorkspace.users?.filter(u => u.id !== userId);
  }

  openCreateModal() {
    this.workspaceForm.reset({
      type: 'household',
      icon: '🏠',
      currency: 'EUR'
    });
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  selectIcon(icon: string) {
    this.workspaceForm.get('icon')?.setValue(icon);
  }

  createWorkspace() {
    if (this.workspaceForm.invalid || this.isSaving) return;
    this.isSaving = true;

    this.workspaceRepo.createWorkspace(this.workspaceForm.value).subscribe({
      next: (newWorkspace) => {
        this.workspaces.push(newWorkspace);
        this.isSaving = false;
        this.closeModal();
      },
      error: (err) => {
        this.isSaving = false;
        if (err.status === 422 && err.error?.message) {
          alert(err.error.message);
        } else {
          alert(this.t('workspaces.createFailed') || 'Failed to create workspace.');
        }
      }
    });
  }
}
