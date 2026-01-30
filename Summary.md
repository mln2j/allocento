# Allocento Project Summary

Allocento je PWA za osobno/obiteljsko i poslovno upravljanje budžetima, s Angular frontendom, Laravel REST API backendom i MySQL bazom.

## Tehnički Stack

### Backend
- **Framework**: Laravel 12.x
- **Jezik**: PHP 8.2+
- **Autentifikacija**: Laravel Sanctum (Token based)
- **Baza**: MySQL / SQLite
- **API**: RESTful JSON API

### Frontend
- **Framework**: Angular 20.x
- **UI Library**: Angular Material 20.x
- **Jezik**: TypeScript
- **Platforma**: Progressive Web App (PWA)

## Domenska pravila

- **User**: Može pripadati **najviše jednom kućanstvu** (household) i **najviše jednoj organizaciji** (organization), ali može imati oboje istovremeno.
- **Računi (Accounts)**: Mogu biti personal, kućanski ili organizacijski. Personal i business račun se mogu “spojiti” preko posebne veze (`AccountLink`).

## Funkcionalni fokus

1. **Personal/Household**:
   - Praćenje prihoda i rashoda po osobnim i zajedničkim računima.
   - Kategorizacija transakcija.
   - Dijeljenje uvida u financije među članovima kućanstva.

2. **Enterprise/Organization**:
   - Organizacije imaju račune i projekte.
   - Troškovi se vežu na račune i projekte.
   - Role-based visibility (owner/manager/member).

## Baza – Glavni Entiteti

- **User**: Centralni entitet. Veze na Household i Organization.
- **Household**: Grupiranje korisnika za obiteljske financije.
- **Organization**: Grupiranje za poslovne financije.
- **Account**: Spremnik vrijednosti (Bank, Cash, etc.). Ima tip (personal/household/organization).
- **Transaction**: Zapis promjene stanja (Income/Expense). Može se vezati uz Projekt i Kategoriju.
- **Project**: Praćenje budžeta za specifične poslovne pothvate unutar organizacije.
- **Category**: Hijerarhijska struktura za klasifikaciju troškova.

## Arhitektura

### Struktura Direktorija
Projekt je organiziran kao monorepo:
- `/backend`: Sadrži sav Laravel kod (API, Database migrations, Models).
- `/frontend`: Sadrži sav Angular kod (Components, Services, Guards).

### Komunikacija
Frontend komunicira s Backendom isključivo putem REST API poziva. `AuthService` na frontendu upravlja Sanctum tokenima koji se šalju u headeru svakog zahtjeva putem HTTP interceptora.
