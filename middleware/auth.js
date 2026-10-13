// Blocks API calls from people who are not logged in.
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Please log in first.' });
  }
  next();
}

// Very small in-memory limiter for login and signup. Good enough for a demo.
// Only failed attempts (HTTP 400 or higher) are counted, so normal use is never blocked.
const failures = new Map();
function rateLimit(max = 10, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const recent = (failures.get(key) || []).filter((t) => now - t < windowMs);
    failures.set(key, recent);
    if (recent.length >= max) {
      // Tell the browser exactly how long to wait, so the UI can show a countdown.
      const retryAfter = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too many failed attempts. Please try again later.', code: 'RATE_LIMIT', retryAfter });
    }
    res.on('finish', () => {
      if (res.statusCode >= 400) failures.get(key).push(Date.now());
    });
    next();
  };
}

module.exports = { requireLogin, rateLimit };
