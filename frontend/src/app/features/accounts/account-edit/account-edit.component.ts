import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AccountRepository } from '../../../core/repositories/account.repository';
import { Account } from '../../../core/models/account.model';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { API_BASE_URL } from '../../../core/api.config';

@Component({
  selector: 'app-account-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  templateUrl: './account-edit.component.html',
  styleUrl: './account-edit.component.scss'
})
export class AccountEditComponent implements OnInit {
  accountId: number | null = null;
  account: Account | null = null;
  accountForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private accRepo: AccountRepository,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    this.accountForm = this.fb.group({
      name: ['', [Validators.required]],
      type: ['', [Validators.required]],
      currency: ['EUR', [Validators.required]],
      balance: [0, [Validators.required]]
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
    if (this.accountForm.invalid || !this.accountId) return;

    this.http.put(`${API_BASE_URL}/accounts/${this.accountId}`, this.accountForm.value).subscribe({
      next: () => {
        this.snackBar.open('Account updated!', 'Close', { duration: 3000 });
        this.router.navigate(['/accounts', this.accountId]);
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error updating account', 'Close', { duration: 3000 });
      }
    });
  }
}
