# Deployment

MEDIVAULT needs a Node.js server and a MySQL database. It cannot run on static hosting, because the web app talks to the API with a session cookie.

## Option 1: Docker on your machine (fastest demo)

```bash
docker compose up --build
```

Open http://localhost:3000 and log in with `demo@medivault.test` and `Demo@1234`. The image builds the React app and the API together. The first start creates the tables and loads sample data. Later starts skip that. Data is kept in the `medivault_data` volume. To reset everything, run `docker compose down -v`.

## Option 2: A Node host plus a hosted MySQL

Any host that runs Node 18 or newer and gives you a MySQL database will work. Free tiers and menus change often, so check your provider's current instructions.

1. Create a MySQL database and note its host, port, user, password, and name.
2. Create the web service from your GitHub repo.
3. Build command: `npm install --include=dev && npm run build`
   (Vite and Tailwind are dev dependencies. Many hosts set `NODE_ENV=production` while building, which would skip them, so `--include=dev` keeps the build from failing.)
4. Start command: `npm run start:prod`
5. Health check path: `/health`
6. Set these environment variables:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | A long random string. The app refuses to start in production without it. |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | From your database provider |
| `DB_SSL` | `true` if the provider requires TLS |
| `SEED_DEMO` | `false` if you do not want the fake sample patients |

`npm run start:prod` creates the tables on the first run only, then starts the server. It is safe to run on every deploy. If you already have a database from an earlier version, run the files in `db/migrations/` that it is missing, in order (`001`, then `002`), once each.

Your host must serve the site over HTTPS. In production the session cookie is marked `secure`, so browsers only send it over HTTPS. Only set `COOKIE_SECURE=false` for a plain http demo such as Docker on localhost.

## Option 3: Run the Docker image anywhere

```bash
docker build -t medivault .
docker run -p 3000:3000 --env-file .env -e COOKIE_SECURE=false medivault
```

Point `DB_HOST` in your `.env` at a reachable MySQL server.

## After deploying

* Visit `/health`. You should see `{"ok":true}`.
* Open the site, create an account, set up your record, and check that the dashboard shows it.
* Open your browser's developer console on a few pages. There should be no red errors. If the page is blank or styles are missing, check for Content Security Policy messages.
* Log in with the demo account if you kept the sample data.

## Before sharing the link publicly

* The demo account and its password are public in this repo. Set `SEED_DEMO=false` if you do not want it on a live site.
* Keep every record fake. The app does not encrypt data at rest.
* Use a strong `SESSION_SECRET` and keep it out of git.
