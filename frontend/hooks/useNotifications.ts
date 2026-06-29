'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { Notification } from '@/types';
import { useAuthStore } from '@/store/authStore';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { isAuthenticated } = useAuthStore();

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.get<Notification[]>('/notifications');
      const list = Array.isArray(data) ? data : (data as any)?.value ?? (data as any)?.content ?? [];
      setNotifications(list);
    } catch {
      // silent fail for background poll
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // ignore
    }
  };

  return { notifications, unreadCount, fetchNotifications, markRead };
}
