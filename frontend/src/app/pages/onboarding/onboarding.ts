import { Component, inject, signal, HostListener } from '@angular/core';
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

interface CustomAccount {
  id: number;
  name: string;
  type: 'checking' | 'cash';
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

  customAccounts = signal<CustomAccount[]>([{ id: Date.now(), name: '', type: 'checking' }]);
  openDropdownIndex = signal<number | null>(null);

  @HostListener('document:click')
  onDocumentClick() {
    this.openDropdownIndex.set(null);
  }

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
    if (type === 'personal') {
      options = [
        { id: 'wallet', nameKey: 'onboarding.wallet', descKey: 'onboarding.walletDesc', type: 'cash', selected: true },
        { id: 'checking', nameKey: 'onboarding.checking', descKey: 'onboarding.checkingDesc', type: 'checking', selected: true },
        { id: 'savings', nameKey: 'onboarding.savings', descKey: 'onboarding.savingsDesc', type: 'savings', selected: false }
      ];
    } else if (type === 'household') {
      options = [
        { id: 'jointChecking', nameKey: 'onboarding.jointChecking', descKey: 'onboarding.jointCheckingDesc', type: 'checking', selected: true },
        { id: 'householdCash', nameKey: 'onboarding.householdCash', descKey: 'onboarding.householdCashDesc', type: 'cash', selected: true },
        { id: 'jointSavings', nameKey: 'onboarding.jointSavings', descKey: 'onboarding.jointSavingsDesc', type: 'savings', selected: false }
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

  onCustomAccountInput(index: number, value: string) {
    const current = [...this.customAccounts()];
    current[index].name = value;

    // Ako je upisan tekst i to je zadnji element, dodaj novi prazan ispod
    if (value.trim() !== '' && index === current.length - 1) {
      current.push({ id: Date.now(), name: '', type: 'checking' });
    }

    // Ako je input obrisan (prazan), a nije jedini/zadnji, ukloni ga
    if (value.trim() === '' && index < current.length - 1) {
      current.splice(index, 1);
    }

    this.customAccounts.set(current);
  }

  onCustomAccountTypeChange(index: number, value: 'checking' | 'cash') {
    const current = [...this.customAccounts()];
    current[index].type = value;
    this.customAccounts.set(current);
  }

  toggleDropdown(index: number, event: Event) {
    event.stopPropagation();
    if (this.openDropdownIndex() === index) {
      this.openDropdownIndex.set(null);
    } else {
      this.openDropdownIndex.set(index);
    }
  }

  selectCustomAccountType(index: number, type: 'checking' | 'cash', event: Event) {
    event.stopPropagation();
    this.onCustomAccountTypeChange(index, type);
    this.openDropdownIndex.set(null);
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

    this.customAccounts().forEach(acc => {
      if (acc.name.trim() !== '') {
        const payload = {
          name: acc.name.trim(),
          type: acc.type,
          currency: 'EUR',
          balance: 0,
          is_primary: acc.type === 'checking'
        };
        createObservables.push(this.accountRepo.create(payload).pipe(
          catchError(err => of(null))
        ));
      }
    });

    if (createObservables.length === 0) {
       this.loading.set(false);
       window.location.href = '/splash';
       return;
    }

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
