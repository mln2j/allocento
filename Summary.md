<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# ok, ajmo napraviti onda sad sažetak pa da imam kasnije za upit i onda idemo se baciti na backend

Allocento je PWA za osobno/obiteljsko i poslovno upravljanje budžetima, s Angular frontendom, Laravel REST API backendom i MySQL bazom.[^1][^2]

## Domenska pravila

- User može pripadati **najviše jednom kućanstvu** (household) i **najviše jednoj organizaciji** (organization), ali može imati oboje istovremeno.[^3][^4]
- Računi (accounts) mogu biti personal, kućanski ili organizacijski; personal i business račun se mogu “spojiti” preko posebne veze između računa, ne preko dodatnih veza na usera.[^5][^6]


## Funkcionalni fokus

- Personal/household dio: praćenje prihoda i rashoda po osobnim i zajedničkim računima, kategorijama i kućnom budžetu; svi članovi kućanstva vide ukupno stanje kućanstva.[^7][^1]
- Enterprise dio: organizacije imaju račune i projekte; troškovi se vežu na račune i projekte, s ograničenom vidljivošću salda i budžeta po ulogama (owner/manager/member).[^8][^5]


## Baza – glavni entiteti

- **User**: id, name, email, password, `household_id` (nullable), `organization_id` (nullable); veze na Transaction.[^4][^3]
- **Household**: id, name, owner_id; veze na Users i Accounts.[^9][^10]
- **Organization**: id, name, owner_id, description; veze na Users, Accounts i Projects.[^11][^3]
- **Account**: id, name, type (personal/household/organization), household_id, organization_id, owner_user_id (za osobne), currency, opening_balance, budget_limit.[^10][^9]
- **AccountLink**: spaja dva accounta (from_account_id, to_account_id, relation_type) za povezivanje personal i business računa.[^12][^5]
- **Project**: id, organization_id, name, description, planned_budget, start_date, end_date.[^7][^10]
- **Category**: id, name, type (personal/organization), parent_id.[^9][^7]
- **Transaction**: id, account_id, project_id (nullable), user_id, category_id, type (income/expense), amount, date, description, is_recurring, recurring_rule (JSON).[^6][^5]


## Budžeti i izračuni

- Account: saldo = opening_balance + prihodi − rashodi; `remaining_budget = budget_limit − potrošeno` ako je limit definiran.[^13][^10]
- Project: sumira rashode s istim project_id i računa `remaining = planned_budget − spent`.[^13][^7]
- Household: ukupno stanje = zbroj salda svih (ili shared) household accounts, vidljivo svim članovima kućanstva.[^1][^7]


## Arhitektura fronta i backenda

- **Angular PWA**: moduli po domenama (auth, household, organization, accounts, projects, transactions, reports); servisi za rad s Laravel API-jem (HTTPClient + interceptori za auth).[^14][^15]
- **Laravel API**:
    - Controllers (Auth, Household, Organization, Account, Project, Transaction, Report) izlažu JSON rute.[^16][^14]
    - Services (BudgetService, HouseholdService, OrganizationService, TransactionService) drže poslovnu logiku (“koliko je ostalo”, pravila vidljivosti).[^17][^18]
    - Repositories (AccountRepository, ProjectRepository, TransactionRepository) kapsuliraju Eloquent upite i agregacije.[^18][^19]
    - Policies i guardovi implementiraju RBAC za pristup računima, kućanstvima i organizacijama.[^20][^21]

U sljedećem koraku se može krenuti direktno u backend: prvo definirati migracije i Eloquent modele za ove entitete, pa slojeve Repository i Service za npr. Accounts i Transactions.
<span style="display:none">[^22][^23][^24][^25][^26][^27][^28][^29][^30][^31][^32]</span>

<div align="center">⁂</div>

[^1]: https://orangesoft.co/blog/how-to-build-a-personal-finance-app

[^2]: https://stackoverflow.com/questions/20250581/simple-spa-with-angular-and-laravel-api

[^3]: https://stackoverflow.com/questions/23495256/database-design-including-people-and-organisation

[^4]: https://donedone.com/building-the-optimal-user-database-model-for-your-application/

[^5]: https://imaginovation.net/blog/building-personal-finance-app/

[^6]: https://stackoverflow.com/questions/5100386/personal-finance-app-database-design

[^7]: https://startups.epam.com/blog/how-to-build-a-finance-app-to-create-personal-budget

[^8]: https://saigontechnology.com/blog/finance-app-development/

[^9]: https://www.reddit.com/r/SQL/comments/1gz2uer/feedback_on_schema_for_budgeting_app/

[^10]: https://www.imade-athing.com/things/software/budget-app/2020/04/28/beginning-budget-app-database.html

[^11]: https://slashdev.io/-how-to-build-a-custom-finance-management-system-in-laravel-in-2024

[^12]: https://www.spaceotechnologies.com/blog/build-personal-finance-app/

[^13]: https://agilie.com/blog/how-to-build-an-effective-personal-finance-application

[^14]: https://www.innoraft.ai/blog/laravel-api-angular-integration-guide

[^15]: https://thepragmaticengineer.hashnode.dev/clean-architecture-in-frontend-applications-with-angular

[^16]: https://blog.stackademic.com/laravel-single-page-application-spa-a-complete-guide-36df5ebeb373

[^17]: https://acquaintsoft.com/blog/how-to-build-fintech-app-with-laravel

[^18]: https://dev.to/bdelespierre/how-to-implement-clean-architecture-with-laravel-2f2i

[^19]: https://dev.to/blamsa0mine/structuring-a-laravel-project-with-the-repository-pattern-and-services-11pm

[^20]: https://sdk.finance/blog/the-fundamentals-of-fintech-architecture-trends-challenges-and-solutions/

[^21]: https://laravel.com/docs/12.x/sanctum

[^22]: https://exoft.net/blog/personal-finance-app-development-guide/

[^23]: https://www.designveloper.com/blog/how-to-create-a-financial-app/

[^24]: https://rewisoft.com/blog/how-to-build-a-personal-finance-app/

[^25]: https://github.com/devmark/laravel-angular-cms

[^26]: https://www.icoderzsolutions.com/the-budget-expense-tracker-app-development.shtml

[^27]: https://www.reddit.com/r/SideProject/comments/1f14hn7/how_i_built_a_personal_finance_app_with_claude/

[^28]: https://robynveitch.com/personal-finance-a-standard-for-internal-enterprise-apps/

[^29]: https://www.concettolabs.com/blog/laravel-inertia/

[^30]: https://mangosoft.tech/blog/personal-finance-app-development-essential-steps-and-best-practices/

[^31]: https://scand.com/company/blog/how-to-build-personal-finance-app-complete-guide/

[^32]: https://www.apptunix.com/blog/build-personal-finance-budgeting-app/

