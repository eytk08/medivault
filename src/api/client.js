export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

/** All requests use the server's HTTP-only session cookie. Never put session tokens in JS storage. */
export async function apiRequest(path, { method = 'GET', body, signal, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'include',
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError('Could not reach MediVault. Check your connection and try again.');
  }

  let payload = null;
  try { payload = await response.json(); } catch { /* Some success responses may be empty. */ }
  if (!response.ok) {
    throw new ApiError(payload?.error || `Request failed (${response.status}).`, response.status, payload);
  }
  return payload;
}

export const authApi = {
  me: (options) => apiRequest('/api/auth/me', options),
  login: (body) => apiRequest('/api/auth/login', { method: 'POST', body }),
  register: (body) => apiRequest('/api/auth/signup', { method: 'POST', body }),
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' })
};

export const shareApi = {
  create: (body = { expiresInHours: 24 }) => apiRequest('/api/shares', { method: 'POST', body }),
  list: (options) => apiRequest('/api/shares', options),
  revoke: (id) => apiRequest(`/api/shares/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  publicRecord: (token, options) => apiRequest(`/api/shares/public/${encodeURIComponent(token)}`, options)
};

export const patientApi = {
  get: (options) => apiRequest('/api/patient', options),
  save: (body) => apiRequest('/api/patient', { method: 'POST', body }),
  updatePersonal: (body) => apiRequest('/api/patient/personal', { method: 'PUT', body }),
  updateAccount: (body) => apiRequest('/api/account', { method: 'PUT', body }),
  deleteAccount: (body) => apiRequest('/api/account', { method: 'DELETE', body })
};
