import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AccountRepository } from '../../../core/repositories/account.repository';
import { Account } from '../../../core/models/account.model';
import { ContainerComponent } from '../../../core/layout/container/container.component';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-account-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ContainerComponent
  ],
  templateUrl: './account-edit.component.html',
})
export class AccountEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  public router = inject(Router);
  private accRepo = inject(AccountRepository);
  private translationService = inject(TranslationService);

  accountId: number | null = null;
  account: Account | null = null;
  accountForm: FormGroup;
  submitting = false;
  errorMessage: string | null = null;

  constructor() {
    this.accountForm = this.fb.group({
      name: ['', [Validators.required]],
      type: ['', [Validators.required]],
      currency: ['EUR', [Validators.required]],
      balance: [null, [Validators.required]]
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.accountId = +idParam;
      this.loadAccount();
    }
  }

  loadAccount() {
    if (!this.accountId) return;
    this.accRepo.getById(this.accountId).subscribe({
      next: (acc) => {
        this.account = acc;
        this.accountForm.patchValue({
          name: acc.name,
          type: acc.type,
          currency: acc.currency,
          balance: acc.balance
        });
      }
    });
  }

  onSubmit() {
    if (this.accountForm.invalid || !this.accountId || this.submitting) return;

    this.submitting = true;
    this.errorMessage = null;

    this.accRepo.update(this.accountId, this.accountForm.value).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/accounts']);
      },
      error: (err) => {
        console.error('Error updating account', err);
        this.errorMessage = 'Failed to update account.';
        this.submitting = false;
      }
    });
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }
}
