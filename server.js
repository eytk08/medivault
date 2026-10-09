require('dotenv').config({ quiet: true });
const path = require('path');
const express = require('express');
const session = require('express-session');
const db = require('./config/db');
const MySQLStore = require('./config/sessionStore');
const { requireLoginPage } = require('./middleware/auth');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

if (!process.env.SESSION_SECRET) {
  // A missing secret in production would make sessions guessable, so refuse to start.
  if (isProd) { console.error('SESSION_SECRET is required in production.'); process.exit(1); }
  console.warn('Warning: SESSION_SECRET is not set. Copy .env.example to .env and set one.');
}

app.disable('x-powered-by');
if (isProd) app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

app.use(express.json({ limit: '100kb' }));
app.use(session({
  name: 'connect.sid',
  secret: process.env.SESSION_SECRET || 'dev_only_secret',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: new MySQLStore(db),
  // secure cookies only travel over HTTPS. Set COOKIE_SECURE=false only for a plain http demo.
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd, maxAge: 2 * 60 * 60 * 1000 }
}));

// Used by Docker and hosting platforms to see if the app and database are alive
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false });
  }
});

// Pages that need a login
['/form.html', '/user.dashboard.html', '/settings.html'].forEach((p) => app.get(p, requireLoginPage));

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.redirect('/home.html'));

// API
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/patient'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Error handler (keeps details in the server log, not in the response)
app.use((err, req, res, next) => {
  console.error(err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request body.' });
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const port = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(port, () => console.log(`MEDIVAULT running at http://localhost:${port}`));
}
module.exports = app;
