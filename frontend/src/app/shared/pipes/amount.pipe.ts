import { Pipe, PipeTransform } from '@angular/core';
import { TranslationService } from '../../core/services/translation.service';

@Pipe({
  name: 'appAmount',
  standalone: true,
  pure: false // Allows re-evaluation when language changes
})
export class AmountPipe implements PipeTransform {
  constructor(private translate: TranslationService) {}

  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      const locale = this.translate.currentLang() === 'hr' ? 'hr-HR' : 'en-US';
      return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(0);
    }
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) {
       const locale = this.translate.currentLang() === 'hr' ? 'hr-HR' : 'en-US';
       return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(0);
    }

    const locale = this.translate.currentLang() === 'hr' ? 'hr-HR' : 'en-US';
    
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  }
}
