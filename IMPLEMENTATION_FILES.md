# MediVault implementation files

This ZIP is the modified full project, not just a patch pack. Replace your project folder with this folder after backing up your current version.

## Existing files replaced/modified
- `src/pages/RecordEditorPage.jsx` — religion dropdown; hospitalization form and optional chronic-condition multi-select; preview updates.
- `src/pages/SettingsPage.jsx` — religion dropdown in personal settings.
- `src/schemas/medicalRecord.js` — validation, defaults, mapping, and API payload for hospitalizations.
- `src/schemas/auth.js` — expanded religion length validation.
- `src/pages/DashboardPage.jsx` — clickable QR card, QR modal, PNG/TXT/PDF actions, temporary share link generation and revocation, hospitalization summary.
- `src/pages/SharedRecordPage.jsx` — new public read-only shared-record page with export options.
- `src/api/client.js` — sharing API client.
- `routes/patient.js` — hospitalization read/write and condition association persistence.
- `routes/shares.js` — new share-link API, token hashing, expiration, and revocation.
- `server.js` — mounts sharing API.
- `db/schema.sql` — tables for fresh installations.
- `scripts/init-db.js` — applies safe migration during `db:ensure`.
- `package.json` — adds QR-code dependency.

## New files added
- `src/utils/religion-options.js`
- `src/utils/medical-history-export.js`
- `db/migrations/003_hospitalization_and_qr_sharing.sql`

## Setup
1. Back up the current project and database.
2. Copy the modified files from this ZIP into the project, preserving the folder structure.
3. Run `npm install`.
4. Run `npm run db:ensure` to apply the safe migration to an existing database. Do **not** run `npm run db:init` against a database containing real user data; that script resets the schema.
5. Run `npm run build` and `npm test`.

`Download PDF` opens the browser print dialog; choose **Save as PDF**. The QR contains a temporary URL, not the medical record itself. The share endpoint serves a read-only snapshot, stores only a SHA-256 hash of the token, and checks expiry/revocation on each access. The current PDF implementation uses browser print-to-PDF rather than generating a PDF file silently.
