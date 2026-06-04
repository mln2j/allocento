import { Routes } from '@angular/router';
import { SplashPage } from './pages/splash/splash.page';
import { AppShellComponent } from './core/layout/app-shell/app-shell.component';
import { ErrorPage } from './pages/error/error.page';
import { inject } from '@angular/core';
import { AppInitializerService } from './core/services/app-initializer'; // Prilagodi putanju ako treba
import { Router } from '@angular/router';
export const routes: Routes = [
  // 1. Ako je URL potpuno prazan, baci na splash
  { path: '', redirectTo: 'splash', pathMatch: 'full' },

  // 2. Početni ekran i kritične rute (Statički importi)
  { path: 'splash', component: SplashPage },
  { path: 'error', component: ErrorPage },

  // 3. Auth rute
  {
    path: 'auth',
    loadComponent: () => import('./core/layout/auth-shell/auth-shell.component').then(m => m.AuthShellComponent),
    children: [
      {
        path: 'login',
        loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
      },
      {
        path: 'register',
        loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage)
      }
    ]
  },

  // 4. Zaštićene aplikacijske rute
  {
    path: '',
    component: AppShellComponent,
    canActivate: [
      () => {
        const initializer = inject(AppInitializerService);
        const router = inject(Router);

        if (!initializer.isOnlineMode) {
          // Ovdje po potrebi rješavaš krizni scenarij
        }

        return true;
      }
    ],
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
      // --- NOVE WORKSPACES RUTE (ZAMIJENE ZA HOUSEHOLD I ORG) ---
      {
        path: 'workspaces',
        loadComponent: () => import('./pages/workspaces/workspaces.page').then(m => m.WorkspacesPage)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/setttings/settings.page').then(m => m.SettingsPage)
      }
    ]
  },

  // 5. "Catch-all"
  { path: '**', redirectTo: 'splash' }
];
