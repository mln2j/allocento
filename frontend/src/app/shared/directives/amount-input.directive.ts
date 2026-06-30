import { Directive, ElementRef, HostListener, OnInit, Optional, Self, effect } from '@angular/core';
import { NgControl } from '@angular/forms';
import { TranslationService } from '../../core/services/translation.service';

@Directive({
  selector: '[appAmountInput]',
  standalone: true
})
export class AmountInputDirective implements OnInit {
  constructor(
    private el: ElementRef<HTMLInputElement>,
    @Optional() @Self() private control: NgControl,
    private translate: TranslationService
  ) {
    // Re-format when language changes
    effect(() => {
      const currentLang = this.translate.currentLang();
      if (document.activeElement !== this.el.nativeElement) {
        if (this.control && this.control.value !== null && this.control.value !== undefined) {
          this.formatValue(this.control.value);
        } else {
          this.formatValue(this.el.nativeElement.value);
        }
      }
    });
  }

  ngOnInit() {
    // Format initial value if present
    setTimeout(() => {
      if (this.control && this.control.value !== null && this.control.value !== undefined && this.control.value !== '') {
         this.formatValue(this.control.value);
      }
    });
  }

  @HostListener('input')
  onInput() {
    const value = this.el.nativeElement.value;
    if (!value) {
      if (this.control && this.control.control) {
        this.control.control.setValue(null, { emitEvent: true, emitModelToViewChange: false });
      }
      return;
    }

    // Strip everything except digits and minus
    let clean = value.replace(/[^0-9-]/g, '');
    
    // Handle minus
    const isNegative = (value.match(/-/g) || []).length % 2 !== 0;
    clean = clean.replace(/-/g, ''); // strip all minuses for parsing digits

    if (clean === '') {
      if (this.control && this.control.control) {
        this.control.control.setValue(null, { emitEvent: true, emitModelToViewChange: false });
      }
      this.el.nativeElement.value = isNegative ? '-' : '';
      return;
    }

    // Parse as integer cents
    const cents = parseInt(clean, 10);
    let num = cents / 100;
    if (isNegative) num = -num;

    // Format value and set it back immediately
    this.formatValue(num);
  }

  @HostListener('blur')
  onBlur() {
    if (this.control && (this.control.value === null || this.control.value === undefined || this.control.value === '')) {
      this.el.nativeElement.value = '';
    } else if (this.control) {
      this.formatValue(this.control.value);
    } else {
      this.formatValue(this.el.nativeElement.value);
    }
  }
  
  @HostListener('click')
  onClick() {
    // Force cursor to end on click in banking mode
    const len = this.el.nativeElement.value.length;
    this.el.nativeElement.setSelectionRange(len, len);
  }

  private parseAmount(value: string): number | null {
    if (!value) return null;
    // For initial values from the model which might be "12.50" or "12.5" or "12"
    // We should parse it as a standard float, keeping dot or comma as decimal separator.
    let normalized = value.replace(',', '.');
    // Remove all dots except the last one
    const parts = normalized.split('.');
    if (parts.length > 2) {
      normalized = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
    }
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? null : parsed;
  }

  private formatValue(value: string | number) {
    if (value === null || value === undefined || value === '') {
      this.el.nativeElement.value = '';
      return;
    }
    
    let num: number;
    if (typeof value === 'string') {
      const parsed = this.parseAmount(value);
      if (parsed === null) {
        this.el.nativeElement.value = '';
        return;
      }
      num = parsed;
    } else {
      num = typeof value === 'number' ? value : parseFloat(value as any);
      if (isNaN(num)) return;
    }

    const locale = this.translate.currentLang() === 'hr' ? 'hr-HR' : 'en-US';
    
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);

    this.el.nativeElement.value = formatted;
    
    if (this.control && this.control.control) {
       this.control.control.setValue(num, { emitEvent: false, emitModelToViewChange: false });
    }

    // Ensure cursor stays at the end during typing
    if (document.activeElement === this.el.nativeElement) {
      const len = formatted.length;
      this.el.nativeElement.setSelectionRange(len, len);
    }
  }
}


