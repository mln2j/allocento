# Allocento Backend

The REST API for the Allocento application, built with **Laravel 12**.

## Requirements

- **PHP**: 8.2
- **Composer**
- **Database**: MySQL (recommended) or SQLite

## Installation

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install PHP dependencies:**
   ```bash
   composer install
   ```

3. **Environment Setup:**
   Copy the example environment file and configure your database credentials.
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` and set `DB_DATABASE`, `DB_USERNAME`, etc.*

4. **Generate Application Key:**
   ```bash
   php artisan key:generate
   ```

5. **Run Migrations and Seed Database:**
   This will create the necessary tables and populate them with initial data.
   ```bash
   php artisan migrate --seed
   ```

## Running the Application

To start the local development server:

```bash
php artisan serve
```

The API will be available at `http://localhost:8000`.

## Key Features

- **Authentication**: Powered by Laravel Sanctum (Login, Register).
- **Core Resources**: Accounts, Transactions, Households, Projects, Categories.
- **Reports**: Spending by category and other aggregations.
- **Middleware**: Role-based access control and tenant isolation (Household/Organization).

## Testing

Run the test suite using Artisan:

```bash
php artisan test
```
