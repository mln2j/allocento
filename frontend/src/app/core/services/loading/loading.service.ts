import { Injectable, signal, inject } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private router = inject(Router);

  // Javni signal koji kontrolira prikaz loadera
  private _loading = signal<boolean>(false);
  loading = this._loading.asReadonly();

  private isRouting = false;
  private showTimeout: any = null;

  constructor() {
    this.router.events.pipe(
      filter(event =>
        event instanceof NavigationStart ||
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      )
    ).subscribe(event => {
      if (event instanceof NavigationStart) {
        // Ne pokazuj loader pri prvoj navigaciji sa splash screena
        if (this.router.url === '/splash' || this.router.url === '/') {
          return;
        }
        this.isRouting = true;
        this._loading.set(true);
      } else {
        this.isRouting = false;
        this.stopLoading();
      }
    });
  }

  private stopLoading() {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
    this._loading.set(false);
  }

  // Za POST/PUT/DELETE HTTP zahtjeve (mutacije)
  show() {
    this._loading.set(true);
  }

  hide() {
    if (!this.isRouting) {
      this.stopLoading();
    }
  }
}
