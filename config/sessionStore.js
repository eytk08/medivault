// Session store that keeps sessions in MySQL, so logins survive a restart and the app can
// run behind a host that restarts it. (express-session's default MemoryStore is not meant
// for real hosting: it forgets everyone on restart and slowly leaks memory.)
const session = require('express-session');

class MySQLStore extends session.Store {
  constructor(db, { ttlMs = 2 * 60 * 60 * 1000, cleanupMs = 15 * 60 * 1000 } = {}) {
    super();
    this.db = db;
    this.ttlMs = ttlMs;
    // Delete expired sessions now and then so the table stays small
    this.timer = setInterval(() => this.clearExpired().catch(() => {}), cleanupMs);
    this.timer.unref();
  }

  // Expiry is stored as a number of milliseconds, so no time zone can shift it.
  expiryOf(sess) {
    const fromCookie = sess && sess.cookie && sess.cookie.expires ? new Date(sess.cookie.expires).getTime() : null;
    return fromCookie || Date.now() + this.ttlMs;
  }

  get(sid, cb) {
    this.db.execute('SELECT data FROM sessions WHERE sid = ? AND expires > ?', [sid, Date.now()])
      .then(([rows]) => cb(null, rows.length ? JSON.parse(rows[0].data) : null))
      .catch(cb);
  }

  set(sid, sess, cb = () => {}) {
    this.db.execute(
      `INSERT INTO sessions (sid, data, expires) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE data = VALUES(data), expires = VALUES(expires)`,
      [sid, JSON.stringify(sess), this.expiryOf(sess)])
      .then(() => cb(null)).catch(cb);
  }

  touch(sid, sess, cb = () => {}) {
    this.db.execute('UPDATE sessions SET expires = ? WHERE sid = ?', [this.expiryOf(sess), sid])
      .then(() => cb(null)).catch(cb);
  }

  destroy(sid, cb = () => {}) {
    this.db.execute('DELETE FROM sessions WHERE sid = ?', [sid]).then(() => cb(null)).catch(cb);
  }

  async clearExpired() {
    await this.db.execute('DELETE FROM sessions WHERE expires <= ?', [Date.now()]);
  }

  close() { clearInterval(this.timer); }
}

module.exports = MySQLStore;
