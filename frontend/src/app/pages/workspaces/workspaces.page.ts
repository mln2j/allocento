import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { WorkspaceRepository, Workspace } from '../../core/repositories/workspace.repository';
import { AccountRepository } from '../../core/repositories/account.repository';
import { TranslationService } from '../../core/services/translation.service';
import { LoadingService } from '../../core/services/loading/loading.service';
import { AppInitializerService } from '../../core/services/app-initializer';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { ModalComponent } from '../../shared/modal/modal.component';
import { SelectComponent } from '../../shared/select/select.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ModalComponent, SelectComponent, RouterModule],
  templateUrl: './workspaces.page.html',
})
export class WorkspacesPage implements OnInit, OnDestroy {
  private workspaceRepo = inject(WorkspaceRepository);
  private accountRepo = inject(AccountRepository);
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
  accountsList = signal<any[]>([]);

  editModalAccounts = computed(() => {
    const ws = this.selectedWorkspace();
    const linkedAccounts = ws?.accounts || [];
    const manageableAccounts = this.accountsList();

    const allAccountsMap = new Map<number, any>();
    
    // Dodajemo sve račune kojima korisnik upravlja, ALI SAMO ako su osobni (personal)
    manageableAccounts.forEach(acc => {
      if (acc.owning_workspace?.type === 'personal') {
        allAccountsMap.set(acc.id, acc);
      }
    });

    // Dodajemo povezane račune (ako slučajno nisu u listi manageable, npr. tuđi)
    linkedAccounts.forEach((acc: any) => {
      if (!allAccountsMap.has(acc.id)) {
         allAccountsMap.set(acc.id, acc);
      }
    });

    return Array.from(allAccountsMap.values()).sort((a, b) => {
       if (a.owning_workspace?.type === 'personal' && b.owning_workspace?.type !== 'personal') return -1;
       if (a.owning_workspace?.type !== 'personal' && b.owning_workspace?.type === 'personal') return 1;
       return a.name.localeCompare(b.name);
    });
  });
  workspaceForm!: FormGroup;

  activeWorkspaceId = computed(() => this.workspaceService.activeWorkspace()?.id);

  isLoading = signal<boolean>(false);
  isLoadingDetails = false;
  isSaving = false;
  
  isModalOpen = false;
  editingWorkspaceId: string | number | null = null;
  selectedAccountsMap: Record<number, boolean> = {};
  initialAccountsMap: Record<number, boolean> = {};

  isOnline = signal<boolean>(true);

  selectedWorkspace = signal<Workspace | null>(null);

  sortedMembers = computed(() => {
    const ws = this.selectedWorkspace();
    if (!ws || !ws.users) return [];

    return [...ws.users].sort((a, b) => {
      const roleOrder: Record<string, number> = {
        'owner': 1,
        'manager': 2,
        'member': 3
      };
      
      const roleA = a.pivot?.role || 'member';
      const roleB = b.pivot?.role || 'member';
      
      if (roleOrder[roleA] !== roleOrder[roleB]) {
        return roleOrder[roleA] - roleOrder[roleB];
      }
      
      return a.name.localeCompare(b.name);
    });
  });

  inviteEmail = '';

  pendingInvitations = signal<any[]>([]);
  isInviteModalOpen = false;
  inviteRole = 'member';

  isMemberModalOpen = false;
  selectedMember: any = null;
  selectedMemberRole = 'member';

  get typeOptions() {
    const options = [
      { value: 'household', label: this.t('workspaces.types.household') || 'Household' },
      { value: 'company', label: this.t('workspaces.types.company') || 'Company' }
    ];
    if (this.editingWorkspaceId && this.workspaceForm?.get('type')?.value === 'personal') {
      options.unshift({ value: 'personal', label: this.t('workspaces.types.personal') || 'Personal' });
    }
    return options;
  }

  get editRoleOptions() {
    return [
      { value: 'member', label: this.t('workspaces.roles.member') || 'Član' },
      { value: 'manager', label: this.t('workspaces.roles.manager') || 'Menadžer' },
      { value: 'owner', label: this.t('workspaces.roles.owner') || 'Vlasnik' }
    ];
  }

  get inviteRoleOptions() {
    const opts = [
      { value: 'member', label: this.t('workspaces.roles.member') || 'Član' }
    ];
    // Managers cannot invite other managers
    if (this.selectedWorkspace()?.pivot?.role === 'owner') {
      opts.push({ value: 'manager', label: this.t('workspaces.roles.manager') || 'Menadžer' });
    }
    return opts;
  }

  ngOnInit() {
    this.isOnline.set(this.appInitializer.isOnlineMode);
    this.initForm();
    this.loadWorkspaces();
    this.loadAccounts();

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

  setActive() {
    const ws = this.selectedWorkspace();
    if (ws) {
      this.workspaceService.setActiveWorkspace(ws);
      this.toastService.success(this.t('workspaces.setActiveSuccess'));
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
      currency: ['EUR', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
      enabled_features: [['categories', 'projects', 'reports']]
    });
  }

  toggleFeature(feature: string) {
    const current = this.workspaceForm.get('enabled_features')?.value || [];
    if (current.includes(feature)) {
      this.workspaceForm.patchValue({
        enabled_features: current.filter((f: string) => f !== feature)
      });
    } else {
      this.workspaceForm.patchValue({
        enabled_features: [...current, feature]
      });
    }
    this.workspaceForm.markAsDirty();
  }

  hasFeatureForm(feature: string): boolean {
    const current = this.workspaceForm.get('enabled_features')?.value || [];
    return current.includes(feature);
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
        this.toastService.error(this.t('workspaces.loadFailed'));
      }
    });
  }

  loadAccounts() {
    this.accountRepo.listAllManageable().subscribe(accs => {
      this.accountsList.set(accs);
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
    const id = workspace.id;
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
        this.toastService.error(this.t('workspaces.loadDetailsFailed'));
      }
    });
  }

  closeDetails() {
    this.selectedWorkspace.set(null);
    this.loadWorkspaces();
  }


  removeMember(userId: number) {
    if (!this.isOnline()) {
      this.toastService.warning(this.t('workspaces.offlineNotice'));
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

      const wsId = currentWS.id;
      this.loadingService.show();

      this.workspaceRepo.removeMember(wsId, userId).subscribe({
        next: () => {
          this.loadingService.hide();
          this.toastService.success(this.t('workspaces.removeMemberSuccess'));
          const updated = { ...currentWS };
          if (updated.users) {
            updated.users = updated.users.filter((u: any) => u.id !== userId);
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
      this.toastService.warning(this.t('workspaces.offlineNotice'));
      return;
    }
    this.editingWorkspaceId = null;
    this.selectedAccountsMap = {};
    this.initialAccountsMap = {};
    this.workspaceForm.reset({
      type: 'household',
      currency: 'EUR'
    });
    this.isModalOpen = true;
  }

  openEditModal() {
    if (!this.isOnline()) {
      this.toastService.warning(this.t('workspaces.offlineNotice'));
      return;
    }
    const ws = this.selectedWorkspace();
    if (!ws) return;

    this.editingWorkspaceId = ws.id;
    this.workspaceForm.patchValue({
      name: ws.name,
      type: ws.type,
      currency: ws.currency || 'EUR',
      enabled_features: ws.enabled_features && ws.enabled_features.length > 0 
        ? ws.enabled_features 
        : ['categories', 'projects', 'reports']
    });

    if (ws.type === 'personal') {
      this.workspaceForm.get('type')?.disable();
    } else {
      this.workspaceForm.get('type')?.enable();
    }

    this.selectedAccountsMap = {};
    this.initialAccountsMap = {};
    if (ws.accounts) {
      ws.accounts.forEach((a: any) => {
        this.selectedAccountsMap[a.id] = true;
        this.initialAccountsMap[a.id] = true;
      });
    }

    this.isModalOpen = true;
  }

  toggleAccountSelection(id: number) {
    const acc = this.accountsList().find(a => a.id === id);
    if (!acc) return;

    // Check if the user is trying to unselect an account that belongs to this workspace
    if (this.selectedAccountsMap[id] && (String(acc.owning_workspace) === String(this.editingWorkspaceId) || String(acc.workspace_id) === String(this.editingWorkspaceId))) {
      this.dialogService.confirm(
        this.t('common.delete') || 'Obriši',
        this.t('workspaces.deleteOwnedAccountConfirm') || 'Ovaj račun je kreiran unutar ovog prostora. Njegovim uklanjanjem će se račun trajno izbrisati. Želite li nastaviti?',
        this.t('common.delete') || 'Obriši',
        this.t('common.cancel') || 'Odustani'
      ).subscribe(confirmed => {
        if (confirmed) {
          this.loadingService.show();
          this.accountRepo.delete(acc.id).subscribe({
            next: () => {
              this.loadingService.hide();
              this.toastService.success(this.t('workspaces.deleteOwnedAccountSuccess'));
              this.selectedAccountsMap[id] = false;
              delete this.initialAccountsMap[id];
              this.accountsList.update(list => list.filter(a => a.id !== id));
            },
            error: (err) => {
              this.loadingService.hide();
              this.toastService.error(this.t('workspaces.deleteOwnedAccountFailed'));
              console.error(err);
            }
          });
        }
      });
      return;
    }

    this.selectedAccountsMap[id] = !this.selectedAccountsMap[id];
  }

  closeModal() {
    this.isModalOpen = false;
  }

  openInviteModal() {
    if (!this.isOnline()) {
      this.toastService.warning(this.t('workspaces.offlineNotice'));
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
      this.toastService.warning(this.t('workspaces.offlineNotice'));
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

    const wsId = currentWS.id;
    const userId = this.selectedMember.id;
    
    if (this.selectedMember.pivot?.role === this.selectedMemberRole) {
       this.closeMemberModal();
       return;
    }

    const performUpdate = () => {
      this.loadingService.show();
      this.workspaceRepo.updateMemberRole(wsId, userId, this.selectedMemberRole).subscribe({
        next: () => {
           this.loadingService.hide();
           this.toastService.success(this.t('workspaces.roleUpdateSuccess'));
           this.closeMemberModal();
           this.viewDetails(currentWS);
        },
        error: (err) => {
           this.loadingService.hide();
           this.toastService.error(err.error?.message || 'Failed to update role.');
        }
      });
    };

    if (this.selectedMemberRole === 'owner') {
      this.dialogService.confirm(
        this.t('workspaces.transferOwnership') || 'Prijenos vlasništva',
        this.t('workspaces.transferOwnershipConfirm') || 'Jeste li sigurni da želite predati vlasništvo ovom korisniku? Vi ćete postati menadžer.',
        this.t('common.accept') || 'Da',
        this.t('common.cancel') || 'Odustani'
      ).subscribe(confirmed => {
        if (confirmed) {
          performUpdate();
        }
      });
    } else {
      performUpdate();
    }
  }

  deleteWorkspace() {
    if (!this.isOnline()) {
      this.toastService.warning(this.t('workspaces.offlineNotice'));
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

      const id = currentWS.id;
      this.loadingService.show();

      this.workspaceRepo.deleteWorkspace(id).subscribe({
        next: () => {
          this.loadingService.hide();
          this.toastService.success(this.t('workspaces.deleteSuccess'));
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
      this.toastService.warning(this.t('workspaces.offlineNotice'));
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

      const id = currentWS.id;
      this.loadingService.show();

      this.workspaceRepo.leaveWorkspace(id).subscribe({
        next: () => {
          this.loadingService.hide();
          this.toastService.success(this.t('workspaces.leaveSuccess'));
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
      this.toastService.warning(this.t('workspaces.offlineNotice'));
      return;
    }

    const currentWS = this.selectedWorkspace();
    if (!currentWS || !this.inviteEmail) return;

    const wsId = currentWS.id;
    this.loadingService.show();

    this.workspaceRepo.inviteMember(wsId, this.inviteEmail, this.inviteRole).subscribe({
      next: () => {
        this.loadingService.hide();
        this.toastService.success(this.t('workspaces.inviteSuccess'));
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
      this.toastService.warning(this.t('workspaces.offlineNotice'));
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

      const wsId = currentWS.id;
      this.loadingService.show();

      this.workspaceRepo.deleteInvitation(wsId, invitationId).subscribe({
        next: () => {
          this.loadingService.hide();
          this.toastService.success(this.t('workspaces.revokeSuccess'));
          this.loadPendingInvitations(wsId);
        },
        error: (err) => {
          this.loadingService.hide();
          this.toastService.error(err.error?.message || this.t('workspaces.revokeFailed') || 'Failed to cancel invitation.');
        }
      });
    });
  }

  saveWorkspace() {
    if (this.workspaceForm.invalid) return;

    const payload = this.workspaceForm.getRawValue(); // use getRawValue to get disabled 'type' field
    this.isSaving = true;

    if (this.editingWorkspaceId) {
      this.workspaceRepo.updateWorkspace(this.editingWorkspaceId, payload).subscribe({
        next: (ws) => {
          this.handleAccountLinks(ws);
        },
        error: (err) => {
          console.error(err);
          this.toastService.error(err.error?.message || this.t('workspaces.createFailed') || 'Operation failed.');
          this.isSaving = false;
        }
      });
    } else {
      this.workspaceRepo.createWorkspace(payload).subscribe({
        next: (ws) => {
          this.toastService.success(this.t('workspaces.createSuccess'));
          this.isSaving = false;
          this.closeModal();
          this.loadWorkspaces();
        },
        error: (err) => {
          console.error(err);
          this.toastService.error(err.error?.message || this.t('workspaces.createFailed') || 'Failed to create workspace.');
          this.isSaving = false;
        }
      });
    }
  }

  private handleAccountLinks(ws: Workspace) {
    const wsId = String(ws.id);
    const calls: any[] = [];

    this.editModalAccounts().forEach(acc => {
      const wasSelected = !!this.initialAccountsMap[acc.id];
      const isSelected = !!this.selectedAccountsMap[acc.id];

      if (isSelected && !wasSelected) {
        calls.push(this.accountRepo.shareWithWorkspace(wsId, acc.id));
      } else if (!isSelected && wasSelected) {
        // Owned accounts are already deleted immediately in toggleAccountSelection, so we only handle unshare here
        calls.push(this.accountRepo.unshareFromWorkspace(wsId, acc.id));
      }
    });

    if (calls.length > 0) {
      forkJoin(calls).subscribe({
        next: () => {
          this.finishWorkspaceEdit(true);
        },
        error: () => {
          this.toastService.warning(this.t('workspaces.updateLinksFailed'));
          this.finishWorkspaceEdit(false);
        }
      });
    } else {
      this.finishWorkspaceEdit(true);
    }
  }

  private finishWorkspaceEdit(success: boolean) {
    if (success) {
      this.toastService.success(this.t('workspaces.updateSuccess'));
    }
    this.isSaving = false;
    this.closeModal();
    const ws = this.selectedWorkspace();
    if (ws) {
      this.viewDetails(ws);
    }
    this.loadWorkspaces();
  }

  formatAmount(amount: number | string | undefined): string {
    if (amount === undefined) return '0,00';
    const val = typeof amount === 'string' ? parseFloat(amount) : amount;
    return val.toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
