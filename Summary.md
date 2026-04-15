# Allocento Project Summary

Allocento je moderna PWA aplikacija za osobno, obiteljsko i poslovno upravljanje budžetima. Projekt koristi Laravel 12 na backendu i Angular 20 na frontendu, s naglaskom na premium UX i sigurnost.

## Tehnički Stack

### Backend
- **Framework**: Laravel 12.x
- **Jezik**: PHP 8.3+
- **Autentifikacija**: Laravel Sanctum (Token based)
- **Baza**: SQLite (razvoj), spremno za MySQL/PostgreSQL
- **API**: RESTful JSON API

### Frontend
- **Framework**: Angular 20.3.x
- **UI Library**: Angular Material 20.2.x
- **Dizajn**: Custom moderni UX (Glassmorphism, Tile-based lists, Premium UI)
- **Platforma**: PWA (Progressive Web App)

## CI/CD & Deployment
- **Automatizacija**: GitHub Actions (`deploy.yml`).
- **Target**: Deploy na kućni server putem SSH-a.
- **Proces**: 
    - Automatsko povlačenje koda s main grane.
    - Backend: `composer install`, `migrate --force`, `config/route:cache`.
    - Frontend: `npm ci`, produkcijski build.
    - Server management: `systemctl restart` za backend i `nginx reload`.

## Implementirane Funkcionalnosti

### 1. Core & Auth
- **Autentifikacija**: Registracija, Login i Logout.
- **Profil**: Pregled i uređivanje osobnih podataka (Ime, Email).
- **Sigurnost**: Promjena lozinke putem custom dijaloga.
- **Profilna Slika**: Upload i pohrana profilne slike (Laravel Storage).
- **Brisanje Računa**: Sigurno brisanje profila uz provjeru vlasništva nad grupama.

### 2. Upravljanje Računima (Accounts)
- **Tipovi računa**: Personal, Household, Organization.
- **Primarni Račun**: Mogućnost označavanja jednog računa kao primarnog ("star" sustav).
- **Saldo**: Automatsko praćenje stanja na temelju transakcija.
- **Povezivanje**: Vlasništvo računa se prati čak i za dijeljene (household) račune.

### 3. Transakcije (Transactions)
- **Globalni pregled**: Povijest svih transakcija (osobne + kućanske) na jednom mjestu.
- **CRUD**: Kreiranje, uređivanje i brisanje transakcija.
- **Kategorizacija**: Svaka transakcija je vezana uz račun i kategoriju.

### 4. Društvene Funkcionalnosti (Household & Organization)
- **Invitations**: Sustav pozivnica putem emaila i tokena.
- **Notifikacije**: Zvonce u toolbar-u s badge-om za aktivne pozivnice.
- **Management**: Dashboard za kućanstva i organizacije s listom članova i ulogama (Owner badge).
- **Ownership**: Zaštita od brisanja ako je korisnik jedini vlasnik grupe.

### 5. Dashboard (Analytics)
- **Financial Overview**: Razdvojeni Personal i Household totali.
- **Favorit Card**: Istaknuti primarni račun s brzim pristupom.
- **Spending Analysis**: Vizualni prikaz potrošnje po kategorijama u zadnjih 30 dana (CSS progress bars).
- **Recent Activity**: Brzi uvid u zadnjih 10 transakcija.

## Arhitektura Podataka (Glavni Entiteti)
- **User**: Proširen s `profile_photo_path` i soft delete podrškom.
- **Household / Organization**: Grupiranje korisnika i resursa.
- **Invitation**: Upravlja životnim ciklusom pozivanja novih članova.
- **Account**: Sprema saldo i primarni status.
- **Transaction**: Centralni zapis o prometu novca.

## Trenutni Status: **Beta Ready**
Aplikacija ima sve temeljne značajke za upravljanje novcem u timu ili obitelji. Sljedeći koraci uključuju naprednije izvještaje (grafovi) i dublju integraciju s projektima unutar organizacija.