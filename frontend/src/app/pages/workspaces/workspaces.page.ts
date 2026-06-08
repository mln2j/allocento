import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { WorkspaceRepository, Workspace } from '../../core/repositories/workspace.repository';
import { TranslationService } from '../../core/services/translation.service';
import { LoadingService } from '../../core/services/loading/loading.service';
import { AppInitializerService } from '../../core/services/app-initializer';

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './workspaces.page.html',
})
export class WorkspacesPage implements OnInit, OnDestroy {
  private workspaceRepo = inject(WorkspaceRepository);
  private fb = inject(FormBuilder);
  private translationService = inject(TranslationService);
  private loadingService = inject(LoadingService);
  private appInitializer = inject(AppInitializerService);

  workspaces = signal<Workspace[]>([]);
  workspaceForm!: FormGroup;

  isModalOpen = false;
  isSaving = false;
  isTypeDropdownOpen = false;
  isOnline = signal<boolean>(true);

  selectedWorkspace = signal<Workspace | null>(null);
  isLoadingDetails = false;

  availableIcons = ['💼', '🏠', '🚀', '🍕', '📈', '🛒', '🚗', '🛠️'];
  inviteEmail = '';

  ngOnInit() {
    this.isOnline.set(this.appInitializer.isOnlineMode);
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
        this.workspaces.set(data);
        this.loadingService.hide();
      },
      error: () => {
        this.loadingService.hide();
        alert(this.t('workspaces.loadFailed'));
      }
    });
  }

  viewDetails(workspace: Workspace) {
    const id = workspace.workspace_id || workspace.id;
    this.isLoadingDetails = true;
    this.loadingService.show();

    this.workspaceRepo.getWorkspaceDetails(id).subscribe({
      next: (fullWorkspace) => {
        this.selectedWorkspace.set(fullWorkspace);
        this.isLoadingDetails = false;
        this.loadingService.hide();
      },
      error: () => {
        this.isLoadingDetails = false;
        this.loadingService.hide();
        alert('Failed to load workspace details.');
      }
    });
  }

  toggleTypeDropdown() {
    this.isTypeDropdownOpen = !this.isTypeDropdownOpen;
  }

  selectType(type: string) {
    this.workspaceForm.get('type')?.setValue(type);
    this.isTypeDropdownOpen = false;
  }

  closeDetails() {
    this.selectedWorkspace.set(null);
    this.loadWorkspaces();
  }

  removeMember(userId: number) {
    if (!this.isOnline()) {
      alert('Removing members is disabled in offline mode.');
      return;
    }

    if (!confirm(this.t('workspaces.confirmRemoveMember') || 'Are you sure?')) return;

    const currentWS = this.selectedWorkspace();
    if (!currentWS) return;

    const wsId = currentWS.workspace_id || currentWS.id;
    this.loadingService.show();

    this.workspaceRepo.removeMember(wsId, userId).subscribe({
      next: () => {
        this.loadingService.hide();
        // Update local state
        const updated = { ...currentWS };
        if (updated.users) {
          updated.users = updated.users.filter(u => u.id !== userId);
        }
        this.selectedWorkspace.set(updated);
      },
      error: (err) => {
        this.loadingService.hide();
        console.error(err);
        alert(this.t('workspaces.removeMemberFailed') || 'Failed to remove member.');
      }
    });
  }

  openCreateModal() {
    if (!this.isOnline()) {
      alert('Creating workspaces is disabled in offline mode.');
      return;
    }
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
    if (!this.isOnline()) {
      alert('Deleting workspaces is disabled in offline mode.');
      return;
    }

    const currentWS = this.selectedWorkspace();
    if (!currentWS) return;

    if (!confirm('Are you sure you want to delete this workspace?')) return;

    const id = currentWS.workspace_id || currentWS.id;
    this.loadingService.show();

    this.workspaceRepo.deleteWorkspace(id).subscribe({
      next: () => {
        this.loadingService.hide();
        this.closeDetails();
      },
      error: () => {
        this.loadingService.hide();
        alert('Failed to delete workspace.');
      }
    });
  }

  inviteMember() {
    if (!this.isOnline()) {
      alert('Inviting members is disabled in offline mode.');
      return;
    }

    const currentWS = this.selectedWorkspace();
    if (!currentWS || !this.inviteEmail) return;

    const wsId = currentWS.workspace_id || currentWS.id;
    this.loadingService.show();

    this.workspaceRepo.inviteMember(wsId, this.inviteEmail).subscribe({
      next: () => {
        this.loadingService.hide();
        alert('Poziv poslan!');
        this.inviteEmail = '';
        this.viewDetails(currentWS);
      },
      error: () => {
        this.loadingService.hide();
        alert('Greška pri pozivanju.');
      }
    });
  }

  createWorkspace() {
    if (this.workspaceForm.invalid || this.isSaving) return;
    this.isSaving = true;
    this.loadingService.show();

    this.workspaceRepo.createWorkspace(this.workspaceForm.value).subscribe({
      next: (newWorkspace) => {
        newWorkspace.users_count = 1;
        const currentList = this.workspaces();
        currentList.push(newWorkspace);
        this.workspaces.set([...currentList]);
        
        this.isSaving = false;
        this.loadingService.hide();
        this.closeModal();
      },
      error: (err) => {
        this.isSaving = false;
        this.loadingService.hide();
        if (err.status === 422 && err.error?.message) {
          alert(err.error.message);
        } else {
          alert(this.t('workspaces.createFailed') || 'Failed to create workspace.');
        }
      }
    });
  }

  formatAmount(amount: number | string | undefined): string {
    if (amount === undefined) return '0,00';
    const val = typeof amount === 'string' ? parseFloat(amount) : amount;
    return val.toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
