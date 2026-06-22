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

  // 2. PoÄetni ekran i kritiÄne rute (StatiÄki importi)
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
      },
      {
        path: 'verify-email',
        loadComponent: () => import('./pages/verify-email/verify-email.page').then(m => m.VerifyEmail)
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./pages/forgot-password/forgot-password.page').then(m => m.ForgotPassword)
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./pages/reset-password/reset-password.page').then(m => m.ResetPassword)
      },
      {
        path: 'onboarding',
        loadComponent: () => import('./pages/onboarding/onboarding.page').then(m => m.Onboarding)
      }
    ]
  },

  // 4. ZaÅ¡tiÄ‡ene aplikacijske rute
  {
    path: '',
    component: AppShellComponent,
    canActivate: [
      () => {
        const initializer = inject(AppInitializerService);
        const router = inject(Router);

        if (!initializer.isOnlineMode) {
          // Ovdje po potrebi rjeÅ¡avaÅ¡ krizni scenarij
        }

        return true;
      }
    ],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage)
      },
      {
        path: 'accounts',
        loadComponent: () => import('./pages/accounts/accounts.page').then(m => m.AccountsPage)
      },
      {
        path: 'transactions',
        loadComponent: () => import('./pages/transactions/transactions.page').then(m => m.TransactionsPage)
      },
      // --- NOVE WORKSPACES RUTE (ZAMIJENE ZA HOUSEHOLD I ORG) ---
      {
        path: 'workspaces',
        loadComponent: () => import('./pages/workspaces/workspaces.page').then(m => m.WorkspacesPage)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage)
      },
      
      {
        path: 'reports',
        loadComponent: () => import('./pages/reports/reports.page').then(m => m.ReportsPage)
      },
      {
        path: 'projects', loadComponent: () => import('./pages/projects/projects.page').then(m => m.ProjectsPage) },
      { path: 'projects/:id', loadComponent: () => import('./pages/project-details/project-details.page').then(m => m.ProjectDetailsPage) },
      {
        path: 'categories', loadComponent: () => import('./pages/categories/categories.page').then(m => m.CategoriesPage) },
      { path: 'categories/:id', loadComponent: () => import('./pages/category-details/category-details.page').then(m => m.CategoryDetailsPage) }
    ]
  },

  // 5. "Catch-all"
  { path: '**', redirectTo: 'splash' }
];


