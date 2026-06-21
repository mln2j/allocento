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
import { SelectComponent } from '../../shared/select/select.component';

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ModalComponent, SelectComponent, RouterModule],
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
  isOnline = signal<boolean>(true);
  isLoading = signal<boolean>(false);

  selectedWorkspace = signal<Workspace | null>(null);
  isLoadingDetails = false;

  inviteEmail = '';

  pendingInvitations = signal<any[]>([]);
  isInviteModalOpen = false;
  inviteRole = 'member';

  isMemberModalOpen = false;
  selectedMember: any = null;
  selectedMemberRole = 'member';

  get typeOptions() {
    return [
      { value: 'personal', label: this.t('workspaces.types.personal') || 'Personal' },
      { value: 'household', label: this.t('workspaces.types.household') || 'Household' },
      { value: 'company', label: this.t('workspaces.types.company') || 'Company' }
    ];
  }

  get roleOptions() {
    return [
      { value: 'member', label: this.t('workspaces.roles.member') || 'Član' },
      { value: 'manager', label: this.t('workspaces.roles.manager') || 'Menadžer' }
    ];
  }

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

  loadPendingInvitations(wsId: string | number) {
    if (!this.isOnline()) return;
    this.workspaceRepo.getPendingInvitations(wsId).subscribe({
      next: (invites) => {
        this.pendingInvitations.set(invites);
      },
      error: () => {
        this.pendingInvitations.set([]);
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
        if (fullWorkspace.pivot?.role === 'owner' || fullWorkspace.pivot?.role === 'manager') {
           this.loadPendingInvitations(id);
        } else {
           this.pendingInvitations.set([]);
        }
      },
      error: () => {
        this.isLoadingDetails = false;
        this.toastService.error(this.t('workspaces.loadDetailsFailed') || 'Failed to load workspace details.');
      }
    });
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
          this.closeMemberModal();
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

  openInviteModal() {
    if (!this.isOnline()) {
      this.toastService.warning(this.t('workspaces.offlineNotice') || 'Action not available offline.');
      return;
    }
    this.inviteEmail = '';
    this.inviteRole = 'member';
    this.isInviteModalOpen = true;
  }

  closeInviteModal() {
    this.isInviteModalOpen = false;
  }

  openMemberModal(member: any) {
    if (!this.isOnline()) {
      this.toastService.warning(this.t('workspaces.offlineNotice') || 'Action not available offline.');
      return;
    }
    this.selectedMember = member;
    this.selectedMemberRole = member.pivot?.role || 'member';
    this.isMemberModalOpen = true;
  }

  closeMemberModal() {
    this.isMemberModalOpen = false;
    this.selectedMember = null;
  }

  updateMemberRole() {
    if (!this.isOnline() || !this.selectedMember) return;
    
    const currentWS = this.selectedWorkspace();
    if (!currentWS) return;

    const wsId = currentWS.workspace_id || currentWS.id;
    const userId = this.selectedMember.id;
    
    if (this.selectedMember.pivot?.role === this.selectedMemberRole) {
       this.closeMemberModal();
       return;
    }

    this.loadingService.show();
    this.workspaceRepo.updateMemberRole(wsId, userId, this.selectedMemberRole).subscribe({
      next: () => {
         this.loadingService.hide();
         this.toastService.success(this.t('workspaces.roleUpdateSuccess') || 'Role updated successfully!');
         this.closeMemberModal();
         this.viewDetails(currentWS);
      },
      error: (err) => {
         this.loadingService.hide();
         this.toastService.error(err.error?.message || 'Failed to update role.');
      }
    });
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

    this.workspaceRepo.inviteMember(wsId, this.inviteEmail, this.inviteRole).subscribe({
      next: () => {
        this.loadingService.hide();
        this.toastService.success(this.t('workspaces.inviteSuccess') || 'Invitation sent successfully!');
        this.closeInviteModal();
        this.loadPendingInvitations(wsId);
      },
      error: (err) => {
        this.loadingService.hide();
        this.toastService.error(err.error?.message || this.t('workspaces.inviteFailed') || 'Failed to send invitation.');
      }
    });
  }

  revokeInvitation(invitationId: number) {
    if (!this.isOnline()) {
      this.toastService.warning(this.t('workspaces.offlineNotice') || 'Action not available offline.');
      return;
    }

    this.dialogService.confirm(
      this.t('workspaces.revokeInvitationTitle') || 'Cancel Invitation',
      this.t('workspaces.revokeInvitationConfirm') || 'Are you sure you want to cancel this invitation?',
      this.t('common.accept') || 'Cancel',
      this.t('common.cancel') || 'Close'
    ).subscribe(confirmed => {
      if (!confirmed) return;

      const currentWS = this.selectedWorkspace();
      if (!currentWS) return;

      const wsId = currentWS.workspace_id || currentWS.id;
      this.loadingService.show();

      this.workspaceRepo.deleteInvitation(wsId, invitationId).subscribe({
        next: () => {
          this.loadingService.hide();
          this.toastService.success(this.t('workspaces.revokeSuccess') || 'Invitation cancelled successfully!');
          this.loadPendingInvitations(wsId);
        },
        error: (err) => {
          this.loadingService.hide();
          this.toastService.error(err.error?.message || this.t('workspaces.revokeFailed') || 'Failed to cancel invitation.');
        }
      });
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
