# Allocento - Dnevnik izmjena i razvoja

Ovaj dokument sadrži detaljan pregled izmjena napravljenih na projektu Allocento u suradnji s Gemini CLI asistentom.

## 1. Istraživanje i Postavljanje okruženja
- **Analiza projekta**: Istražena je arhitektura (Laravel 12 + Angular 20) i Git povijest.
- **Tehnička dokumentacija**: Ažuriran `Summary.md` s preciznim podacima o verzijama (PHP 8.3, Angular 20.3) i opisom CI/CD workflowa.
- **Baza podataka**: 
  - Instalirana `php8.3-sqlite3` ekstenzija.
  - Generirana `.env` datoteka.
  - Izvršene migracije (`php artisan migrate --seed`) za pripremu baze.

## 2. Optimizacija Frontenda
- **Konfiguracija okruženja**: Ručno kreirana `src/environments/` mapa s `environment.ts` i `environment.prod.ts` jer je bila izostavljena iz repozitorija.
- **UI/UX Unifikacija**:
  - Implementiran globalni `LoadingService` i HTTP Interceptor za jedinstveni "loading spinner" na sredini zaslona.
  - Optimiziran layout (`styles.scss` i `app-shell`) uvođenjem `.page-container` klase za centralizirano upravljanje marginama i paddingom (mobile-first pristup).
  - Očišćeni suvišni divovi i kontejneri iz `dashboard.component.html` i drugih komponenti.
- **Mobile-First Optimizacija (iPhone 15)**:
  - Prilagođeni razmaci i paddingi za bolje iskustvo na malim ekranima.
  - Smanjeni gumbi i povećana čitljivost formi.

## 3. Čišćenje koda i popravci (Build)
- **Uklanjanje suvišne logike**: Uklonjene lokalne `isLoading` varijable iz svih značajnih komponenti (Dashboard, Accounts, Transactions, Profile, Organization, Household).
- **Popravak build grešaka**:
  - Ispravljeni TypeScript importi i ovisnosti modula (osobito `MatSelectModule`, `ReactiveFormsModule`, `Account` modela).
  - Očišćene greške u `AccountCreateComponent` i `AccountEditComponent` vezane uz nedostajuće varijable (`currentUser`, `accountForm`).
- **Stabilizacija**: Očišćen Angular cache (`.angular` mapa) radi osiguranja ispravne kompilacije.

## Trenutni Status
- Backend je spreman i radi na `http://127.0.0.1:8000`.
- Frontend je unificiran, optimiziran za mobilne uređaje i spreman za rad na `http://localhost:4200`.
