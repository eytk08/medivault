// Sign up and log in on the landing page.
document.addEventListener('DOMContentLoaded', () => {
  const signUpForm = document.getElementById('signUpForm');
  const signUpAlert = document.getElementById('signUpAlert');
  const loginForm = document.getElementById('loginForm');
  const loginAlert = document.getElementById('loginAlert');

  signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(signUpAlert);
    const button = signUpForm.querySelector('button[type="submit"]');
    button.disabled = true;

    const { ok, data } = await api('/api/auth/signup', 'POST', {
      email: document.getElementById('signUpEmail').value,
      password: document.getElementById('signUpPassword').value,
      confirmPassword: document.getElementById('confirmPassword').value
    });

    if (ok) {
      window.location.href = 'form.html';
    } else {
      showAlert(signUpAlert, data.error || 'Sign up failed.');
      button.disabled = false;
    }
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(loginAlert);
    const button = loginForm.querySelector('button[type="submit"]');
    button.disabled = true;

    const { ok, data } = await api('/api/auth/login', 'POST', {
      email: document.getElementById('loginEmail').value,
      password: document.getElementById('loginPassword').value
    });

    if (ok) {
      // First time users fill out the form, returning users go to the dashboard.
      window.location.href = data.hasProfile ? 'user.dashboard.html' : 'form.html';
    } else {
      showAlert(loginAlert, data.error || 'Login failed.');
      button.disabled = false;
    }
  });
});
