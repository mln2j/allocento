### 1. AUTH MODULE (Login, Register, Splash & Errors)

- **Splash Screen**: Initial check for a valid Sanctum token in `localStorage`, automatically redirecting the user to their set Favorite Workspace.
- **Login & Register**: Secure backend password hashing, registration, and login. Upon registration, the backend automatically creates the user's first personal workspace named **"Osobno"** (Personal) and sets it as favorite.
- **Error / No Connection Screen**: Error screen shown when the application has no local data and the API is unreachable.

### 2. DASHBOARD SCREEN (Main Dashboard)

- **Workspace Switcher**: Easily switch between different active workspaces (e.g., *Personal*, *Household*, or *Company*) directly from the application header. Selecting a workspace changes the data context by appending the `X-Workspace-ID` HTTP header to all requests.
- **Financial Balance**: Displays the total net balance of the active workspace, calculated based on all accounts assigned to that specific workspace.
- **Monthly Analytics**: Visual spending breakdown charts and progress bars by category for the current month, filterable by account or the entire workspace.
- **Recent Activities**: Lists the last 10 transactions inside the active workspace with clear visual indicators (green for income, red for expenses).

### 3. TRANSACTIONS SCREEN (Transaction Insights)

- **History & Filters**: Scrollable transaction list with quick filtering by accounts inside the workspace, date, or custom tags (e.g., `#clio2`, `#konzum`).
- **Input Form**: Rapidly log transaction details: amount, source account (restricted to the active workspace), category, date, and custom tags (JSON support).
- **Recurring Transactions (Recurring Engine)**:
  - **Templates**: Create and manage recurring transaction templates (`recurring_templates`) supporting daily, weekly, monthly, and yearly frequencies.
  - **Laravel Scheduler**: A background processor (`transactions:process-recurring` artisan command) automatically generates transaction records and updates account balances on scheduled days.
- **Bulk Sync**: Offline synchronization support allowing up to 500 queued transactions to be synchronized at once via `POST /api/transactions/bulk`.

### 4. ACCOUNTS SCREEN (Account Management)

- **Accounts List**: Displays all accounts associated with the active workspace through the `account_workspace` pivot relationship.
- **Create & Edit**: Create new accounts (Checking, Savings, Cash, Credit, Investment, Other), select currency (EUR default), and archive or delete accounts.
- **Account Sharing**: Seamlessly share a single account across multiple workspaces (e.g., a shared checking account can be toggled to appear in both *Personal* and *Household* workspaces).
- **Primary Account**: Highlight and set a primary account inside the active workspace.

### 5. PROFILE SCREEN (Workspace & User Settings)

- **Edit Profile**: Modify user personal details (name, email, password, and preferred language).
- **Workspace Management**: Fully manage all workspaces you participate in:
  - Modify workspace name, type (`personal`, `household`, `company`), and visual icon.
  - **Collaboration & Members**: Add new members by sending role-based (`manager`, `member`) email invitations and remove existing members.
  - **Favorite Workspace**: Star any workspace to automatically load it as your default workspace upon logging in.

### 6. OFFLINE SYNC SYSTEM (Offline-First Architecture)

- **Dexie.js / IndexedDB**: Temporarily buffers all transactions locally on the client's device when there is no internet connection.
- **Background Sync**: As soon as the client detects internet connectivity, it automatically pushes all queued offline transactions to the backend in a single optimized bulk request.
