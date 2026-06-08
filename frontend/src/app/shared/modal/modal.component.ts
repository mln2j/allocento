import { Component, Input, Output, EventEmitter, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .modal-overlay {
      transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
    }
    .modal-overlay.closed {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }
    .modal-overlay.open {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }
    .modal-sheet {
      transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease-out;
    }
    @media (max-width: 639px) {
      .modal-sheet.closed {
        transform: translateY(100%);
        opacity: 1;
      }
      .modal-sheet.open {
        transform: translateY(0);
        opacity: 1;
      }
    }
    @media (min-width: 640px) {
      .modal-sheet.closed {
        transform: scale(0.95);
        opacity: 0;
      }
      .modal-sheet.open {
        transform: scale(1);
        opacity: 1;
      }
    }
  `],
  template: `
    <div 
      class="fixed inset-0 z-110 flex sm:items-center items-end justify-center sm:p-4 p-0 modal-overlay"
      [class.open]="isOpen"
      [class.closed]="!isOpen"
    >
      <!-- Backdrop -->
      <div 
        class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 ease-in-out"
        [style.opacity]="isOpen ? '1' : '0'"
        (click)="close.emit()"
      ></div>

      <!-- Modal Content Wrapper -->
      <div 
        class="relative w-full bg-white sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-slate-100 p-6 modal-sheet"
        [class.open]="isOpen"
        [class.closed]="!isOpen"
        [ngClass]="sizeClass"
      >
        <!-- Mobile Notch Indicator -->
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

        <!-- Body content projected here -->
        <ng-content></ng-content>
      </div>
    </div>
  `
})
export class ModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() icon = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Output() close = new EventEmitter<void>();

  get sizeClass(): string {
    if (this.size === 'sm') return 'max-w-sm';
    if (this.size === 'lg') return 'max-w-lg';
    return 'max-w-md';
  }
}
