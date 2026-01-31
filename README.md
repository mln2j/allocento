# Allocento

Allocento is a Progressive Web Application (PWA) designed for personal, family, and business budget management. It features a unified platform to track expenses across different domains (Household & Organization) with a premium UX and role-based access control.

## Project Highlights

- **Tech Stack**: Laravel 12 API & Angular 20 SPA.
- **Modern UI**: Custom-designed interfaces with Material Design 3 principles.
- **Multi-Tenant**: Manage your personal money, family household, and business organization in one app.
- **Smart Analytics**: Real-time spending breakdown and balance tracking.

## Core Features

- ✅ **Profile & Security**: Update profile info, upload photos, and secure password management.
- ✅ **Intelligent Dashboard**: At-a-glance view of your net worth, recent activity, and categorical spending.
- ✅ **Shared Wealth**: Household and Organization management with member invitations.
- ✅ **Account Management**: Support for multiple account types with "Primary Account" highlighting.
- ✅ **Global History**: Unified transaction log with easy filtering and editing.
- ✅ **Notifications**: In-app notification system for invitations and team events.

## Project Structure

- **[Backend (API)](./backend/README.md)**: Laravel 12 with Sanctum authentication.
- **[Frontend (Client)](./frontend/README.md)**: Angular 20 PWA with Angular Material.

## Quick Start

1. **Set up the Backend**:
   ```bash
   cd backend
   composer install
   cp .env.example .env
   php artisan key:generate
   php artisan migrate --seed
   php artisan storage:link
   php artisan serve
   ```

2. **Set up the Frontend**:
   ```bash
   cd frontend
   npm install
   npm start
   ```

## License

This project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
