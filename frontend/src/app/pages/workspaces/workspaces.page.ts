import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { WorkspaceRepository, Workspace } from '../../core/repositories/workspace.repository';
import { TranslationService } from '../../core/services/translation.service';
import {LoadingService} from '../../core/services/loading/loading.service';

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './workspaces.page.html',
})
export class WorkspacesPage implements OnInit {
  private workspaceRepo = inject(WorkspaceRepository);
  private fb = inject(FormBuilder);
  private translationService = inject(TranslationService);
  private loadingService = inject(LoadingService);

  workspaces: Workspace[] = [];
  workspaceForm!: FormGroup;

  isModalOpen = false;
  isSaving = false;
  isTypeDropdownOpen = false;

  selectedWorkspace: Workspace | null = null;
  isLoadingDetails = false;

  availableIcons = ['💼', '🏠', '🚀', '🍕', '📈', '🛒', '🚗', '🛠️'];

  ngOnInit() {
    this.initForm();
    this.loadWorkspaces();

    window.addEventListener(
      'workspace-updated',
      this.handleWorkspaceRefresh
    );
  }

  handleWorkspaceRefresh = () => {
    this.loadWorkspaces();
  };

  ngOnDestroy() {
    window.removeEventListener(
      'workspace-updated',
      this.handleWorkspaceRefresh
    );
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
    this.loadingService.show();
    this.workspaceRepo.getWorkspaces().subscribe({
      next: (data) => {
        this.workspaces = data;
        this.loadingService.hide();
      },
      error: () => {
        this.loadingService.hide();
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
  toggleTypeDropdown() {
    this.isTypeDropdownOpen = !this.isTypeDropdownOpen;
  }

  selectType(type: string) {
    this.workspaceForm.get('type')?.setValue(type);
    this.isTypeDropdownOpen = false; // Zatvori nakon odabira
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

    // Koristi translation service za confirm poruku
    if (!confirm(this.t('workspaces.confirmRemoveMember') || 'Are you sure?')) return;

    const wsId = this.selectedWorkspace.workspace_id || this.selectedWorkspace.id;

    this.workspaceRepo.removeMember(wsId, userId).subscribe({
      next: () => {
        // Uspješno obrisano na backendu, sada osvježi lokalno stanje
        if (this.selectedWorkspace && this.selectedWorkspace.users) {
          this.selectedWorkspace.users = this.selectedWorkspace.users.filter(u => u.id !== userId);
        }
      },
      error: (err) => {
        console.error(err);
        alert(this.t('workspaces.removeMemberFailed') || 'Failed to remove member.');
      }
    });
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

  deleteWorkspace() {
    if (!this.selectedWorkspace || !confirm('Jesi li siguran da želiš obrisati ovaj workspace?')) return;

    const id = this.selectedWorkspace.workspace_id || this.selectedWorkspace.id;

    this.workspaceRepo.deleteWorkspace(id).subscribe(() => {
      this.workspaces = this.workspaces.filter(ws => (ws.workspace_id || ws.id) !== id);
      this.closeDetails();
    });
  }

  inviteEmail = ''; // Dodaj ovu varijablu na vrh klase
  inviteMember() {
    if (!this.selectedWorkspace || !this.inviteEmail) return;

    const wsId = this.selectedWorkspace.workspace_id || this.selectedWorkspace.id;

    this.workspaceRepo.inviteMember(wsId, this.inviteEmail).subscribe({
      next: () => {
        alert('Poziv poslan!');
        this.inviteEmail = '';

        if (this.selectedWorkspace) {
          this.viewDetails(this.selectedWorkspace);
        }
      },
      error: () => alert('Greška pri pozivanju.')
    });
  }

  createWorkspace() {
    if (this.workspaceForm.invalid || this.isSaving) return;
    this.isSaving = true;

    this.workspaceRepo.createWorkspace(this.workspaceForm.value).subscribe({
      next: (newWorkspace) => {
        newWorkspace.users_count = 1;
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
