import { Routes } from '@angular/router';
import { SplashComponent } from './features/splash/splash.component';
import { AppShellComponent } from './core/layout/app-shell/app-shell.component';

export const routes: Routes = [
  // 1. Ako je URL potpuno prazan (localhost:4200), ODMAH baci na splash
  { path: '', redirectTo: 'splash', pathMatch: 'full' },

  // 2. Početni ekran koji radi provjere i odlučuje kamo dalje
  { path: 'splash', component: SplashComponent },

  // 3. Auth rute (Login i Register) - koriste AuthShell layout
  {
    path: 'auth',
    loadComponent: () => import('./core/layout/auth-shell/auth-shell.component').then(m => m.AuthShellComponent),
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
      }
    ]
  },

  // 4. Zaštićene aplikacijske rute - ulaze se unutar AppShell-a SAMO ako prođu splash/guard
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'accounts',
        loadComponent: () => import('./features/accounts/accounts.component').then(m => m.AccountsComponent)
      },
      {
        path: 'transactions',
        loadComponent: () => import('./features/transactions/transactions.component').then(m => m.TransactionsComponent)
      },
      {
        path: 'household',
        loadComponent: () => import('./features/household/household.component').then(m => m.HouseholdComponent)
      },
      {
        path: 'organization',
        loadComponent: () => import('./features/organization/organization.component').then(m => m.OrganizationComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile-view/profile-view.component').then(m => m.ProfileViewComponent)
      }
    ]
  },

  // 5. "Catch-all" - ako netko upiše bilo što nepoznato, vrati ga na splash provjeru
  { path: '**', redirectTo: 'splash' }
];
