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

  // Zastavice za kontrolu minimalnog trajanja (250ms)
  private isLocked = false;
  private shouldHideAfterUnlock = false;

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
        this.startLoading();
      } else {
        // Kada ruter završi, nemoj odmah gasiti nego samo signaliziraj završetak tog dijela
        this.stopLoading();
      }
    });
  }

  /**
   * Pokreće loading i zaključava ga na minimalno 250ms
   */
  private startLoading() {
    if (!this._loading()) {
      this._loading.set(true);
      this.isLocked = true;
      this.shouldHideAfterUnlock = false;

      // Pokreni timer od 250ms koji drži loader zaključanim bez prekida
      setTimeout(() => {
        this.isLocked = false;
        // Kada se otključa, provjeri je li u međuvremenu stigao zahtjev da se ugasi
        if (this.shouldHideAfterUnlock && this.activeRequests === 0) {
          this._loading.set(false);
        }
      }, 250); // Minimalno trajanje loadera
    }
  }

  /**
   * Pokušava ugasiti loading, ali poštuje zaključavanje i aktivne HTTP zahtjeve
   */
  private stopLoading() {
    if (this.isLocked || this.activeRequests > 0) {
      // Ako je zaključan ili još uvijek čekamo Laravel API, samo zabilježi da želimo ugasiti čim bude slobodno
      this.shouldHideAfterUnlock = true;
    } else {
      // Ako je sve čisto i timer je prošao, gasi odmah
      this._loading.set(false);
    }
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
