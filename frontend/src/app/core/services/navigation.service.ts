import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private history: string[] = [];

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        this.history.push(e.urlAfterRedirects);
      });
  }

  back(): void {
    this.history.pop();
    const previous = this.history.pop();
    if (previous) {
      this.router.navigateByUrl(previous);
    } else {
      this.router.navigateByUrl('/dashboard');
    }
  }
}
