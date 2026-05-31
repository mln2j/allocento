import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AccountRepository } from '../../../core/repositories/account.repository';
import { API_BASE_URL } from '../../../core/api.config';
import { User } from '../../../core/models/user.model';
import { ContainerComponent } from '../../../core/layout/container/container.component';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-account-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ContainerComponent
  ],
  templateUrl: './account-create.component.html',
})
export class AccountCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private accountRepo = inject(AccountRepository);
  public router = inject(Router);
  private http = inject(HttpClient);
  private translationService = inject(TranslationService);

  accountForm: FormGroup;
  currentUser: User | null = null;
  submitting = false;
  errorMessage: string | null = null;

  constructor() {
    this.accountForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      type: ['personal', Validators.required],
      currency: ['EUR', Validators.required],
      balance: [null, [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.http.get<User>(`${API_BASE_URL}/user`).subscribe({
      next: (user) => {
        this.currentUser = user;
      },
      error: (err) => {
        console.error('Failed to fetch user context', err);
      }
    });
  }

  onSubmit(): void {
    if (this.accountForm.invalid || this.submitting) {
      this.accountForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = null;

    const payload = {
      name: this.accountForm.value.name,
      type: this.accountForm.value.type,
      currency: this.accountForm.value.currency,
      balance: Number(this.accountForm.value.balance ?? 0),
    };

    this.accountRepo.create(payload).subscribe({
      next: (account) => {
        this.submitting = false;
        this.router.navigate(['/accounts']);
      },
      error: (err) => {
        console.error('Error creating account', err);
        this.errorMessage = 'Failed to create account.';
        this.submitting = false;
      },
    });
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }
}
