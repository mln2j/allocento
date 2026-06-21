import { Component, Input, forwardRef, HostListener, ElementRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative font-mono" [ngClass]="containerClass">
      <button 
        type="button" 
        (click)="toggleDropdown(); $event.stopPropagation()"
        class="flex items-center justify-between px-3 bg-slate-50 border border-slate-200 hover:border-brand-purple/40 rounded-xl text-slate-700 transition-all cursor-pointer outline-none shadow-xs"
        [ngClass]="buttonClass"
        [class.opacity-50]="disabled"
        [class.cursor-not-allowed]="disabled"
        [disabled]="disabled"
      >
        <span class="truncate pr-2 font-bold">{{ selectedLabel || placeholder }}</span>
        <svg 
          class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200 flex-shrink-0"
          [class.rotate-180]="isOpen"
          fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      <div 
        *ngIf="isOpen"
        class="absolute z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-1 animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto"
        [ngClass]="dropdownClass"
      >
        <button 
          *ngFor="let option of options"
          type="button" 
          (click)="selectOption(option.value); $event.stopPropagation()" 
          class="w-full text-left px-3 py-2 text-sm font-mono hover:bg-slate-50 rounded-lg transition-colors cursor-pointer outline-none"
          [class.text-brand-purple]="option.value === value"
          [class.font-bold]="option.value === value"
          [class.text-slate-700]="option.value !== value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ]
})
export class SelectComponent implements ControlValueAccessor {
  @Input() options: { value: any, label: string }[] = [];
  @Input() placeholder: string = 'Select...';
  
  // Custom classes to allow specific styling per-instance
  @Input() containerClass: string = 'w-full text-sm';
  @Input() buttonClass: string = 'w-full h-11';
  @Input() dropdownClass: string = 'w-full';

  value: any = null;
  disabled: boolean = false;
  isOpen: boolean = false;

  constructor(private eRef: ElementRef) {}

  get selectedLabel(): string {
    const selected = this.options.find(o => o.value === this.value);
    return selected ? selected.label : '';
  }

  onChange = (value: any) => {};
  onTouched = () => {};

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggleDropdown() {
    if (!this.disabled) {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.onTouched();
      }
    }
  }

  selectOption(val: any) {
    this.value = val;
    this.onChange(val);
    this.isOpen = false;
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }
}
