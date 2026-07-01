# Allocento

Allocento is a Progressive Web Application (PWA) designed for personal, family, and business budget management. It features a unified platform to track expenses across different domains with a premium UX and a highly flexible **Workspace** architecture.

---

## Project Highlights

- **Tech Stack**: Laravel 12 API & Angular 20 SPA.
- **Modern UI/UX**: Custom-built, responsive CSS styling using modern design principles (no heavy UI libraries).
- **Workspace Architecture**: Fluidly switch between different contexts (*Personal*, *Household*, or *Company*) directly from the application header.
- **Shared Wealth**: Shared accounts across workspaces using flexible pivot tables, role-based member invitation management, and real-time dashboard analytics.
- **Offline-First & Sync**: Native local database buffering for offline transactions, bulk-syncing with Laravel API when connection is restored.

---

## Core Features

- **Auth & Workspace Bootstrap**: Automatic generation of the default "Osobno" personal workspace upon user registration, favorite workspace marking, and multi-language context.
- **Intelligent Dashboard**: Categorized spending stats, primary account highlighting, and recent activities filtered by active workspace.
- **Workspace Transactions**: Fast transaction logging, multi-tag transaction search, and dynamic category assignment, seamlessly handling offline creation and editing.
- **Workspace Accounts**: Flexible account sharing between multiple workspaces using secure `account_workspace` pivots.
- **Space Management**: Create custom spaces, send role-based (`manager`, `member`) mail invitations, and assign permissions.

---

## Project Structure

- **[Backend (API)](./backend/README.md)**: Laravel 12 API with Sanctum authentication, resolving workspace states via `X-Workspace-ID` header middleware.
- **[Frontend (Client)](./frontend/README.md)**: Angular 20 PWA with a custom CSS design system.

---

## Quick Start

1. **Set up the Backend**:
   
   ```bash
   cd backend
   composer install
   cp .env.example .env
   php artisan key:generate
   php artisan migrate:fresh --seed
   php artisan storage:link
   php artisan serve
   ```

2. **Set up the Frontend**:
   
   ```bash
   cd frontend
   npm install
   npm start
   ```

---

## License

This project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
