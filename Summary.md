Allocento je PWA za osobno/obiteljsko i poslovno upravljanje budžetima, s Angular frontendom, Laravel REST API backendom i MySQL bazom.

## Domenska pravila

- User može pripadati **najviše jednom kućanstvu** (household) i **najviše jednoj organizaciji** (organization), ali može imati oboje istovremeno.
- Računi (accounts) mogu biti personal, kućanski ili organizacijski; personal i business račun se mogu “spojiti” preko posebne veze između računa, ne preko dodatnih veza na usera.


## Funkcionalni fokus

- Personal/household dio: praćenje prihoda i rashoda po osobnim i zajedničkim računima, kategorijama i kućnom budžetu; svi članovi kućanstva vide ukupno stanje kućanstva.
- Enterprise dio: organizacije imaju račune i projekte; troškovi se vežu na račune i projekte, s ograničenom vidljivošću salda i budžeta po ulogama (owner/manager/member).


## Baza – glavni entiteti

- **User**: id, name, email, password, `household_id` (nullable), `organization_id` (nullable); veze na Transaction.
- **Household**: id, name, owner_id; veze na Users i Accounts.
- **Organization**: id, name, owner_id, description; veze na Users, Accounts i Projects.
- **Account**: id, name, type (personal/household/organization), household_id, organization_id, owner_user_id (za osobne), currency, opening_balance, budget_limit.
- **AccountLink**: spaja dva accounta (from_account_id, to_account_id, relation_type) za povezivanje personal i business računa.
- **Project**: id, organization_id, name, description, planned_budget, start_date, end_date.
- **Category**: id, name, type (personal/organization), parent_id.
- **Transaction**: id, account_id, project_id (nullable), user_id, category_id, type (income/expense), amount, date, description, is_recurring, recurring_rule (JSON).


## Budžeti i izračuni

- Account: saldo = opening_balance + prihodi − rashodi; `remaining_budget = budget_limit − potrošeno` ako je limit definiran.
- Project: sumira rashode s istim project_id i računa `remaining = planned_budget − spent`.
- Household: ukupno stanje = zbroj salda svih (ili shared) household accounts, vidljivo svim članovima kućanstva.


## Arhitektura fronta i backenda

- **Angular PWA**: moduli po domenama (auth, household, organization, accounts, projects, transactions, reports); servisi za rad s Laravel API-jem (HTTPClient + interceptori za auth).
- **Laravel API**:
    - Controllers (Auth, Household, Organization, Account, Project, Transaction, Report) izlažu JSON rute.
    - Services (BudgetService, HouseholdService, OrganizationService, TransactionService) drže poslovnu logiku (“koliko je ostalo”, pravila vidljivosti).
    - Repositories (AccountRepository, ProjectRepository, TransactionRepository) kapsuliraju Eloquent upite i agregacije.
    - Policies i guardovi implementiraju RBAC za pristup računima, kućanstvima i organizacijama.