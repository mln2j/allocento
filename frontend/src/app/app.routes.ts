import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { AccountsComponent } from './features/accounts/accounts.component';
import { LoginComponent } from './features/auth/login/login.component';
import { AccountCreateComponent } from './features/accounts/account-create/account-create.component';
import { AccountDetailComponent } from './features/accounts/account-detail/account-detail.component';
import { AccountEditComponent } from './features/accounts/account-edit/account-edit.component';
import { authGuard } from './core/guards/auth.guard';
import { AuthShellComponent } from './core/layout/auth-shell/auth-shell.component';
import { AppShellComponent } from './core/layout/app-shell/app-shell.component';

export const routes: Routes = [
  // AUTH layout (bez nav-a)
  {
    path: 'auth',
    component: AuthShellComponent,
    children: [
      { path: 'login', component: LoginComponent },
      // { path: 'register', component: RegisterComponent },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // APP layout (s nav-om, zaštićen guardom)
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
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];
