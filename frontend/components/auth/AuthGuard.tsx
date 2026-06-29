'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { startSessionWatcher } from '@/lib/api';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    // Start watching for tab visibility changes and window focus.
    // If the backend session has expired (backend restarted, token expired),
    // the next API call will get a 401, trigger a refresh attempt, and if that
    // also fails, forceLogout() in api.ts clears the store and redirects.
    startSessionWatcher();
  }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated) return null;
  if (!isAuthenticated) return null;
  return <>{children}</>;
}