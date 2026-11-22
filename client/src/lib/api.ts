import axios from 'axios';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || '/api/v1';
export const api = axios.create({ baseURL: apiBaseUrl, withCredentials: true, timeout: 30000 });
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
  const csrf = document.cookie.split('; ').find((row) => row.startsWith('csrfToken='))?.split('=')[1];
  if (csrf && config.method && ['post','put','patch','delete'].includes(config.method)) config.headers['X-CSRF-Token'] = csrf;
  return config;
});
let refreshing: Promise<unknown> | null = null;
let refreshingCsrf: Promise<unknown> | null = null;
api.interceptors.response.use((response) => response, async (error) => {
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
      await refreshingCsrf;
      const newCsrf = document.cookie.split('; ').find((row) => row.startsWith('csrfToken='))?.split('=')[1];
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
    try { await refreshing; refreshing = null; return api(original); } catch { refreshing = null; }
  }
  return Promise.reject(error);
});
