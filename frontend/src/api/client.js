const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const request = async (path, options = {}, token) => {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  const data = contentType && contentType.includes('application/json')
    ? await response.json()
    : null;

  if (!response.ok) {
    const message = data?.message || 'Algo deu errado.';
    throw new Error(message);
  }

  return data;
};

export const registerUser = (payload) => (
  request('/api/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
);

export const loginUser = (payload) => (
  request('/api/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
);

export const fetchProfile = (token) => (
  request('/api/me', { method: 'GET' }, token)
);

export const deleteAccount = (payload, token) => (
  request('/api/me', {
    method: 'DELETE',
    body: JSON.stringify(payload),
  }, token)
);

export const evaluatePassword = (payload) => (
  request('/api/password-strength', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
);

export const requestPasswordReset = (payload) => (
  request('/api/password-reset/request', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
);

export const confirmPasswordReset = (payload) => (
  request('/api/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
);

export default {
  registerUser,
  loginUser,
  fetchProfile,
  deleteAccount,
  evaluatePassword,
  requestPasswordReset,
  confirmPasswordReset,
};
