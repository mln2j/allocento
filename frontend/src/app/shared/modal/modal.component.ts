import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Overlay wrapper: transition opacity+visibility so close animation plays fully -->
    <div 
      class="fixed inset-0 z-110 flex sm:items-center items-end justify-center sm:p-4 p-0"
      [class]="isOpen
        ? 'opacity-100 visible pointer-events-auto'
        : 'opacity-0 invisible pointer-events-none'"
      style="transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;"
    >
      <!-- Backdrop -->
      <div 
        class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
        (click)="close.emit()"
      ></div>

      <!-- Modal sheet: slides up on mobile, scales on desktop -->
      <div 
        class="relative w-full bg-white sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-slate-100 p-6"
        [class]="isOpen
          ? 'translate-y-0 sm:scale-100 sm:opacity-100'
          : 'translate-y-full sm:translate-y-0 sm:scale-95 sm:opacity-0'"
        style="transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease-out;"
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
