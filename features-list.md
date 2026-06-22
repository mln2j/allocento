# Allocento - Popis značajki i zahtjeva (Features List)

Ovaj dokument mapira zahtjeve iz opisa diplomskog rada na trenutno stanje projekta te definira što je već napravljeno, a što nam još preostaje.

## Službeni opis diplomskog rada

> "Web aplikacija omogućuje organizacijama i timovima strukturirano praćenje i upravljanje financijskim tokovima na razini projekata i odjela. Sustav podržava evidenciju prihoda i rashoda, kategorizaciju troškova, automatsku raspodjelu sredstava po projektima te generiranje detaljnih financijskih izvještaja i analiza. Aplikacija je implementirana kao progresivna web aplikacija koristeći Angular sučelje, backend s Laravel okvirom i PostgreSQL relacijsku bazu podataka. Sustav uključuje višerazinsku autentifikaciju korisnika s definiranjem uloga i prava pristupa te podršku za ponavljajuće financijske transakcije. Projekt koristi suvremene DevOps prakse kroz GitHub Actions za kontinuiranu integraciju i automatizaciju procesa implementacije. Tema rezervirana za: Mihael Lendvaj"

---

## 1. Tehnički zahtjevi iz opisa

- [x] **Frontend (PWA):** Aplikacija je implementirana kao Progresivna Web Aplikacija koristeći moderni Angular (standalone components, signals).
- [x] **Backend:** Implementiran koristeći Laravel okvir.
- [x] **DevOps (CI/CD):** Automatizacija procesa implementacije postavljena kroz GitHub Actions (`deploy.yml`).
- [ ] **Baza podataka (PostgreSQL):** Trenutno koristimo SQLite za lokalni razvoj. **Zadatak:** Osigurati da je na produkciji instaliran i konfiguriran PostgreSQL kako to izričito zahtijeva opis, te ažurirati dokumentaciju i `.env` datoteke.

## 2. Funkcionalni zahtjevi iz opisa

### Organizacije i praćenje po projektima/odjelima
- [x] **Spaces (Radni prostori):** Podrška za Osobne (Personal), Kućne (Household) i Poslovne (Company) prostore.
- [x] **Projekti i Budžeti:** Unutar tvrtke, računi funkcioniraju kao projekti s prikazom proračuna (potrošeno/preostalo) i vizualnim pokazateljem (progress bar).
- [x] **Dijeljenje računa:** Mogućnost dijeljenja računa (ili projekata) između različitih prostora.

### Prihodi, rashodi i kategorije
- [x] **Evidencija prihoda i rashoda:** Globalni pregled transakcija, filtriranje i detaljni unos.
- [x] **Kategorizacija troškova (Backend):** Baza podataka i API (CRUD) u potpunosti podržavaju kategorije i spajanje kategorija (`merge`).
- [ ] **Kategorizacija troškova (Frontend):** **Zadatak:** Provjeriti i po potrebi dovršiti korisničko sučelje (UI) za dodavanje, uređivanje i brisanje kategorija, te upravljanje vlastitim kategorijama unutar Space-a.

### Automatska raspodjela sredstava po projektima
- [ ] **Automatska raspodjela:** **PAUZIRANO:** Prema dogovoru s mentorom provjerit će se može li se ovaj dio izostaviti. Trenutno nemamo funkcionalnost koja *automatski* raspodjeljuje sredstva na više projekata.

### Financijski izvještaji i analiza
- [x] **Osnovne analize:** Nadzorna ploča (Dashboard) prikazuje analizu potrošnje po kategorijama i projektima (Kružni grafikoni) te po danima u zadnjih 7 dana (Stupčasti grafikon).
- [ ] **Detaljni izvještaji:** **Zadatak:** Budući da opis traži "generiranje detaljnih financijskih izvještaja i analiza", trebali bismo dodati posebnu stranicu "Izvještaji" s mogućnošću filtriranja po datumima, odjelima i projektima, uz opciju izvoza (npr. PDF/CSV).

### Autentifikacija, uloge i prava pristupa
- [x] **Višerazinska autentifikacija:** Prijava/Registracija (Laravel Sanctum).
- [x] **Uloge i prava (Roles & Permissions):** Sustav pozivnica na razini radnog prostora (Space). Korisnici dobivaju različite uloge (Owner, Manager, Member) koje određuju što mogu mijenjati.

### Ponavljajuće financijske transakcije
- [x] **Ponavljajuće transakcije (Backend):** Implementiran `RecurringTemplate` model, controller i pozadinski posao (`transactions:process-recurring`).
- [ ] **Ponavljajuće transakcije (Frontend):** **PAUZIRANO:** Zasad se fokusiramo na offline mode i izvještaje. Ovo će biti dodano na kraju, po potrebi.

## 3. Dodatne (naše) značajke ispod haube
- [ ] **Offline Bulk Sync:** Offline rad s IndexedDB-om je tu, ali **Zadatak** je optimizirati sinkronizaciju da šalje podatke u bazu isključivo koristeći kreirani bulk endpoint (`POST /api/transactions/bulk`), a ne jedno po jedno.
- [x] **E-mail na produkciji:** Konfigurirano je slanje E-mailova (uključujući verifikaciju) koristeći Resend servis.
- [x] **Web Push Obavijesti:** Dodane prave push obavijesti s potpunom višejezičnom podrškom i automatskom sinkronizacijom jezika. Koristi se VAPID i `SwPush`.
