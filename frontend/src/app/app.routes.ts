import { Routes } from '@angular/router';
import { SplashComponent } from './features/splash/splash.component';

export const routes: Routes = [
  // Privremeno imamo samo Splash Screen radi razvoja i dizajniranja
  { path: 'splash', component: SplashComponent },
  { path: '', redirectTo: 'splash', pathMatch: 'full' },

  // Sve ostale rute privremeno bacaju natrag na splash
  { path: '**', redirectTo: 'splash' }
];


