import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { WorkspaceRepository, Workspace } from '../../core/repositories/workspace.repository';
import { TranslationService } from '../../core/services/translation.service';
import { LoadingService } from '../../core/services/loading/loading.service';
import { AppInitializerService } from '../../core/services/app-initializer';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { ModalComponent } from '../../shared/modal/modal.component';

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ModalComponent, RouterModule],
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
  private workspaceService = inject(WorkspaceService);
  private location = inject(Location);

  get isMainNav(): boolean {
    try {
      const prefs = JSON.parse(localStorage.getItem('nav_preferences') || '[]');
      return prefs.includes('workspaces');
    } catch {
      return false;
    }
  }

  workspaces = signal<Workspace[]>([]);
  workspaceForm!: FormGroup;

  isModalOpen = false;
  isSaving = false;
  isTypeDropdownOpen = false;
  isOnline = signal<boolean>(true);
  isLoading = signal<boolean>(false);

  selectedWorkspace = signal<Workspace | null>(null);
  isLoadingDetails = false;

  inviteEmail = '';

  ngOnInit() {
    this.isOnline.set(this.appInitializer.isOnlineMode);
    this.initForm();
    this.loadWorkspaces();

    window.addEventListener(
      'workspace-updated',
      this.handleWorkspaceRefresh
    );
    window.addEventListener(
      'workspace-invitation-accepted',
      this.handleWorkspaceRefresh
    );
  }

  handleWorkspaceRefresh = () => {
    this.loadWorkspaces();
  };

  activeWorkspaceId() {
    return this.workspaceService.activeWorkspace()?.id;
  }

  setActive() {
    const ws = this.selectedWorkspace();
    if (ws) {
      this.workspaceService.setActiveWorkspace(ws);
      this.toastService.success(this.t('workspaces.setActiveSuccess') || 'Workspace set as active.');
    }
  }

  ngOnDestroy() {
    window.removeEventListener(
      'workspace-updated',
      this.handleWorkspaceRefresh
    );
    window.removeEventListener(
      'workspace-invitation-accepted',
      this.handleWorkspaceRefresh
    );
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  goBack() {
    this.location.back();
  }

  initForm() {
    this.workspaceForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      type: ['household', [Validators.required]],
      currency: ['EUR', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]]
    });
  }

  loadWorkspaces() {
    this.isLoading.set(true);
    this.workspaceRepo.getWorkspaces().subscribe({
      next: (data) => {
        data.sort((a, b) => {
          if (a.type === 'personal') return -1;
          if (b.type === 'personal') return 1;
          return 0;
        });
        this.workspaces.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toastService.error(this.t('workspaces.loadFailed') || 'Failed to load workspaces.');
      }
    });
  }

  viewDetails(workspace: Workspace) {
    const id = workspace.workspace_id || workspace.id;
    // Set shallow info immediately to transition view instantly
    this.selectedWorkspace.set(workspace);
    this.isLoadingDetails = true;

    this.workspaceRepo.getWorkspaceDetails(id).subscribe({
      next: (fullWorkspace) => {
        this.selectedWorkspace.set(fullWorkspace);
        this.isLoadingDetails = false;
      },
      error: () => {
        this.isLoadingDetails = false;
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
      this.t('common.accept') || 'Remove',
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
      currency: 'EUR'
    });
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
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
      this.t('common.accept') || 'Delete',
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

  leaveWorkspace() {
    if (!this.isOnline()) {
      this.toastService.warning(this.t('workspaces.offlineNotice') || 'Action not available offline.');
      return;
    }

    const currentWS = this.selectedWorkspace();
    if (!currentWS) return;

    this.dialogService.confirm(
      this.t('workspaces.leaveWorkspace') || 'Leave Workspace',
      this.t('workspaces.leaveConfirm') || 'Are you sure you want to leave this workspace?',
      this.t('common.accept') || 'Leave',
      this.t('common.cancel') || 'Cancel'
    ).subscribe(confirmed => {
      if (!confirmed) return;

      const id = currentWS.workspace_id || currentWS.id;
      this.loadingService.show();

      this.workspaceRepo.leaveWorkspace(id).subscribe({
        next: () => {
          this.loadingService.hide();
          this.toastService.success(this.t('workspaces.leaveSuccess') || 'Left workspace successfully!');
          this.closeDetails();
        },
        error: (err) => {
          this.loadingService.hide();
          this.toastService.error(err.error?.message || this.t('workspaces.leaveFailed') || 'Failed to leave workspace.');
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
