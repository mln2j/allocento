import { Injectable, signal } from '@angular/core';

import hrTranslations from '../../../assets/i18n/hr.json';
import enTranslations from '../../../assets/i18n/en.json';

export type LangCode = 'hr' | 'en';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  // Aktivni jezik s podrškom za reaktivne signale (defaultno: detektiran preglednik ili 'en')
  readonly currentLang = signal<LangCode>(this.detectDefaultLanguage());

  // Rječnik prijevoda koji sada mapira direktno na uvezene datoteke
  private readonly translations: Record<LangCode, Record<string, any>> = {
    hr: hrTranslations,
    en: enTranslations
  };

  // Pomoćna metoda za detekciju jezika i fallback
  private detectDefaultLanguage(): LangCode {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return 'en'; // Fallback za SSR/server okruženja
    }

    // 1. Provjera ručno odabranog jezika iz localStorage
    const saved = localStorage.getItem('allocento_lang') as LangCode;
    if (saved === 'hr' || saved === 'en') {
      return saved;
    }

    // 2. Detekcija jezika preglednika
    const browserLang = (navigator.language || 'en').split('-')[0].toLowerCase();
    if (browserLang === 'hr' || browserLang === 'en') {
      return browserLang as LangCode;
    }

    // 3. Fallback na engleski
    return 'en';
  }

  // Promjena jezika
  setLanguage(lang: LangCode) {
    this.currentLang.set(lang);
    localStorage.setItem('allocento_lang', lang);
  }

  // Ručna reinicijalizacija ako je potrebna
  initLanguage() {
    this.currentLang.set(this.detectDefaultLanguage());
  }

  // Reaktivna funkcija za prijevod (traži duboke ključeve tipa 'splash.calculated')
  translate(key: string, params?: any): string {
    // Čitanje signala kako bi se uspostavila reaktivna ovisnost
    const lang = this.currentLang();
    const keys = key.split('.');
    let result = this.translations[lang];

    for (const k of keys) {
      if (result && result[k] !== undefined) {
        result = result[k];
      } else {
        return key; // Vrati sam ključ ako prijevod ne postoji
      }
    }

    return result as unknown as string;
  }
}
