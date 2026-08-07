export const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://backend-production-054ce.up.railway.app/api';

export const TOKEN_KEY = 'golden_key_access_token';
export const USER_KEY = 'golden_key_current_user';

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);

  const headers = {
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  if (!response.ok) {
    const error = new Error(
      data.error || data.message || 'Сервер сўровни бажара олмади'
    );

    error.status = response.status;
    error.details = data.details || null;

    throw error;
  }

  return data;
}