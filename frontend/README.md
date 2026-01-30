# Allocento Frontend

The Progressive Web Application (PWA) client for Allocento, built with **Angular 20**.

## Requirements

- **Node.js**: (Compatible with Angular 20)
- **NPM**

## Installation

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

## Running the Application

### Development Server
Run the application in development mode with live reload:

```bash
npm start
```
*Or directly via Angular CLI: `ng serve`*

Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Build
To build the project for production:

```bash
npm run build
```
The build artifacts will be stored in the `dist/` directory.

## Features

- **PWA Support**: Installable on mobile and desktop devices.
- **UI Framework**: Angular Material for a modern, responsive design.
- **State Management**: Service-based state management with RxJS.
- **Modules**:
    - **Auth**: Login and Registration.
    - **Dashboard**: Overview of finances.
    - **Accounts**: Manage personal, household, and organization accounts.
    - **Transactions**: Income and expense tracking.
    - **Projects**: Business project management.