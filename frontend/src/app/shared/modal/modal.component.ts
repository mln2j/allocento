import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .modal-overlay {
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    }
    .modal-overlay.entering {
      opacity: 1;
    }
    .modal-overlay.leaving {
      opacity: 0;
    }

    .modal-sheet {
      opacity: 0;
      transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease-out;
    }
    .modal-sheet.entering {
      opacity: 1;
    }
    .modal-sheet.leaving {
      opacity: 0;
    }

    @media (max-width: 639px) {
      .modal-sheet.entering {
        transform: translateY(0);
      }
      .modal-sheet.leaving {
        transform: translateY(100%);
      }
    }

    @media (min-width: 640px) {
      .modal-sheet.entering {
        transform: scale(1);
        opacity: 1;
      }
      .modal-sheet.leaving {
        transform: scale(0.95);
        opacity: 0;
      }
    }
  `],
  template: `
    <!-- Only rendered in DOM while open or animating — no DOM presence when fully closed -->
    <ng-container *ngIf="isRendered">
      <div
        class="fixed inset-0 z-110 flex sm:items-center items-end justify-center sm:p-4 p-0 modal-overlay"
        [class.entering]="isVisible"
        [class.leaving]="!isVisible"
      >
        <!-- Backdrop -->
        <div
          class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          (click)="close.emit()"
        ></div>

        <!-- Sheet -->
        <div
          class="relative w-full bg-white sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-slate-100 p-6 modal-sheet"
          [class.entering]="isVisible"
          [class.leaving]="!isVisible"
          [ngClass]="sizeClass"
        >
          <!-- Mobile drag handle -->
          <div class="sm:hidden w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4"></div>

          <!-- Header -->
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-base font-bold font-mono text-slate-900">
              {{ title }}
            </h2>
            <button
              type="button"
              (click)="close.emit()"
              class="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer outline-none border-none bg-transparent"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Projected content -->
          <ng-content></ng-content>
        </div>
      </div>
    </ng-container>
  `
})
export class ModalComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() icon = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Output() close = new EventEmitter<void>();

  /** Is the DOM element present at all */
  isRendered = false;
  /** Is the visible CSS class applied (triggers CSS transition) */
  isVisible = false;

  private closeTimer: any = null;

  ngOnChanges(changes: SimpleChanges) {
    if (!changes['isOpen']) return;

    if (this.isOpen) {
      document.body.style.overflow = 'hidden';
      // Mount element first
      if (this.closeTimer) {
        clearTimeout(this.closeTimer);
        this.closeTimer = null;
      }
      this.isRendered = true;
      // Then on next frame apply visible class to trigger enter transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.isVisible = true;
        });
      });
    } else {
      document.body.style.overflow = '';
      // Trigger leave transition
      this.isVisible = false;
      // Unmount after animation completes
      this.closeTimer = setTimeout(() => {
        this.isRendered = false;
        this.closeTimer = null;
      }, 380);
    }
  }

  ngOnDestroy() {
    if (this.isOpen) {
      document.body.style.overflow = '';
    }
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
    }
  }

  get sizeClass(): string {
    if (this.size === 'sm') return 'max-w-sm';
    if (this.size === 'lg') return 'max-w-lg';
    return 'max-w-md';
  }
}
