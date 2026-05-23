import {Component, inject, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {AuthService} from '../../core/services/auth.service';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [],
  templateUrl: './splash.component.html'
})

export class SplashComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit() {
    console.log('Allocento: Splash screen inicijaliziran i izoliran.');
    // Komentarom smo isključili navigaciju dok ne pripremimo idući ekran
    // setTimeout(() => { this.router.navigate(['/dashboard']); }, 2500);
  }
}

