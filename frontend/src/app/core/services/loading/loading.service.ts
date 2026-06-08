import { Injectable, signal, inject } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private router = inject(Router);

  // Brojač aktivnih mrežnih zahtjeva
  private activeRequests = 0;

  // Javni signal koji kontrolira stakleni overlay u UI-ju
  private _loading = signal<boolean>(false);
  loading = this._loading.asReadonly();

  private isRouting = false;
  private showTimeout: any = null;
  private minDisplayTimeout: any = null; // Minimalno trajanje prikaza

  constructor() {
    // Slušamo ruter događaje za instantno paljenje na klik
    this.router.events.pipe(
      filter(event =>
        event instanceof NavigationStart ||
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      )
    ).subscribe(event => {
      if (event instanceof NavigationStart) {
        // Preskoči prikazivanje loadera ako navigiramo sa splash screena ili početne rute
        if (this.router.url === '/splash' || this.router.url === '/') {
          return;
        }
        this.isRouting = true;
        this.startLoading();
      } else {
        this.isRouting = false;
        this.tryStopLoading();
      }
    });
  }

  /**
   * Pokreće loading s odgodom od 200ms — sprječava flash za brze zahtjeve
   */
  private startLoading() {
    if (this.showTimeout) return;
    if (this._loading()) return; // Već prikazano, ne resetiraj min-timer

    this.showTimeout = setTimeout(() => {
      this.showTimeout = null;
      if (this.activeRequests > 0 || this.isRouting) {
        this._loading.set(true);
        // Nakon što se prikaže, postavi minimalno trajanje od 300ms
        this.minDisplayTimeout = setTimeout(() => {
          this.minDisplayTimeout = null;
          this.tryStopLoading();
        }, 300);
      }
    }, 200);
  }

  /**
   * Pokušava ugasiti loading — samo ako: nema aktivnih zahtjeva, nije routing, i min-timer je gotov
   */
  private tryStopLoading() {
    if (this.activeRequests > 0 || this.isRouting) return;
    if (this.minDisplayTimeout) return; // Čekaj minimalno trajanje

    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
    this._loading.set(false);
  }

  /**
   * Poziva se u interceptoru kad HTTP zahtjev krene
   */
  show() {
    this.activeRequests++;
    this.startLoading();
  }

  /**
   * Poziva se u interceptoru kad HTTP zahtjev završi
   */
  hide() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    this.tryStopLoading();
  }
}
