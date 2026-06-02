import { Routes } from '@angular/router';
import { SplashComponent } from './features/splash/splash.component';
import { AppShellComponent } from './core/layout/app-shell/app-shell.component';
import { ErrorComponent } from './features/error/error.component';
import { inject } from '@angular/core';
import { AppInitializerService } from './core/services/app-initializer'; // Prilagodi putanju ako treba
import { Router } from '@angular/router';

export const routes: Routes = [
  // 1. Ako je URL potpuno prazan, baci na splash
  { path: '', redirectTo: 'splash', pathMatch: 'full' },

  // 2. Početni ekran i kritične rute (Statički importi)
  { path: 'splash', component: SplashComponent },
  { path: 'error', component: ErrorComponent },

  // 3. Auth rute
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
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      }
    ]
  },

  // 5. "Catch-all"
  { path: '**', redirectTo: 'splash' }
];
