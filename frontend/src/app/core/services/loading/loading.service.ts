import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, combineLatest, timer } from 'rxjs';
import { debounce, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  // Privatni stream koji prati broj aktivnih HTTP zahtjeva
  private activeRequests$ = new BehaviorSubject<number>(0);

  // Izloženi read-only signal kojeg tvoja nova LoadingComponent već sluša
  private _loading = signal<boolean>(false);
  loading = this._loading.asReadonly();

  constructor() {
    // Magija koja rješava "flash" efekt
    this.activeRequests$.pipe(
      debounce(count => {
        // Ako nema aktivnih zahtjeva, gasimo odmah (ili s minimalnim odmakom za uglađenost)
        if (count === 0) {
          return timer(400); // Drži loader otvorenim barem 400ms da animacija završi fluidno
        }
        // Ako se zahtjev pojavi, čekaj 250ms prije nego ga uopće prikažeš
        return timer(250);
      }),
      // Pretvaramo broj zahtjeva u čisti boolean (true ako je count > 0)
      map(count => count > 0)
    ).subscribe(shouldLoad => {
      // Ažuriramo signal koji dalje kontrolira UI
      this._loading.set(shouldLoad);
    });
  }

  /**
   * Poziva se u interceptoru kada HTTP zahtjev krene
   */
  show() {
    this.activeRequests$.next(this.activeRequests$.value + 1);
  }

  /**
   * Poziva se u interceptoru kada HTTP zahtjev završi (ili pukne)
   */
  hide() {
    const nextCount = Math.max(0, this.activeRequests$.value - 1);
    this.activeRequests$.next(nextCount);
  }
}
