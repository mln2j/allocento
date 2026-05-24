import { Injectable, inject, isDevMode } from '@angular/core';
import { TranslationService } from './translation.service';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private translationService = inject(TranslationService);

  /**
   * Ispisuje info log u konzolu (samo u dev načinu)
   * Ako je proslijeđen ključ prijevoda, automatski ga prevodi.
   */
  log(messageOrKey: string, ...optionalParams: any[]) {
    if (isDevMode()) {
      const translated = this.resolveMessage(messageOrKey);
      console.log(`[Allocento] ${translated}`, ...optionalParams);
    }
  }

  /**
   * Ispisuje upozorenje (samo u dev načinu)
   */
  warn(messageOrKey: string, ...optionalParams: any[]) {
    if (isDevMode()) {
      const translated = this.resolveMessage(messageOrKey);
      console.warn(`[Allocento ⚠️] ${translated}`, ...optionalParams);
    }
  }

  /**
   * Ispisuje kritičnu grešku (Ovo ostavljamo i u produkciji radi lakšeg debugiranja!)
   */
  error(messageOrKey: string, ...optionalParams: any[]) {
    const translated = this.resolveMessage(messageOrKey);
    console.error(`[Allocento 🚨] ${translated}`, ...optionalParams);
  }

  /**
   * Pomoćna metoda koja provjerava radi li se o ključu prijevoda
   */
  private resolveMessage(input: string): string {
    // Ako string sadrži točku (npr. 'splash.server'), pretpostavljamo da je i18n ključ
    if (input.includes('.')) {
      return this.translationService.translate(input);
    }
    return input;
  }
}
