import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || '/api/v1';

const TOKEN_KEY = 'aspier_token';
const CSRF_KEY = 'aspier_csrf';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string, persistInSession = false): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      if (persistInSession) {
        sessionStorage.setItem(TOKEN_KEY, token);
      }
    }
  } catch {}
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CSRF_KEY);
    sessionStorage.removeItem(CSRF_KEY);
  } catch {}
}

export function getCsrfToken(): string | null {
  try {
    const fromCookie = document.cookie.split('; ').find((row) => row.startsWith('csrfToken='))?.split('=')[1];
    return fromCookie || localStorage.getItem(CSRF_KEY) || sessionStorage.getItem(CSRF_KEY) || null;
  } catch {
    return null;
  }
}

export function setCsrfToken(csrf: string): void {
  try {
    if (csrf) {
      localStorage.setItem(CSRF_KEY, csrf);
    }
  } catch {}
}

export const api = axios.create({ baseURL: apiBaseUrl, withCredentials: true, timeout: 30000 });
export const apiClient = api;

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    const status = error.response?.status;
    const msg = error.response?.data?.message;
    if (msg && typeof msg === 'string') return msg;
    if (error.code === 'ECONNABORTED') return 'ASPIER did not respond in time. Check your connection and try again.';
    if (!error.response) return 'ASPIER is temporarily unreachable. The server may be restarting; wait briefly and try again.';
    if (status === 500 || status === 502 || status === 503 || status === 504) {
      return 'ASPIER server is initializing. Please try again in a few moments.';
    }
    if (status === 401) return 'Invalid email or password.';
    if (status === 403) return 'Access denied.';
  }
  const rawMessage = error instanceof Error && error.message ? error.message : fallback;
  if (rawMessage.includes('500') || rawMessage.includes('status code 500')) {
    return 'ASPIER server is initializing. Please try again in a few moments.';
  }
  return rawMessage;
}

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const csrf = getCsrfToken();
  if (csrf && config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
    config.headers['X-CSRF-Token'] = csrf;
  }
  return config;
});

let refreshing: Promise<unknown> | null = null;
let refreshingCsrf: Promise<unknown> | null = null;

api.interceptors.response.use(
  (response) => {
    const body = response.data;
    const token = body?.token || body?.data?.token;
    const csrf = body?.csrfToken || body?.data?.csrfToken;
    if (token && typeof token === 'string') setAuthToken(token);
    if (csrf && typeof csrf === 'string') setCsrfToken(csrf);
    return response;
  },
  async (error) => {
    const original = error.config;
    if (!original) return Promise.reject(error);

    if (
      error.response?.status === 403 &&
      !original._retryCsrf &&
      typeof error.response?.data?.message === 'string' &&
      error.response.data.message.toLowerCase().includes('csrf')
    ) {
      original._retryCsrf = true;
      refreshingCsrf ||= api.get('/auth/csrf-token').finally(() => { refreshingCsrf = null; });
      try {
        const res: any = await refreshingCsrf;
        const newCsrf = res?.data?.data?.csrfToken || getCsrfToken();
        if (newCsrf && original.headers) {
          original.headers['X-CSRF-Token'] = newCsrf;
        }
        return api(original);
      } catch {
        // ignore and continue to rejection
      }
    }

    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/login') && !original.url?.includes('/auth/refresh')) {
      original._retry = true;
      refreshing ||= api.post('/auth/refresh');
      try {
        const res: any = await refreshing;
        refreshing = null;
        const newToken = res?.data?.token || res?.data?.data?.token;
        if (newToken) {
          setAuthToken(newToken);
          if (original.headers) {
            original.headers['Authorization'] = `Bearer ${newToken}`;
          }
        }
        return api(original);
      } catch {
        refreshing = null;
        clearAuthToken();
      }
    }
    return Promise.reject(error);
  }
);
