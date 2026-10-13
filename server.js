require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const db = require('./config/db');
const MySQLStore = require('./config/sessionStore');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

if (!process.env.SESSION_SECRET) {
  // A missing secret in production would make sessions guessable, so refuse to start.
  if (isProd) { console.error('SESSION_SECRET is required in production.'); process.exit(1); }
  console.warn('Warning: SESSION_SECRET is not set. Copy .env.example to .env and set one.');
}

app.disable('x-powered-by');
if (isProd) app.set('trust proxy', 1);

// Security headers. The CSP allows only our own scripts. Styles need 'unsafe-inline' because
// Radix UI and the toast library set inline style attributes.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; " +
    "connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
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

// API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/shares', require('./routes/shares'));
app.use('/api', require('./routes/patient'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// The React app (built into dist/). In development, Vite serves it instead and
// proxies /api to this server.
const webDist = path.join(__dirname, 'dist');
app.use(express.static(webDist, {
  index: false,
  setHeaders: (res, file) => {
    // Hashed files under /assets never change, so browsers may keep them for a year.
    res.setHeader('Cache-Control', file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache');
  }
}));

// Any other page request gets the app shell, and React Router decides what to show.
app.use((req, res, next) => {
  if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api')) return next();
  // A request for a file (anything under /assets or with an extension) that was not found above is a
  // real 404. Answering it with the page would hand HTML to a browser that expects JavaScript or CSS.
  if (req.path.startsWith('/assets/') || path.extname(req.path)) return res.status(404).type('text/plain').send('Not found.');
  const indexFile = path.join(webDist, 'index.html');
  if (!fs.existsSync(indexFile)) {
    return res.status(503).type('text/plain').send('The frontend is not built yet. Run: npm run build');
  }
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(indexFile);
});

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
