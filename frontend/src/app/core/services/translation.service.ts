import { Injectable, signal } from '@angular/core';

export type LangCode = 'hr' | 'en';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  // Aktivni jezik s podrškom za reaktivne signale (defaultno: detektiran preglednik ili 'en')
  readonly currentLang = signal<LangCode>(this.detectDefaultLanguage());

  // Rječnik prijevoda
  private translations: Record<LangCode, Record<string, any>> = {
    hr: {
      splash: {
        initializing: 'Inicijalizacija Allocento platforme...',
        security: 'Inicijalizacija sigurnosnog modula...',
        session: 'Provjera aktivne korisničke sesije...',
        server: 'Uspostavljanje veze s Allocento poslužiteljem...',
        offlineDb: 'Provjera offline baze u sesiji...',
        syncing: 'Sinkronizacija lokalnih podataka i salda...',
        settings: 'Učitavanje korisničkih postavki...',
        workspace: 'Priprema radnog okruženja...',
        ready: 'Sustav spreman. Pokretanje...',
        calculated: 'Proračunato & Uspješno'
      }
    },
    en: {
      splash: {
        initializing: 'Initializing Allocento platform...',
        security: 'Initializing security module...',
        session: 'Verifying active user session...',
        server: 'Establishing connection with Allocento server...',
        offlineDb: 'Checking offline database in session...',
        syncing: 'Syncing local data and balances...',
        settings: 'Loading user preferences...',
        workspace: 'Preparing workspace...',
        ready: 'System ready. Launching...',
        calculated: 'Calculated & Successful'
      }
    }
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
  translate(key: string): string {
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
