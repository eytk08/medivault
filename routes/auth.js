const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { requireLogin, rateLimit } = require('../middleware/auth');

const router = express.Router();
const authLimit = rateLimit(parseInt(process.env.AUTH_RATE_LIMIT, 10) || 10); // failed attempts per 15 minutes
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase();
}

// Password rule: 8 to 72 characters with at least one letter and one number.
function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'Password must be at least 8 characters.';
  if (pw.length > 72) return 'Password must be 72 characters or fewer.';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Password needs at least one letter and one number.';
  return null;
}

// Start a fresh session for a user (prevents session fixation).
function startSession(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user.user_ID;
      req.session.email = user.email;
      resolve();
    });
  });
}

router.post('/signup', authLimit, async (req, res, next) => {
  try {
    const email = cleanEmail(req.body.email);
    const { password, confirmPassword } = req.body;

    if (!EMAIL_RE.test(email) || email.length > 100) return res.status(400).json({ error: 'Please enter a valid email address.' });
    const problem = passwordProblem(password);
    if (problem) return res.status(400).json({ error: problem });
    if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match.' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, hash]);
    await startSession(req, { user_ID: result.insertId, email });
    res.status(201).json({ email, hasProfile: false });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That email is already registered.' });
    next(err);
  }
});

router.post('/login', authLimit, async (req, res, next) => {
  try {
    const email = cleanEmail(req.body.email);
    const password = String(req.body.password || '');

    const [rows] = await db.execute('SELECT user_ID, email, password_hash FROM users WHERE email = ?', [email]);
    const user = rows[0];
    // Same message for "no such email" and "wrong password" so emails cannot be guessed.
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    await startSession(req, user);
    const [p] = await db.execute('SELECT patient_ID FROM patient WHERE fk_user_ID = ?', [user.user_ID]);
    res.json({ email: user.email, hasProfile: p.length > 0 });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', requireLogin, async (req, res, next) => {
  try {
    const [p] = await db.execute('SELECT patient_ID FROM patient WHERE fk_user_ID = ?', [req.session.userId]);
    res.json({ email: req.session.email, hasProfile: p.length > 0 });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.passwordProblem = passwordProblem;
module.exports.EMAIL_RE = EMAIL_RE;
module.exports.cleanEmail = cleanEmail;
