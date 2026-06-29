'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const { isAuthenticated } = useAuthStore();

  const fetchCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.get('/notifications') as any;
      const list = Array.isArray(data) ? data : [];
      setUnreadCount(list.filter((n: any) => !n.read).length);
    } catch {
      // Silently ignore errors — don't reset count on failure
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return { unreadCount, refetch: fetchCount };
}