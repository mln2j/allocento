import { Injectable, signal, inject } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
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
        this.stopLoading();
      }
    });
  }

  /**
   * Pokreće loading s odgodom od 200ms
   */
  private startLoading() {
    if (this._loading() || this.showTimeout) {
      return;
    }

    this.showTimeout = setTimeout(() => {
      this.showTimeout = null;
      if (this.activeRequests > 0 || this.isRouting) {
        this._loading.set(true);
      }
    }, 200); // Odgodi prikazivanje za 200ms
  }

  /**
   * Pokušava ugasiti loading i čisti timer
   */
  private stopLoading() {
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
    this.stopLoading();
  }
}
