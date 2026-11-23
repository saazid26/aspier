import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';

export type Me = {
  _id: string;
  id?: string;
  name: string;
  fullName?: string;
  email: string;
  role: 'student' | 'instructor' | 'supervisor' | 'youngScholar' | 'admin' | 'superadmin';
  avatar?: string;
  avatarUrl?: string;
  phone?: string;
  university?: string;
  institution?: string;
  department?: string;
  academicLevel?: string;
  session?: string;
  studentId?: string;
  rollNumber?: string;
  city?: string;
  bio?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
} | null;

export function useMe() {
  const [me, setMe] = useState<Me>(undefined as unknown as Me);

  const fetchMe = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setMe(res.data.data);
      return res.data.data;
    } catch {
      setMe(null);
      return null;
    }
  }, []);

  useEffect(() => {
    void fetchMe();
    const handleProfileUpdated = (event?: any) => {
      if (event?.detail) {
        setMe(event.detail);
      } else {
        void fetchMe();
      }
    };
    window.addEventListener('aspier-user-updated', handleProfileUpdated);
    return () => window.removeEventListener('aspier-user-updated', handleProfileUpdated);
  }, [fetchMe]);

  const updateMe = (data: Partial<Me> | Me) => {
    setMe((prev) => {
      const updated = { ...(prev || {}), ...data } as Me;
      window.dispatchEvent(new CustomEvent('aspier-user-updated', { detail: updated }));
      return updated;
    });
  };

  return { me, loading: me === undefined, setMe, fetchMe, updateMe };
}
