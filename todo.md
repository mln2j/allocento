# Allocento - TODO lista preostalih zadataka

Ovaj dokument sadrži plan i upute za implementaciju preostalih funkcionalnosti koje su planirane za dovršetak aplikacije.

---

## 1. [Frontend] UI za spajanje (merge) kategorija [DOVRŠENO]
* **Opis:** Backend i API u potpunosti podržavaju spajanje kategorija (`POST /api/categories/{from}/merge-into/{to}`), kao i Angular repozitorij (`CategoryRepository.merge(fromId, toId)`). Potrebno je izraditi korisničko sučelje kako bi korisnik mogao pokrenuti ovu akciju iz preglednika.
* **Koraci za implementaciju:**
  1. Na stranici detalja kategorije (`frontend/src/app/pages/category-details/category-details.page.html`) dodati gumb **"Spoji s drugom kategorijom"** (vidljiv samo ako kategorija pripada radnom prostoru, a ne ako je globalna/sistemska).
  2. Klikom na gumb otvoriti modalni prozor (`ModalComponent`) koji sadrži:
     - Kratko objašnjenje: *"Spajanjem ove kategorije, sve njezine transakcije i podkategorije bit će prebačene u odabranu kategoriju, a ova kategorija će biti trajno obrisana."*
     - Padajući izbornik (`<select>`) s popisom svih ostalih kategorija u aktivnom radnom prostoru (filtrirati trenutnu kategoriju iz popisa kako se ne bi spajala sama u sebe).
     - Gumb za potvrdu spajanja i gumb za odustajanje.
  3. U TypeScript komponenti (`category-details.page.ts`) implementirati metodu za slanje zahtjeva:
     - Pozvati `categoryRepo.merge(fromId, selectedToId)`.
     - Ako je uspješno: prikazati toast poruku o uspjehu, osvježiti podatke i preusmjeriti korisnika natrag na `/categories`.
     - Ako je neuspješno: prikazati poruku o grešci.
  4. **Napomena:** Onemogućiti ovu opciju ako je aplikacija u izvanmrežnom (offline) načinu rada, jer API zahtijeva sinkronu obradu u bazi podataka (provjeriti `appInitializer.isOnlineMode`).

---

## 2. [Produkcija] PostgreSQL konfiguracija [DOVRŠENO]
* **Opis:** Službeni zadatak diplomskog rada zahtijeva korištenje PostgreSQL baze podataka. Lokalno se koristi SQLite radi jednostavnosti.
* **Koraci za implementaciju:**
  1. Provjeriti je li PostgreSQL instaliran i pokrenut na produkcijskom poslužitelju.
  2. U produkcijskoj `.env` datoteci na poslužitelju postaviti:
     ```env
     DB_CONNECTION=pgsql
     DB_HOST=127.0.0.1
     DB_PORT=5432
     DB_DATABASE=allocento
     DB_USERNAME=tvoj_korisnik
     DB_PASSWORD=tvoja_lozinka
     ```
  3. Pokrenuti migracije na produkciji (`php artisan migrate`) i provjeriti prođe li sve bez grešaka.

---

## 3. [Frontend] Sučelje za ponavljajuće transakcije [DOVRŠENO]
* **Opis:** Backend dio za automatsko kreiranje transakcija na temelju predložaka je implementiran (model `RecurringTemplate`, controller i artisan command `transactions:process-recurring`). Na frontendu je potrebno dodati sučelje za upravljanje ovim predlošcima.
* **Koraci za implementaciju:**
  1. Kreirati novu stranicu ili dodati sekciju unutar postavki za ponavljajuće transakcije.
  2. Omogućiti CRUD nad predlošcima: odabir računa, iznosa, kategorije, projekta i frekvencije ponavljanja (npr. dnevno, tjedno, mjesečno, godišnje).
  3. Povezati s API rutama na `/api/workspaces/{id}/templates`.

---

## 4. [PWA] Provjera i optimizacija Bulk Sync sinkronizacije [DOVRŠENO & RJEŠENO]
* **Opis:** Provjereno je i osigurano ispravno ponašanje offline sinkronizacije i reaktivnosti sučelja.
* **Provedeni popravci:**
  1. **Reaktivnost mrežnog stanja:** Svojstvo `isOnlineMode` u `AppInitializerService` pretvoreno je u getter/setter koji interno čita i piše u Angular `signal`. Time je osigurano da Angular bilježi promjene stanja mreže.
  2. **Reaktivnost stranica:** U svim ključnim stranicama (`dashboard`, `transactions`, `categories`, `projects`, `accounts`, `workspaces`, `settings`), lokalni signal `isOnline` zamijenjen je reaktivnim `computed` signalom koji prati `appInitializer.isOnlineMode`. Sada sučelje trenutačno reagira na online/offline promjene (prikazuje/skriva značku "Izvanmrežno", zaključava rute i sl.) bez potrebe za ponovnim učitavanjem stranice.
  3. **Prijevod indikatora:** Ispravljen je prijevod u `hr.json` tako da se umjesto engleske riječi "offline" prikazuje hrvatski naziv "Izvanmrežno", što je usklađeno s tekstom diplomskog rada.
  4. **Pravilnost sinkronizacije:** Potvrđeno je da se offline transakcije ispravno spremaju u IndexedDB i red čekanja (`offline_queue`) pod negativnim ID-jevima, te da se pri povratku mreže šalje točno jedan skupni (bulk) HTTP POST zahtjev na `/api/transactions/sync` čime se osigurava atomarnost i čuva mrežni promet. Podaci se uspješno spajaju s PostgreSQL bazom.
