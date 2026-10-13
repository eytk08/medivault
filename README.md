# MediVault

<!-- After pushing, add your CI badge: ![CI](https://github.com/<your-username>/medivault/actions/workflows/ci.yml/badge.svg) -->

A personal medical history app. People create an account, record their details, vitals, conditions, allergies and surgeries, and see everything on a dashboard. The interface is a React single page app. The back end is Node, Express and MySQL.

> **Important:** All sample data is fake. The app hashes passwords and protects the API with HTTP only session cookies, but it does **not** encrypt medical data at rest. Do not store real patient data until encryption at rest, audit logging, secure backups, deployment hardening and the relevant privacy and legal checks are in place.

<!--
## Screenshots

| Landing | Sign in |
| --- | --- |
| ![Landing](docs/screenshots/landing.png) | ![Sign in](docs/screenshots/sign-in.png) |

| Clinical record form | Review before saving |
| --- | --- |
| ![Record form](docs/screenshots/record-form.png) | ![Preview](docs/screenshots/record-preview.png) |

| Dashboard | Dashboard on a phone |
| --- | --- |
| ![Dashboard](docs/screenshots/dashboard.png) | ![Mobile](docs/screenshots/dashboard-mobile.png) |
-->

## Features

* **Landing page and a split screen sign in / create account**, with a live countdown when too many attempts are made, and a return to the page you were trying to open
* **Clinical record form** with repeating sections for conditions, allergies (with severity and reaction) and surgeries (with hospital, surgeon and notes), a live BMI, and a review dialog before saving
* **Validation on both sides**: Zod rules in the browser, the same limits checked again on the server
* **Dashboard** with a medical snapshot, loading skeletons and empty states
* **Settings** to edit your profile, change your email, phone or password (always confirmed with your current password), and delete your account behind a password and a typed confirmation
* **Accessible by design**: labelled fields, announced errors, keyboard friendly dialogs and tabs (Radix UI)

## Tech stack

| Part | Tools |
| --- | --- |
| Front end | React 18, Vite, Tailwind CSS, React Router 7, React Hook Form and Zod, Radix UI primitives, Lucide icons, Sonner toasts |
| Back end | Node.js 20+, Express 5, MySQL 8 (MariaDB 10.5+ also works) with mysql2 prepared statements, bcryptjs, express-session with a MySQL session store |
| Quality | Node's built in test runner, Docker, GitHub Actions, Dependabot |

## Run it locally

You need Node.js 20 or newer and a running MySQL server. One terminal is enough.

1. Install: `npm install`
2. Copy `.env.example` to `.env` and fill in your MySQL password and a long random `SESSION_SECRET`
3. Create the database with sample data: `npm run db:seed` (this resets the tables)
4. Start the API and the web app together: `npm run dev`
5. Open http://127.0.0.1:5173

`npm run dev` runs Express on port 3000 and Vite on port 5173 at the same time. Vite forwards `/api` to Express, so the session cookie stays first party and behaves like it does in production. It uses the IPv4 address on purpose, because on newer Node versions `localhost` can resolve to IPv6 and the proxy then fails.

Demo login: `demo@medivault.test` with password `Demo@1234`

**Production like run** (Express serves the built app): `npm run build`, then `npm start`, then open http://localhost:3000

**Upgrading an existing database:** run the files in `db/migrations/` that your database is missing, in order (see the comments inside each file).

## Run with Docker

```bash
docker compose up --build
```

Open http://localhost:3000. The image builds the React app and the API together. The first start creates the tables and loads sample data, and later starts skip that. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for hosting and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it fits together.

## Project structure

```
src/                     the React app
  api/                   cookie aware REST client
  components/            app shell, route protection, small UI building blocks
  hooks/                 session context
  pages/                 landing, auth, dashboard, record editor, settings
  schemas/               Zod rules that mirror the database limits
server.js                Express app: API, security headers, serves the built web app
config/                  database pool, MySQL session store
routes/                  auth (sign up, in, out) and patient (record, settings)
middleware/auth.js       login check and a small rate limiter with Retry-After
db/                      schema.sql, seed.sql, queries.sql, migrations/
scripts/init-db.js       builds the database (db:init, db:seed, db:ensure)
test/api.test.js         API tests
docs/                    architecture, deployment, screenshots
public/                  static files copied into the build (favicon)
Dockerfile, docker-compose.yml, .github/
```

## Rules the form and the database share

| Field | Rule | Where it comes from |
| --- | --- | --- |
| Height | 30 to 272 cm, up to 2 decimals | `CHECK` on `patientHeight`, `DECIMAL(5,2)` |
| Weight | 1 to 500 kg, up to 2 decimals | `CHECK` on `patientWeight`, `DECIMAL(5,2)` |
| Sex, marital status, blood type | one of a fixed list | `ENUM` columns |
| Condition status | active, managed or resolved | `ENUM` on `conditionStatus` |
| Allergy severity | mild, moderate or severe | `ENUM` on `allergenSeverity` |
| Surgery details | hospital up to 100, surgeon up to 80, notes up to 500 characters | `VARCHAR` sizes |
| Phone | digits, spaces, + ( ) and dashes, 7 to 20 characters | server validation |
| Dates | real calendar days from 1900 until today | server validation |
| Each list | at most 30 rows | server validation |

## API

| Method and path | Purpose |
| --- | --- |
| `POST /api/auth/signup`, `/login`, `/logout` | Account access. Login and signup are rate limited and answer 429 with `Retry-After` |
| `GET /api/auth/me` | Who is signed in |
| `GET /api/patient` | The full record (patient, physician, conditions, allergies, surgeries) |
| `POST /api/patient` | Save the whole record in one transaction |
| `PUT /api/patient/personal` | Update personal details |
| `PUT /api/account`, `DELETE /api/account` | Email, phone and password, and account deletion (both need the current password) |
| `GET /health` | Is the app and its database alive |

## Database

Seven tables: `users`, `doctor`, `patient`, `medical_condition`, `allergy`, `surgery` and `sessions`, plus a `v_patient` view that calculates age. Foreign keys cascade, so deleting an account removes the patient and everything under it. `db/queries.sql` has 12 practice queries from simple to difficult.

## Security notes

* Passwords are stored as bcrypt hashes, and login errors do not reveal whether an email exists
* Cookies are `httpOnly` and `sameSite=lax`, and `secure` in production. Sessions live in MySQL, so they survive restarts
* The server sends a strict Content Security Policy (own scripts only) and other security headers
* Failed logins and signups are rate limited, and the sign in form shows how long to wait
* Every query uses placeholders, so SQL injection is blocked. Text from the database is rendered by React, which escapes it
* In production the app refuses to start without a `SESSION_SECRET`

## Tests

`npm test` runs the API tests on a separate `medivault_test` database (it needs a MySQL user that can create databases). They cover auth, validation, transactions, cascades, security headers, sessions, the app shell and the practice queries. GitHub Actions runs them on Node 20 and 22, builds the web app, and checks that the Docker image builds.

## Known limits

* Medical details are sensitive. Data is protected in transit by HTTPS when you host it, but it is **not encrypted at rest** by the app
* No password reset, email verification or two factor sign in yet
* The rate limiter is in memory, so it is per instance
* There are no automated tests for the React screens yet

## Roadmap

* Password reset and email verification
* Encryption of sensitive columns at rest
* Tests for the React screens
* History of changes to a record
* Export a record as a PDF


## Medical history sharing and hospitalization additions

- The religion dropdown options are in `src/utils/religion-options.js` and are used in both the record editor and Settings.
- Hospital admissions are saved independently from chronic conditions. Related conditions are optional associations stored in `hospitalization_condition`; a hospitalization diagnosis never creates a chronic condition.
- The dashboard can create a temporary share snapshot. The QR contains only a random URL token; the database stores a SHA-256 token hash, snapshot, expiry, and revocation state. Share links expire in 1 hour to 7 days and can be revoked from the dashboard panel.
- `Download PDF` opens the browser print dialog. Choose **Save as PDF**. TXT and QR PNG download directly.
- `npm run db:ensure` applies the safe `003_hospitalization_and_qr_sharing.sql` migration to existing databases. Back up the database first. Do not use `npm run db:init` on a populated database because the base schema resets tables.
