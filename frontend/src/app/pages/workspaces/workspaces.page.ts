import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { WorkspaceRepository, Workspace } from '../../core/repositories/workspace.repository';
import { TranslationService } from '../../core/services/translation.service';
import { LoadingService } from '../../core/services/loading/loading.service';
import { AppInitializerService } from '../../core/services/app-initializer';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';
import { ModalComponent } from '../../shared/modal/modal.component';

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ModalComponent],
  templateUrl: './workspaces.page.html',
})
export class WorkspacesPage implements OnInit, OnDestroy {
  private workspaceRepo = inject(WorkspaceRepository);
  private fb = inject(FormBuilder);
  private translationService = inject(TranslationService);
  private loadingService = inject(LoadingService);
  private appInitializer = inject(AppInitializerService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);

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
        this.toastService.error(this.t('workspaces.loadFailed') || 'Failed to load workspaces.');
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
        this.toastService.error(this.t('workspaces.loadDetailsFailed') || 'Failed to load workspace details.');
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
      this.toastService.warning(this.t('workspaces.offlineNotice') || 'Action not available offline.');
      return;
    }

    this.dialogService.confirm(
      this.t('workspaces.membersManagement') || 'Members Management',
      this.t('workspaces.confirmRemoveMember') || 'Are you sure you want to remove this member?',
      this.t('common.reject') || 'Remove',
      this.t('common.cancel') || 'Cancel'
    ).subscribe(confirmed => {
      if (!confirmed) return;

      const currentWS = this.selectedWorkspace();
      if (!currentWS) return;

      const wsId = currentWS.workspace_id || currentWS.id;
      this.loadingService.show();

      this.workspaceRepo.removeMember(wsId, userId).subscribe({
        next: () => {
          this.loadingService.hide();
          this.toastService.success(this.t('workspaces.removeMemberSuccess') || 'Member removed successfully!');
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
          this.toastService.error(err.error?.message || this.t('workspaces.removeMemberFailed') || 'Failed to remove member.');
        }
      });
    });
  }

  openCreateModal() {
    if (!this.isOnline()) {
      this.toastService.warning(this.t('workspaces.offlineNotice') || 'Action not available offline.');
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
      this.toastService.warning(this.t('workspaces.offlineNotice') || 'Action not available offline.');
      return;
    }

    const currentWS = this.selectedWorkspace();
    if (!currentWS) return;

    this.dialogService.confirm(
      this.t('workspaces.deleteWorkspace') || 'Delete Workspace',
      this.t('workspaces.deleteConfirm') || 'Are you sure you want to delete this workspace?',
      this.t('common.reject') || 'Delete',
      this.t('common.cancel') || 'Cancel'
    ).subscribe(confirmed => {
      if (!confirmed) return;

      const id = currentWS.workspace_id || currentWS.id;
      this.loadingService.show();

      this.workspaceRepo.deleteWorkspace(id).subscribe({
        next: () => {
          this.loadingService.hide();
          this.toastService.success(this.t('workspaces.deleteSuccess') || 'Workspace deleted successfully!');
          this.closeDetails();
        },
        error: (err) => {
          this.loadingService.hide();
          this.toastService.error(err.error?.message || this.t('workspaces.deleteFailed') || 'Failed to delete workspace.');
        }
      });
    });
  }

  inviteMember() {
    if (!this.isOnline()) {
      this.toastService.warning(this.t('workspaces.offlineNotice') || 'Action not available offline.');
      return;
    }

    const currentWS = this.selectedWorkspace();
    if (!currentWS || !this.inviteEmail) return;

    const wsId = currentWS.workspace_id || currentWS.id;
    this.loadingService.show();

    this.workspaceRepo.inviteMember(wsId, this.inviteEmail).subscribe({
      next: () => {
        this.loadingService.hide();
        this.toastService.success(this.t('workspaces.inviteSuccess') || 'Invitation sent successfully!');
        this.inviteEmail = '';
        this.viewDetails(currentWS);
      },
      error: (err) => {
        this.loadingService.hide();
        this.toastService.error(err.error?.message || this.t('workspaces.inviteFailed') || 'Failed to send invitation.');
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
        this.toastService.success(this.t('workspaces.createSuccess') || 'Workspace created successfully!');
      },
      error: (err) => {
        this.isSaving = false;
        this.loadingService.hide();
        this.toastService.error(err.error?.message || this.t('workspaces.createFailed') || 'Failed to create workspace.');
      }
    });
  }

  formatAmount(amount: number | string | undefined): string {
    if (amount === undefined) return '0,00';
    const val = typeof amount === 'string' ? parseFloat(amount) : amount;
    return val.toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
