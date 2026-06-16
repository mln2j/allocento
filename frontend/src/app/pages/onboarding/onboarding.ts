import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorkspaceRepository } from '../../core/repositories/workspace.repository';
import { WorkspaceService } from '../../core/services/workspace.service';
import { AccountRepository } from '../../core/repositories/account.repository';
import { TranslationService } from '../../core/services/translation.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from '../../core/services/toast.service';

interface AccountOption {
  id: string;
  nameKey: string;
  descKey: string;
  type: 'checking' | 'savings' | 'cash' | 'credit' | 'investment' | 'other';
  selected: boolean;
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboarding.html'
})
export class Onboarding {
  private workspaceRepo = inject(WorkspaceRepository);
  private workspaceService = inject(WorkspaceService);
  private accountRepo = inject(AccountRepository);
  private translationService = inject(TranslationService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  step = signal<number>(1);
  loading = signal(false);
  selectedWorkspaceType: string = '';
  
  accountOptions = signal<AccountOption[]>([]);

  t(key: string): string {
    return this.translationService.translate(key);
  }

  selectType(type: 'personal' | 'household' | 'company') {
    if (this.loading()) return;
    this.loading.set(true);
    this.selectedWorkspaceType = type;

    const nameMap = {
      'personal': this.t('onboarding.personal'),
      'household': this.t('onboarding.household'),
      'company': this.t('onboarding.company')
    };

    this.workspaceRepo.createWorkspace({
      name: nameMap[type],
      type: type,
      currency: 'EUR'
    }).subscribe({
      next: (ws) => {
        this.workspaceService.setActiveWorkspace(ws);
        
        this.workspaceRepo.setFavoriteWorkspace(ws.id).subscribe({
          next: () => {
            this.prepareStep2(type);
          },
          error: () => {
            this.prepareStep2(type);
          }
        });
      },
      error: () => {
        this.loading.set(false);
        this.toastService.error(this.t('common.error') || 'Došlo je do greške prilikom kreiranja prostora. Pokušajte ponovno.');
      }
    });
  }

  private prepareStep2(type: string) {
    let options: AccountOption[] = [];
    if (type === 'personal' || type === 'household') {
      options = [
        { id: 'wallet', nameKey: 'onboarding.wallet', descKey: 'onboarding.walletDesc', type: 'cash', selected: true },
        { id: 'checking', nameKey: 'onboarding.checking', descKey: 'onboarding.checkingDesc', type: 'checking', selected: true },
        { id: 'savings', nameKey: 'onboarding.savings', descKey: 'onboarding.savingsDesc', type: 'savings', selected: false }
      ];
    } else if (type === 'company') {
      options = [
        { id: 'business', nameKey: 'onboarding.businessAccount', descKey: 'onboarding.businessAccountDesc', type: 'checking', selected: true },
        { id: 'pettyCash', nameKey: 'onboarding.pettyCash', descKey: 'onboarding.pettyCashDesc', type: 'cash', selected: true }
      ];
    }
    this.accountOptions.set(options);
    this.loading.set(false);
    this.step.set(2);
  }

  finish() {
    if (this.loading()) return;
    this.loading.set(true);

    const selectedAccounts = this.accountOptions().filter(opt => opt.selected);
    
    if (selectedAccounts.length === 0) {
      window.location.href = '/splash';
      return;
    }

    const createObservables = selectedAccounts.map(acc => {
      const payload = {
        name: this.t(acc.nameKey),
        type: acc.type,
        currency: 'EUR',
        balance: 0,
        is_primary: acc.type === 'checking'
      };
      return this.accountRepo.create(payload).pipe(
        catchError(err => of(null)) // ignore individual errors so forkJoin completes
      );
    });

    forkJoin(createObservables).subscribe({
      next: () => {
        this.loading.set(false);
        window.location.href = '/splash';
      },
      error: () => {
        this.loading.set(false);
        window.location.href = '/splash';
      }
    });
  }
}
