import axios from 'axios';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || '/api/v1';
export const api = axios.create({ baseURL: apiBaseUrl, withCredentials: true, timeout: 30000 });
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    const message = error.response?.data?.message;
    if (message) return message;
    if (error.code === 'ECONNABORTED') return 'ASPIER did not respond in time. Check your connection and try again.';
    if (!error.response) return 'ASPIER is temporarily unreachable. The server may be restarting; wait briefly and try again.';
    if (error.response?.status === 500) return 'ASPIER server is synchronizing. Please try again in a few moments.';
  }
  return error instanceof Error && error.message ? error.message : fallback;
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
