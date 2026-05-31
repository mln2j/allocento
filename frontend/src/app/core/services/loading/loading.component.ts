import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from './loading.service';
import { TranslationService } from '../translation.service';

@Component({
  selector: 'app-global-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="loadingService.loading()"
      class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/20 backdrop-blur-md transition-all duration-300 animate-fade-in"
    >
      <div class="flex flex-col items-center gap-4 relative z-10">
        <div class="w-16 h-16 flex items-center justify-center animate-pulse-subtle">
          <img src="logo/logo-animated.svg" alt="Allocento Loading..." class="w-full h-full object-contain" />
        </div>

        <span class="text-[11px] font-mono tracking-widest text-slate-400 uppercase select-none">
          {{ t('common.loading') }}
        </span>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .animate-fade-in {
      animation: fadeIn 0.25s ease-out forwards;
    }
    @keyframes pulseSubtle {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.85; }
    }
    .animate-pulse-subtle {
      animation: pulseSubtle 2s ease-in-out infinite;
    }
  `]
})
export class LoadingComponent {
  public loadingService = inject(LoadingService);
  private translationService = inject(TranslationService);

  t(key: string): string {
    return this.translationService.translate(key);
  }
}
