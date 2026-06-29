'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Users, UsersRound, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ users: 0, teams: 0, posts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [u, t, p] = await Promise.all([
          api.get('/admin/users', { params: { page: 0, size: 1 } }) as any,
          api.get('/admin/teams', { params: { page: 0, size: 1 } }) as any,
          api.get('/admin/posts', { params: { page: 0, size: 1 } }) as any,
        ]);
        setStats({
          users: u?.totalElements ?? 0,
          teams: t?.totalElements ?? 0,
          posts: p?.totalElements ?? 0,
        });
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats.users, icon: <Users className="h-6 w-6 text-primary" />, bg: 'bg-primary/10', href: '/admin/users' },
    { label: 'Total Teams', value: stats.teams, icon: <UsersRound className="h-6 w-6 text-blue-600" />, bg: 'bg-blue-100', href: '/admin/teams' },
    { label: 'Total Posts', value: stats.posts, icon: <FileText className="h-6 w-6 text-green-600" />, bg: 'bg-green-100', href: '/admin/posts' },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <Link href={s.href} className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${s.bg}`}>{s.icon}</div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Button asChild variant="outline"><Link href="/admin/users">View Users</Link></Button>
        <Button asChild variant="outline"><Link href="/admin/teams">View Teams</Link></Button>
        <Button asChild variant="outline"><Link href="/admin/posts">View Posts</Link></Button>
      </div>
    </div>
  );
}
