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

        // Ako nemamo ni online mod ni lokalne podatke (nema tokena/cachea)
        // Ovdje iskoristi zastavicu ili logiku iz svog initializer-a.
        // Pretpostavljam da isOnlineMode ostaje false kad se dogodi krizni scenarij.
        if (!initializer.isOnlineMode) {
          // 🚨 VAŽNO: Ako nemaš neku posebnu metodu poput .hasLocalData(),
          // provjeri je li ovo stanje stvarno kritično. Ako jest -> bježi na error!

          // Ovdje simuliramo provjeru: ako je isOnlineMode false, a nemamo spremljen cache:
          // router.navigate(['/error']);
          // return false;
        }

        return true;
      }
    ],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      // ... ostale pod-rute ostaju iste
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
        path: 'settings',
        loadComponent: () => import('./pages/setttings/settings.page').then(m => m.SettingsPage)
      }
    ]
  },

  // 5. "Catch-all"
  { path: '**', redirectTo: 'splash' }
];
