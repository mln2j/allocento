import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-error',
  standalone: true,
  // Tirkizna pozadina preko cijelog ekrana (Allocator Turquoise)
  template: `
    <div class="fixed inset-0 flex flex-col items-center justify-center bg-brand-mint p-6 text-center">
      <div class="max-w-md p-10 bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col items-center">

        <div class="w-16 h-16 bg-brand-purple/10 text-brand-purple rounded-full flex items-center justify-center mb-8 border border-brand-purple/20 animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>

        <h1 class="text-3xl font-bold text-brand-purple mb-4 tracking-tighter" style="font-family: 'Space Mono', 'Courier New', monospace;">
          {{ t('error.criticalTitle') }}
        </h1>

        <p class="text-sm text-slate-700 mb-10 leading-relaxed max-w-xs">
          {{ t('error.criticalMessage') }}
        </p>

        <button
          (click)="retry()"
          class="w-full py-4 px-6 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-md font-semibold shadow-lg shadow-brand-purple/30 transition-all duration-200"
          style="font-family: 'Space Mono', 'Courier New', monospace;">
          {{ t('common.retryButton') }}
        </button>
      </div>
    </div>
  `
})
export class ErrorComponent {
  private router = inject(Router);
  private translationService = inject(TranslationService);

  t(key: string): string {
    return this.translationService.translate(key);
  }

  retry() {
    this.router.navigate(['/splash']);
  }
}
