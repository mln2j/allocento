import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { AccountsComponent } from './features/accounts/accounts.component';
import { LoginComponent } from './features/auth/login/login.component';
import { AccountCreateComponent } from './features/accounts/account-create/account-create.component';
import { AccountDetailComponent } from './features/accounts/account-detail/account-detail.component';

export const routes: Routes = [
  { path: 'auth/login', component: LoginComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'accounts', component: AccountsComponent },
  { path: 'accounts/new', component: AccountCreateComponent },
  { path: 'accounts/:id', component: AccountDetailComponent },
  { path: '**', redirectTo: 'dashboard' },
];
