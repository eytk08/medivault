// Run with: npm test   (needs MySQL; uses its own database called medivault_test)
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'medivault_test';
process.env.SESSION_SECRET = 'test_secret';
process.env.AUTH_RATE_LIMIT = '1000'; // the limiter has its own test below
require('dotenv').config({ quiet: true });

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

let server, base, db, MySQLStore;

// A tiny HTTP client that remembers the session cookie, like a browser tab.
function client() {
  let cookie = '';
  return async function call(method, url, body, { noCookie = false } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (cookie && !noCookie) headers.Cookie = cookie;
    const res = await fetch(base + url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual' });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    let data = null;
    try { data = await res.json(); } catch (e) { /* no body */ }
    return { status: res.status, data, location: res.headers.get('location') };
  };
}

const newEmail = (tag) => `${tag}${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`;
const validForm = (extra = {}) => ({
  patientName: 'Test Person', patientBday: '1999-03-15', patientSex: 'F', patientRel: 'Christian', patientMarStat: 'single',
  patientOccup: 'Developer', patientPNum: '09171234567', patientBType: 'O+', patientHeight: '165.5', patientWeight: '58.25',
  doctor: { name: 'Dr. Test', phone: '09180000009', email: 'dr.test@example.com' },
  conditions: [{ name: 'Asthma', date: '2020-01-01', med: 'Albuterol' }, { name: '', date: '', med: '' }, { name: "x'); DROP TABLE users;--", date: '', med: '' }],
  allergies: [{ name: 'Dust', med: 'Antihistamine' }],
  surgeries: [{ name: 'Appendectomy', loc: 'Abdomen', date: '2018-06-06' }],
  ...extra
});

test.before(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', multipleStatements: true
  });
  await conn.query('CREATE DATABASE IF NOT EXISTS medivault_test CHARACTER SET utf8mb4');
  await conn.query('USE medivault_test');
  await conn.query(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
  await conn.query(fs.readFileSync(path.join(__dirname, '../db/seed.sql'), 'utf8'));
  await conn.end();

  db = require('../config/db');
  MySQLStore = require('../config/sessionStore');
  server = require('../server').listen(0);
  base = `http://localhost:${server.address().port}`;
});

test.after(async () => {
  server.close();
  await db.end();
});

// ---------- Pages and health ----------
test('health check reports the database is reachable', async () => {
  const r = await client()('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
});

test('protected pages redirect to login, public pages do not', async () => {
  const call = client();
  for (const page of ['/form.html', '/user.dashboard.html', '/settings.html']) {
    const r = await call('GET', page);
    assert.equal(r.status, 302, page);
    assert.match(r.location, /home\.html/);
  }
  assert.equal((await call('GET', '/home.html')).status, 200);
  assert.equal((await call('GET', '/api/patient')).status, 401);
});

// ---------- Sign up and log in ----------
test('sign up checks email, password strength and confirmation', async () => {
  const call = client();
  const email = newEmail('su');
  assert.equal((await call('POST', '/api/auth/signup', { email, password: 'short', confirmPassword: 'short' })).status, 400);
  assert.equal((await call('POST', '/api/auth/signup', { email, password: 'Passw0rdOK', confirmPassword: 'Different1' })).status, 400);
  assert.equal((await call('POST', '/api/auth/signup', { email: 'bad', password: 'Passw0rdOK', confirmPassword: 'Passw0rdOK' })).status, 400);
  const ok = await call('POST', '/api/auth/signup', { email, password: 'Passw0rdOK', confirmPassword: 'Passw0rdOK' });
  assert.equal(ok.status, 201);
  assert.equal(ok.data.hasProfile, false);
  assert.equal((await call('POST', '/api/auth/signup', { email, password: 'Passw0rdOK', confirmPassword: 'Passw0rdOK' }, { noCookie: true })).status, 409, 'duplicate email');
  assert.equal((await call('GET', '/form.html')).status, 200, 'form page opens once logged in');
});

test('passwords are stored as bcrypt hashes, never as text', async () => {
  const call = client();
  const email = newEmail('hash');
  await call('POST', '/api/auth/signup', { email, password: 'Passw0rdOK', confirmPassword: 'Passw0rdOK' });
  const [[row]] = await db.query('SELECT password_hash FROM users WHERE email = ?', [email]);
  assert.match(row.password_hash, /^\$2[aby]\$10\$/);
  assert.ok(!row.password_hash.includes('Passw0rdOK'));
});

test('login errors do not reveal whether the email exists', async () => {
  const a = await client()('POST', '/api/auth/login', { email: 'nobody@example.com', password: 'Whatever1' });
  const b = await client()('POST', '/api/auth/login', { email: 'demo@medivault.test', password: 'Wrong1234' });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.equal(a.data.error, b.data.error);
});

// ---------- The medical record ----------
test('saving a record stores everything in one go and reads back correctly', async () => {
  const call = client();
  await call('POST', '/api/auth/signup', { email: newEmail('rec'), password: 'Passw0rdOK', confirmPassword: 'Passw0rdOK' });
  const form = validForm({ patientPNum: '0917' + String(1000000 + Math.floor(Math.random() * 8999999)) });
  const saved = await call('POST', '/api/patient', form);
  assert.equal(saved.status, 201);

  const { data } = await call('GET', '/api/patient');
  const p = data.profile;
  assert.equal(p.patient.patientName, 'Test Person');
  assert.equal(p.patient.patientHeight, 165.5);
  assert.equal(p.patient.patientWeight, 58.25);
  assert.equal(typeof p.patient.patientAge, 'number', 'age comes from the v_patient view');
  assert.equal(p.doctor.doctorPEmail, 'dr.test@example.com');
  assert.equal(p.conditions.length, 2, 'the empty row is skipped');
  assert.ok(p.conditions.some((c) => c.conditionName.startsWith("x');")), 'SQL looking text is stored as plain text');
  assert.equal(p.allergies.length, 1);
  assert.equal(p.surgeries[0].surgeryDate, '2018-06-06');

  // Editing replaces the lists instead of adding to them
  const edit = await call('POST', '/api/patient', { ...form, conditions: [{ name: 'Migraine', date: '2021-02-02', med: '' }], patientWeight: '60' });
  assert.equal(edit.status, 200);
  const again = (await call('GET', '/api/patient')).data.profile;
  assert.equal(again.conditions.length, 1);
  assert.equal(again.conditions[0].conditionName, 'Migraine');
  assert.equal(again.patient.patientWeight, 60);
});

test('the form is validated on the server too', async () => {
  const call = client();
  await call('POST', '/api/auth/signup', { email: newEmail('val'), password: 'Passw0rdOK', confirmPassword: 'Passw0rdOK' });
  const cases = [
    ['height too large', { patientHeight: '9999' }], ['future birthday', { patientBday: '2999-01-01' }],
    ['impossible date', { patientBday: '2023-02-31' }], ['bad sex', { patientSex: 'X' }],
    ['bad blood type', { patientBType: 'Z+' }], ['bad doctor email', { doctor: { name: 'D', phone: '', email: 'nope' } }],
    ['too many rows', { allergies: Array.from({ length: 40 }, () => ({ name: 'a' })) }], ['bad phone', { patientPNum: 'abc' }],
    ['missing name', { patientName: '   ' }]
  ];
  for (const [name, patch] of cases) {
    const r = await call('POST', '/api/patient', validForm(patch));
    assert.equal(r.status, 400, name);
  }
});

test('two accounts cannot use the same phone number', async () => {
  const phone = '09175559999';
  const a = client(); const b = client();
  await a('POST', '/api/auth/signup', { email: newEmail('pa'), password: 'Passw0rdOK', confirmPassword: 'Passw0rdOK' });
  await b('POST', '/api/auth/signup', { email: newEmail('pb'), password: 'Passw0rdOK', confirmPassword: 'Passw0rdOK' });
  assert.equal((await a('POST', '/api/patient', validForm({ patientPNum: phone }))).status, 201);
  const clash = await b('POST', '/api/patient', validForm({ patientPNum: phone }));
  assert.equal(clash.status, 409);
});

test('a failed save leaves nothing behind (transaction rolls back)', async () => {
  const phone = '09175558888';
  const a = client(); const b = client();
  await a('POST', '/api/auth/signup', { email: newEmail('ta'), password: 'Passw0rdOK', confirmPassword: 'Passw0rdOK' });
  await b('POST', '/api/auth/signup', { email: newEmail('tb'), password: 'Passw0rdOK', confirmPassword: 'Passw0rdOK' });
  await a('POST', '/api/patient', validForm({ patientPNum: phone }));
  const [[before]] = await db.query('SELECT COUNT(*) AS n FROM medical_condition');
  await b('POST', '/api/patient', validForm({ patientPNum: phone, doctor: { name: 'Dr. Ghost', phone: '', email: 'ghost.doc@example.com' } }));
  const [[after]] = await db.query('SELECT COUNT(*) AS n FROM medical_condition');
  assert.equal(after.n, before.n, 'no conditions were saved by the failed request');
  const [[ghost]] = await db.query("SELECT COUNT(*) AS n FROM doctor WHERE doctorPEmail = 'ghost.doc@example.com'");
  assert.equal(ghost.n, 0, 'the doctor row was rolled back too');
});

// ---------- Settings ----------
test('settings: personal info, account info, password change, logout and login', async () => {
  const call = client();
  const email = newEmail('set');
  await call('POST', '/api/auth/signup', { email, password: 'Passw0rdOK', confirmPassword: 'Passw0rdOK' });
  await call('POST', '/api/patient', validForm({ patientPNum: '09175557777' }));

  assert.equal((await call('PUT', '/api/patient/personal', { patientName: 'Renamed Person', patientBday: '1999-03-15', patientSex: 'F', patientRel: 'Buddhist', patientMarStat: 'married' })).status, 200);
  assert.equal((await call('PUT', '/api/account', { email, phone: '09175556666', currentPassword: 'WRONG' })).status, 403, 'needs the current password');

  const email2 = 'new' + email;
  assert.equal((await call('PUT', '/api/account', { email: email2, phone: '09175556666', currentPassword: 'Passw0rdOK', newPassword: 'N3wPassword' })).status, 200);
  assert.equal((await call('PUT', '/api/account', { email: 'pt02@example.com', phone: '09175556666', currentPassword: 'N3wPassword' })).status, 409, 'email already taken');

  await call('POST', '/api/auth/logout');
  assert.equal((await call('GET', '/api/patient')).status, 401, 'logged out');
  assert.equal((await call('POST', '/api/auth/login', { email: email2, password: 'Passw0rdOK' })).status, 401, 'old password no longer works');
  const login = await call('POST', '/api/auth/login', { email: email2, password: 'N3wPassword' });
  assert.equal(login.status, 200);
  assert.equal(login.data.hasProfile, true);
  const p = (await call('GET', '/api/patient')).data.profile.patient;
  assert.equal(p.patientName, 'Renamed Person');
  assert.equal(p.patientMarStat, 'married');
  assert.equal(p.patientPNum, '09175556666');
});

test('deleting an account needs the password and removes the whole record', async () => {
  const call = client();
  const email = newEmail('del');
  await call('POST', '/api/auth/signup', { email, password: 'Passw0rdOK', confirmPassword: 'Passw0rdOK' });
  await call('POST', '/api/patient', validForm({ patientPNum: '09175554444' }));
  const [[u]] = await db.query('SELECT user_ID FROM users WHERE email = ?', [email]);

  assert.equal((await call('DELETE', '/api/account', { password: 'nope' })).status, 403);
  assert.equal((await call('DELETE', '/api/account', { password: 'Passw0rdOK' })).status, 200);
  assert.equal((await call('GET', '/api/patient')).status, 401, 'session ended');

  const [[counts]] = await db.query(
    `SELECT (SELECT COUNT(*) FROM users WHERE user_ID = ?) AS users,
            (SELECT COUNT(*) FROM patient WHERE fk_user_ID = ?) AS patients`, [u.user_ID, u.user_ID]);
  assert.equal(counts.users, 0);
  assert.equal(counts.patients, 0, 'ON DELETE CASCADE removed the patient and the lists under it');
});

test('the seeded demo account works', async () => {
  const call = client();
  const r = await call('POST', '/api/auth/login', { email: 'demo@medivault.test', password: 'Demo@1234' });
  assert.equal(r.status, 200);
  assert.equal(r.data.hasProfile, true);
  const p = (await call('GET', '/api/patient')).data.profile;
  assert.equal(p.conditions.length, 1);
  assert.equal(p.allergies.length, 2);
  assert.equal(p.surgeries.length, 2);
});

test('unknown API routes and bad JSON give clean errors', async () => {
  const unknown = (await client()('GET', '/api/nope')).status;
  assert.ok([401, 404].includes(unknown), `expected 401 or 404, got ${unknown}`);
  const res = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json' });
  assert.equal(res.status, 400);
});

// ---------- Sessions ----------
test('sessions live in MySQL: they survive a new store, expire, and can be destroyed', async () => {
  const store = new MySQLStore(db, { cleanupMs: 3600000 });
  const sid = 'test-session-' + Date.now();
  const sess = { userId: 42, cookie: { expires: new Date(Date.now() + 60000).toISOString() } };
  const call = (fn, ...args) => new Promise((resolve, reject) => fn.call(store, ...args, (err, v) => (err ? reject(err) : resolve(v))));

  await call(store.set, sid, sess);
  const fromNewStore = await call(new MySQLStore(db).get, sid); // a different instance, like after a restart
  assert.equal(fromNewStore.userId, 42);

  await call(store.set, sid, { userId: 42, cookie: { expires: new Date(Date.now() - 1000).toISOString() } });
  assert.equal(await call(store.get, sid), null, 'an expired session is not returned');
  await store.clearExpired();
  const [[gone]] = await db.query('SELECT COUNT(*) AS n FROM sessions WHERE sid = ?', [sid]);
  assert.equal(gone.n, 0, 'expired rows are cleaned up');

  await call(store.set, sid, sess);
  await call(store.destroy, sid);
  assert.equal(await call(store.get, sid), null);
  store.close();
});

// ---------- Rate limiter ----------
test('only failed attempts count toward the rate limit', () => {
  const { rateLimit } = require('../middleware/auth');
  const mw = rateLimit(2, 60000);
  const makeRes = (statusCode) => {
    const handlers = [];
    return { statusCode, status(c) { this.code = c; return this; }, json() { return this; }, on(e, fn) { handlers.push(fn); }, finish() { handlers.forEach((f) => f()); } };
  };
  const req = { ip: '9.9.9.9' };
  let passed = 0;
  for (let i = 0; i < 5; i++) { const r = makeRes(200); mw(req, r, () => passed++); r.finish(); }
  assert.equal(passed, 5, 'successful attempts are never blocked');
  for (let i = 0; i < 2; i++) { const r = makeRes(401); mw(req, r, () => passed++); r.finish(); }
  const blocked = makeRes(200);
  mw(req, blocked, () => passed++);
  assert.equal(blocked.code, 429, 'the third request after 2 failures is blocked');
});

// ---------- Practice queries ----------
test('every query in db/queries.sql runs and returns rows from the sample data', async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: 'medivault_test', multipleStatements: true
  });
  const [results] = await conn.query(fs.readFileSync(path.join(__dirname, '../db/queries.sql'), 'utf8'));
  await conn.end();
  const sets = results.filter(Array.isArray);
  assert.equal(sets.length, 12);
  sets.forEach((rows, i) => assert.ok(rows.length > 0, `query ${i + 1} returned no rows`));
});
