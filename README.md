# Traffic Violations Management System

An Arabic, right-to-left web prototype for traffic-violation administration. It includes dashboards for cameras, violations, users, profiles, login, and registration, backed by a small PHP/MySQL authentication layer.

## Technology

- PHP 8.2 and MySQL/MariaDB
- HTML5, CSS3, and vanilla JavaScript
- Bootstrap 5 and Font Awesome from public CDNs

## Prerequisites

- PHP 8.2 with the `mysqli` extension
- MySQL 8 or MariaDB 10.4+
- A web server such as Apache, Nginx, or PHP's development server

## Setup

1. Create an empty MySQL database and import `database/schema.sql`.
2. Create a least-privilege database user for the application.
3. Configure the variables shown in `.env.example` in the web-server environment. The application reads operating-system environment variables directly; it does not parse `.env` files.
4. Start the site from the repository root:

   ```bash
   php -S localhost:8080
   ```

5. Open `http://localhost:8080/login.html`. Register an account before signing in.

## Structure

- `login.php`, `register.php`, and `db.php` — implemented authentication endpoints
- `database/schema.sql` — schema only; no real users or credentials
- `*.html` — Arabic UI pages
- `script.js` — prototype interactions and sample in-browser data
- `style.css` and `styles.css` — page styling

## Implemented versus prototype features

Registration and login use prepared database statements and password hashing. Camera selection, violation lookup, user administration, profile editing, and password recovery are front-end demonstrations only; they do not persist changes or contact real devices/services.

## Security notes

- Database credentials must be supplied through environment variables.
- The published schema contains no user records or plaintext passwords.
- This remains a learning prototype. Add CSRF protection, authorization checks for every protected page/API, secure session-cookie settings, rate limiting, and a real password-recovery flow before any public deployment.

## Verification

Run PHP syntax checks over `*.php`, import the schema into a disposable database, register a user, verify the stored password is hashed, then log in with correct and incorrect credentials. Also open each HTML page and check the browser console for JavaScript errors.
