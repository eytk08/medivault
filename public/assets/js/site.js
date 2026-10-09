// Shared helpers used by every page.

// Small wrapper around fetch for the JSON API.
// Returns { ok, status, data } and never throws on HTTP errors.
async function api(path, method = 'GET', body) {
  const options = { method, headers: {}, credentials: 'same-origin' };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  try {
    const res = await fetch(path, options);
    let data = {};
    try { data = await res.json(); } catch (e) { /* empty body */ }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: 'Cannot reach the server. Is it running?' } };
  }
}

// Bootstrap alert helpers. An alert is a hidden div with the classes "alert alert-danger d-none".
function showAlert(el, message, type = 'danger') {
  el.className = `alert alert-${type}`;
  el.textContent = message;
}
function hideAlert(el) {
  el.className = 'alert d-none';
  el.textContent = '';
}

// Back to top button (home and form pages)
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('back2Top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.style.display = window.scrollY > 300 ? 'block' : 'none';
  });
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// Log out link used on the dashboard and settings sidebars
document.addEventListener('DOMContentLoaded', () => {
  const link = document.getElementById('logoutLink');
  if (!link) return;
  link.addEventListener('click', async (e) => {
    e.preventDefault();
    await api('/api/auth/logout', 'POST');
    window.location.href = 'home.html';
  });
});
