import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AccountRepository } from '../../../core/repositories/account.repository';
import { Account } from '../../../core/models/account.model';

@Component({
  selector: 'app-account-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './account-edit.component.html',
  styleUrl: './account-edit.component.scss',
})
export class AccountEditComponent implements OnInit {
  form!: FormGroup;
  isLoading = true;
  isSubmitting = false;
  accountId!: number;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private accountRepo: AccountRepository,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      type: ['personal', Validators.required],
      currency: ['EUR', Validators.required],
      openingBalance: [0, [Validators.required]],
      budgetLimit: [null],
    });

    const idFromRoute = this.route.snapshot.paramMap.get('id');
    this.accountId = Number(idFromRoute);

    this.accountRepo.getById(this.accountId).subscribe({
      next: (account: Account) => {
        this.form.patchValue({
          name: account.name,
          type: account.type,
          currency: account.currency,
          openingBalance: account.openingBalance,
          budgetLimit: account.budgetLimit,
        });
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.router.navigate(['/accounts']);
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const value = this.form.value;

    const payload: Partial<Account> = {
      name: value.name,
      type: value.type,
      currency: value.currency,
      openingBalance: value.openingBalance,
      budgetLimit: value.budgetLimit,
    };

    this.accountRepo.update(this.accountId, payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/accounts', this.accountId]);
      },
      error: () => {
        this.isSubmitting = false;
      },
    });
  }


  onCancel(): void {
    this.router.navigate(['/accounts', this.accountId]);
  }
}
