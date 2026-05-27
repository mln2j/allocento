import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from './loading.service';
import { TranslationService } from '../translation.service'; // Putanja je jedan nivo gore

@Component({
  selector: 'app-global-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="loadingService.loading()"
      class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50/60 backdrop-blur-[2px] transition-all duration-300 animate-fade-in"
    >
      <div class="flex flex-col items-center gap-4">
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
      animation: fadeIn 0.2s ease-out forwards;
    }
    @keyframes pulseSubtle {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.9; }
    }
    .animate-pulse-subtle {
      animation: pulseSubtle 2s ease-in-out infinite;
    }
  `]
})
export class LoadingComponent {
  public loadingService = inject(LoadingService);
  private translationService = inject(TranslationService);

  // Helper metoda za dohvaćanje prijevoda, točno kao u ErrorComponent
  t(key: string): string {
    return this.translationService.translate(key);
  }
}
