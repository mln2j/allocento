import { Component, Input, forwardRef, HostListener, ElementRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative font-mono" [ngClass]="containerClass">
      <!-- Trigger Button -->
      <button 
        type="button" 
        (click)="toggleDropdown(); $event.stopPropagation()"
        class="flex items-center justify-between px-3 bg-slate-50 border border-slate-200 hover:border-brand-purple/40 rounded-xl text-slate-700 transition-all cursor-pointer outline-none shadow-xs"
        [ngClass]="buttonClass"
        [class.opacity-50]="disabled"
        [class.cursor-not-allowed]="disabled"
        [disabled]="disabled"
      >
        <div class="flex items-center gap-2 overflow-hidden">
          <svg class="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <span class="truncate font-bold">{{ displayValue || placeholder }}</span>
        </div>
      </button>

      <!-- Calendar Popover (Fixed Modal) -->
      <div 
        *ngIf="isOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm"
        (click)="isOpen = false; $event.stopPropagation()"
      >
        <div 
          class="bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200 min-w-[300px] max-w-sm w-full"
          (click)="$event.stopPropagation()"
        >
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <button type="button" (click)="prevMonth()" class="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <span class="font-bold text-slate-800">{{ getMonthName(currentMonth) }} {{ currentYear }}</span>
          <button type="button" (click)="nextMonth()" class="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </div>

        <!-- Days of Week -->
        <div class="grid grid-cols-7 gap-1 mb-2">
          <div *ngFor="let day of ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned']" class="text-center text-xs font-bold text-slate-400">
            {{ day }}
          </div>
        </div>

        <!-- Days Grid -->
        <div class="grid grid-cols-7 gap-1">
          <!-- Empty cells for padding -->
          <div *ngFor="let empty of paddingArray" class="h-8"></div>
          
          <!-- Actual days -->
          <button
            *ngFor="let day of daysArray"
            type="button"
            (click)="selectDate(day)"
            class="h-8 w-8 mx-auto rounded-full flex items-center justify-center text-sm transition-colors"
            [class.bg-brand-purple]="isSelected(day)"
            [class.text-white]="isSelected(day)"
            [class.font-bold]="isSelected(day)"
            [class.text-slate-700]="!isSelected(day)"
            [class.hover:bg-slate-100]="!isSelected(day)"
            [class.bg-slate-50]="isToday(day) && !isSelected(day)"
          >
            {{ day }}
          </button>
        </div>
      </div>
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true
    }
  ]
})
export class DatePickerComponent implements ControlValueAccessor {
  @Input() placeholder: string = 'Select Date';
  @Input() containerClass: string = 'w-full text-sm';
  @Input() buttonClass: string = 'w-full h-11';
  @Input() dropdownClass: string = 'left-0';

  value: string | null = null; // format YYYY-MM-DD
  disabled: boolean = false;
  isOpen: boolean = false;

  currentMonth: number;
  currentYear: number;
  
  paddingArray: number[] = [];
  daysArray: number[] = [];

  constructor(private eRef: ElementRef) {
    const today = new Date();
    this.currentMonth = today.getMonth();
    this.currentYear = today.getFullYear();
    this.generateCalendar();
  }

  get displayValue(): string {
    if (!this.value) return '';
    const parts = this.value.split('-');
    if (parts.length !== 3) return this.value;
    return `${parts[2]}.${parts[1]}.${parts[0]}.`;
  }

  onChange = (value: string | null) => {};
  onTouched = () => {};

  writeValue(value: string | null): void {
    this.value = value;
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        this.currentYear = parseInt(parts[0], 10);
        this.currentMonth = parseInt(parts[1], 10) - 1;
        this.generateCalendar();
      }
    }
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
        // When opening, reset calendar view to the selected date or today
        if (this.value) {
          const parts = this.value.split('-');
          this.currentYear = parseInt(parts[0], 10);
          this.currentMonth = parseInt(parts[1], 10) - 1;
        } else {
          const today = new Date();
          this.currentYear = today.getFullYear();
          this.currentMonth = today.getMonth();
        }
        this.generateCalendar();
        this.onTouched();
      }
    }
  }

  prevMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
  }

  selectDate(day: number) {
    const mm = String(this.currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    this.value = `${this.currentYear}-${mm}-${dd}`;
    this.onChange(this.value);
    this.isOpen = false;
  }

  isSelected(day: number): boolean {
    if (!this.value) return false;
    const mm = String(this.currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return this.value === `${this.currentYear}-${mm}-${dd}`;
  }

  isToday(day: number): boolean {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === this.currentMonth && today.getFullYear() === this.currentYear;
  }

  generateCalendar() {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    // JS getDay(): Sun=0, Mon=1...
    // We want Mon=0, Tue=1... Sun=6
    let startingDay = firstDay === 0 ? 6 : firstDay - 1;

    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();

    this.paddingArray = Array(startingDay).fill(0);
    this.daysArray = Array.from({length: daysInMonth}, (_, i) => i + 1);
  }

  getMonthName(monthIndex: number): string {
    const months = ['Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj', 'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac'];
    return months[monthIndex];
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }
}
