import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-error',
  standalone: true,
  imports: [],
  templateUrl: './error.page.html'
})
export class ErrorPage implements OnInit {
  private router = inject(Router);
  private translationService = inject(TranslationService);
  loaded = false;

  ngOnInit() {
    setTimeout(() => {
      this.loaded = true;
    }, 50);
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  retry() {
    this.router.navigate(['/splash']);
  }
}
