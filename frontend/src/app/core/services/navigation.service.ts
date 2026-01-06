import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private history: string[] = [];

  constructor(
    private router: Router,
    private location: Location,
  ) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.history.push(event.urlAfterRedirects);
      });
  }

  back(): void {
    this.history.pop(); // makni current
    if (this.history.length > 0) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/dashboard');
    }
  }
}
