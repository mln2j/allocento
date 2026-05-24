import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslationService } from '../../core/services/translation.service';
import { AppInitializerService } from '../../core/services/app-initializer';
import { SyncService } from '../../core/services/sync';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [],
  templateUrl: './splash.component.html'
})
export class SplashComponent implements OnInit {
  private router = inject(Router);
  private translationService = inject(TranslationService);
  private appInitializer = inject(AppInitializerService);
  private syncService = inject(SyncService);

  // Reaktivni signali za UI
  currentKey = signal<string>('splash.initializing');
  progressWidth = signal<number>(0);

  async ngOnInit() {
    console.log('Allocento: Splash screen pokrenut. Prava provjera sustava počinje...');

    // 1. Inicijalizacija jezika
    this.translationService.initLanguage();

    try {
      // KORAK 1: Sigurnost i lokalna baza (IndexedDB)
      this.updateStep('splash.security', 15);
      await this.delay(500); // Kratki delay čisto da korisnik stigne pročitati što se događa

      this.updateStep('splash.offlineDb', 35);
      // Pokrećemo bazu, provjeru tokena i zdravlje servera unutar initializer-a
      // Vraća nam konačnu destinaciju kamo korisnik smije ići ('dashboard' ili 'login')
      const targetRoute = await this.appInitializer.initializeApp();

      // KORAK 2: Server i sinkronizacija (samo ako smo utvrdili da smo online)
      if (this.appInitializer.isOnlineMode && targetRoute === 'dashboard') {
        this.updateStep('splash.server', 60);
        await this.delay(400);

        this.updateStep('splash.syncing', 80);
        // Pokrećemo pozadinsku sinkronizaciju ako ima zapelih offline troškova
        await this.syncService.syncOfflineQueue();
      } else if (!this.appInitializer.isOnlineMode && targetRoute === 'dashboard') {
        // Ako smo offline ali imamo token, obavijesti korisnika kroz tekstualni korak
        this.updateStep('splash.offlineMode', 80); // Dodaj ovaj ključ u prijevode ako želiš (npr. "Rad u lokalnom načinu")
        await this.delay(800);
      }

      // KORAK 3: Priprema radnog prostora i završetak
      this.updateStep('splash.workspace', 95);
      await this.delay(400);

      this.updateStep('splash.ready', 100);
      await this.delay(300);

      // SVE JE GOTOVO -> Idemo na Dashboard ili Login
      console.log(`Allocento: Bootstrap završen. Preusmjeravanje na: /${targetRoute}`);

      if (targetRoute === 'login') {
        this.router.navigate(['/auth/login']); // Prilagodi točnoj ruti za login
      } else {
        this.router.navigate(['/dashboard']);
      }

    } catch (error) {
      console.error('Kritična greška na Splash screenu:', error);
      // U slučaju bilo kakvog raspada, baci ga na login kako aplikacija ne bi ostala visiti
      this.router.navigate(['/auth/login']);
    }
  }

  // Pomoćna metoda za dohvat prijevoda u HTML-u
  t(key: string): string {
    return this.translationService.translate(key);
  }

  /**
   * Pomoćna metoda za ažuriranje stanja na ekranu
   */
  private updateStep(key: string, progress: number) {
    this.currentKey.set(key);
    this.progressWidth.set(progress);
  }

  /**
   * Umjetni delay kako koraci ne bi proletjeli u milisekundi ako je PC prebrz
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
