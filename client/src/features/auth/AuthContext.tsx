import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, setAuthToken, clearAuthToken, setCsrfToken, getAuthToken } from '../../lib/api';
import type { Me } from './useMe';

export interface AuthContextType {
  user: Me;
  loading: boolean;
  setUser: (user: Me | ((prev: Me) => Me)) => void;
  fetchUser: () => Promise<Me>;
  login: (userData: any, token?: string, csrfToken?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<Me>(() => {
    try {
      const cached = localStorage.getItem('aspier_cached_user');
      return cached ? JSON.parse(cached) : undefined;
    } catch {
      return undefined;
    }
  });
  const [loading, setLoading] = useState<boolean>(() => !user && Boolean(getAuthToken()));

  const setUser = useCallback((newUser: Me | ((prev: Me) => Me)) => {
    setUserState((prev) => {
      const resolved = typeof newUser === 'function' ? newUser(prev) : newUser;
      try {
        if (resolved) {
          localStorage.setItem('aspier_cached_user', JSON.stringify(resolved));
        } else {
          localStorage.removeItem('aspier_cached_user');
        }
      } catch {}
      window.dispatchEvent(new CustomEvent('aspier-user-updated', { detail: resolved }));
      return resolved;
    });
  }, []);

  const fetchUser = useCallback(async (): Promise<Me> => {
    try {
      const res = await api.get('/auth/me');
      const userData = res.data?.data || res.data;
      setUserState(userData);
      try {
        localStorage.setItem('aspier_cached_user', JSON.stringify(userData));
      } catch {}
      return userData;
    } catch {
      setUserState(null);
      try {
        localStorage.removeItem('aspier_cached_user');
      } catch {}
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUser();

    const handleProfileUpdated = (event?: any) => {
      if (event?.detail) {
        setUserState(event.detail);
      } else {
        void fetchUser();
      }
    };
    window.addEventListener('aspier-user-updated', handleProfileUpdated);
    return () => window.removeEventListener('aspier-user-updated', handleProfileUpdated);
  }, [fetchUser]);

  const login = useCallback((userData: any, token?: string, csrfToken?: string) => {
    if (token) setAuthToken(token);
    if (csrfToken) setCsrfToken(csrfToken);
    const resolvedUser = userData?.user || userData?.data?.user || userData?.data || userData;
    setUser(resolvedUser);
    setLoading(false);
  }, [setUser]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      clearAuthToken();
      setUser(null);
    }
  }, [setUser]);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, fetchUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
