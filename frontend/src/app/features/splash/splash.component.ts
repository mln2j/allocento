import {Component, inject, OnInit, signal} from '@angular/core';
import {Router} from '@angular/router';
import {AuthService} from '../../core/services/auth.service';
import {TranslationService} from '../../core/services/translation.service';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [],
  templateUrl: './splash.component.html'
})

export class SplashComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);

  // Reaktivni signali za UI
  currentKey = signal<string>('splash.initializing');
  progressWidth = signal<number>(0);

  private loadingSteps = [
    { key: 'splash.security', duration: 700 },
    { key: 'splash.session', duration: 800 },
    { key: 'splash.server', duration: 900 },
    { key: 'splash.offlineDb', duration: 600 },
    { key: 'splash.syncing', duration: 750 },
    { key: 'splash.settings', duration: 500 },
    { key: 'splash.workspace', duration: 600 },
    { key: 'splash.ready', duration: 400 }
  ];

  ngOnInit() {
    console.log('Allocento: Splash screen pokrenut. Priprema aplikacije...');
    this.translationService.initLanguage();
    this.runLoadingSequence(0);
  }

  // Pomoćna metoda za dohvat prijevoda u HTML-u
  t(key: string): string {
    return this.translationService.translate(key);
  }

  private runLoadingSequence(stepIndex: number) {
    if (stepIndex >= this.loadingSteps.length) {
      // Privremeno komentiramo navigaciju kako bi splash screen ostao vidljiv za testiranje i dizajn
      // const targetRoute = this.authService.isAuthenticated() ? '/dashboard' : '/auth/login';
      // this.router.navigate([targetRoute]);
      console.log('Allocento: Priprema završena. Splash screen ostaje vidljiv radi dizajna.');
      return;
    }

    const step = this.loadingSteps[stepIndex];
    this.currentKey.set(step.key);

    const progress = Math.round(((stepIndex + 1) / this.loadingSteps.length) * 100);
    this.progressWidth.set(progress);

    setTimeout(() => {
      this.runLoadingSequence(stepIndex + 1);
    }, step.duration);
  }
}



