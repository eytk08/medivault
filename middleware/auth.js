// Blocks API calls from people who are not logged in.
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Please log in first.' });
  }
  next();
}

// Redirects page requests (form, dashboard, settings) to the login section.
function requireLoginPage(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/home.html#Login');
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
      return res.status(429).json({ error: 'Too many failed attempts. Please try again in a few minutes.' });
    }
    res.on('finish', () => {
      if (res.statusCode >= 400) failures.get(key).push(Date.now());
    });
    next();
  };
}

module.exports = { requireLogin, requireLoginPage, rateLimit };
