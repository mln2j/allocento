import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from './loading.service';

@Component({
  selector: 'app-global-loading',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    :host {
      position: fixed;
      top: 64px; /* ispod headera (h-16 = 64px) */
      left: 0;
      right: 0;
      z-index: 55;
      pointer-events: none;
    }

    .progress-bar {
      height: 2px;
      width: 100%;
      background: transparent;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #621e95, #a855f7, #621e95);
      background-size: 200% 100%;
      border-radius: 0 2px 2px 0;
      transform-origin: left;
      transform: scaleX(0);
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
      animation: shimmer 1.5s linear infinite;
      opacity: 0;
    }

    .progress-bar-fill.loading {
      transform: scaleX(0.85);
      opacity: 1;
    }

    .progress-bar-fill.done {
      transform: scaleX(1);
      opacity: 0;
      transition: transform 0.15s ease-out, opacity 0.3s ease 0.1s;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `],
  template: `
    <div class="progress-bar">
      <div class="progress-bar-fill" [class.loading]="state() === 'loading'" [class.done]="state() === 'done'"></div>
    </div>
  `
})
export class LoadingComponent {
  public loadingService = inject(LoadingService);
  state = signal<'idle' | 'loading' | 'done'>('idle');

  private doneTimeout: any = null;

  constructor() {
    effect(() => {
      const isLoading = this.loadingService.loading();
      if (isLoading) {
        if (this.doneTimeout) {
          clearTimeout(this.doneTimeout);
          this.doneTimeout = null;
        }
        this.state.set('loading');
      } else {
        if (this.state() === 'loading') {
          this.state.set('done');
          this.doneTimeout = setTimeout(() => {
            this.state.set('idle');
            this.doneTimeout = null;
          }, 400);
        }
      }
    });
  }
}
