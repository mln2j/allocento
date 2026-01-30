import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { AccountsComponent } from './features/accounts/accounts.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { AccountCreateComponent } from './features/accounts/account-create/account-create.component';
import { AccountDetailComponent } from './features/accounts/account-detail/account-detail.component';
import { AccountEditComponent } from './features/accounts/account-edit/account-edit.component';
import { authGuard } from './core/guards/auth.guard';
import { AuthShellComponent } from './core/layout/auth-shell/auth-shell.component';
import { AppShellComponent } from './core/layout/app-shell/app-shell.component';
import { guestGuard } from './core/guards/guest.guard';
import {TransactionCreateComponent} from './features/transactions/transaction-create/transaction-create.component';
import {TransactionEditComponent} from './features/transactions/transaction-edit/transaction-edit.component';

export const routes: Routes = [
  {
    path: 'auth',
    component: AuthShellComponent,
    canActivate: [guestGuard],
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'accounts', component: AccountsComponent },
      { path: 'accounts/new', component: AccountCreateComponent },
      { path: 'accounts/:id', component: AccountDetailComponent },
      { path: 'accounts/:id/edit', component: AccountEditComponent },
      { 
        path: 'household', 
        loadComponent: () => import('./features/household/household.component').then(m => m.HouseholdComponent) 
      },
      { 
        path: 'organization', 
        loadComponent: () => import('./features/organization/organization.component').then(m => m.OrganizationComponent) 
      },
      { 
        path: 'transactions', 
        loadComponent: () => import('./features/transactions/transactions.component').then(m => m.TransactionsComponent) 
      },
      { path: 'transactions/new', component: TransactionCreateComponent },
      { path: 'transactions/:id/edit', component: TransactionEditComponent },
      { 
        path: 'profile', 
        loadComponent: () => import('./features/profile/profile-view/profile-view.component').then(m => m.ProfileViewComponent) 
      },
      { 
        path: 'profile/edit', 
        loadComponent: () => import('./features/profile/profile-edit/profile-edit.component').then(m => m.ProfileEditComponent) 
      },
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];
