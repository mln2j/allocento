import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 z-110 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div 
        class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300" 
        (click)="close.emit()"
      ></div>

      <!-- Modal Content Wrapper -->
      <div 
        [class]="'relative w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-6 animate-in zoom-in-95 duration-200 ' + sizeClass"
      >
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-base font-bold font-mono text-slate-900 flex items-center gap-2">
            <span *ngIf="icon">{{ icon }}</span> {{ title }}
          </h2>
          <button 
            type="button"
            (click)="close.emit()" 
            class="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer outline-none"
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
