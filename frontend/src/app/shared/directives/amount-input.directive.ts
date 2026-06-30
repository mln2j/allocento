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
      // Only format if the element has a value and it's not currently being edited
      // We don't want to mess up typing if the lang changes while typing (rare)
      if (document.activeElement !== this.el.nativeElement) {
        this.formatValue(this.el.nativeElement.value);
      }
    });
  }

  ngOnInit() {
    // Format initial value if present, on next tick to allow form control to initialize
    setTimeout(() => {
      if (this.control && this.control.value !== null && this.control.value !== undefined && this.control.value !== '') {
         this.formatValue(this.control.value.toString());
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

    // Allow the user to type freely. 
    // We only re-format on blur, but we can prevent invalid chars on input
    const clean = value.replace(/[^0-9.,-]/g, '');
    if (clean !== value) {
      this.el.nativeElement.value = clean;
    }
    
    // Parse value and update control silently so we don't mess up their typing cursor
    const parsed = this.parseAmount(clean);
    if (this.control && this.control.control) {
      this.control.control.setValue(parsed, { emitEvent: true, emitModelToViewChange: false });
    }
  }

  @HostListener('blur')
  onBlur() {
    this.formatValue(this.el.nativeElement.value);
  }

  private parseAmount(value: string): number | null {
    if (!value) return null;
    
    // Count how many dots and commas
    const dots = (value.match(/\./g) || []).length;
    const commas = (value.match(/,/g) || []).length;
    
    let normalized = value;

    // If both exist, the last one is the decimal separator
    if (dots > 0 && commas > 0) {
      const lastDot = value.lastIndexOf('.');
      const lastComma = value.lastIndexOf(',');
      
      if (lastDot > lastComma) {
        // Dot is decimal (e.g. 1,234.50)
        normalized = value.replace(/,/g, '');
      } else {
        // Comma is decimal (e.g. 1.234,50)
        normalized = value.replace(/\./g, '').replace(',', '.');
      }
    } 
    // Only commas
    else if (commas > 0) {
      const parts = value.split(',');
      if (parts.length === 2 && parts[1].length !== 3) {
        normalized = value.replace(',', '.');
      } else if (parts.length > 2) {
        // Multiple commas, must be thousands
        normalized = value.replace(/,/g, '');
      } else {
         // exactly 3 digits after. Let's use locale.
         if (this.translate.currentLang() === 'hr') {
            // in HR, comma is decimal, but usually 2 decimals. If exactly 3, it's ambiguous but let's assume it's decimal if they typed a comma.
            normalized = value.replace(',', '.');
         } else {
            // in EN, comma is thousand
            normalized = value.replace(/,/g, '');
         }
      }
    }
    // Only dots
    else if (dots > 0) {
       const parts = value.split('.');
       if (parts.length === 2 && parts[1].length !== 3) {
          // It's a decimal
       } else if (parts.length > 2) {
          // Multiple dots, must be thousands
          normalized = value.replace(/\./g, '');
       } else {
          // exactly 3 digits after dot
          if (this.translate.currentLang() === 'hr') {
             // in HR, dot is thousand separator
             normalized = value.replace(/\./g, '');
          } else {
             // in EN, dot is decimal separator
             normalized = value; // keep dot
          }
       }
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
      num = value;
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
  }
}
