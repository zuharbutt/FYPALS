'use client';

import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Trash2, Search, Eye } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import type { Page } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  FORMING:   'bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-300',
  ACTIVE:    'bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300',
  LOCKED:    'bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-300',
  DISSOLVED: 'bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-300',
};

interface AdminTeam {
  id: number;
  teamName: string;
  leaderName: string;
  leaderId: number;
  advisorName?: string | null;
  status: string;
  memberCount: number;
  createdAt: string;
}

function formatDate(raw: string | null | undefined): string {
  if (!raw) return '—';
  try {
    return new Date(raw).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return raw; }
}

export default function AdminTeamsPage() {
  const [data, setData]       = useState<Page<AdminTeam> | null>(null);
  const [page, setPage]       = useState(0);
  const [loading, setLoading] = useState(true);

  // Search + filter (client-side on fetched page)
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const load = async (p = page) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/teams', {
        params: { page: p, size: 15 },
      }) as unknown as Page<AdminTeam>;
      setData(res);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  const deleteTeam = async (id: number, teamName: string) => {
    if (!confirm(`Delete team "${teamName}"? This will also delete all associated data. This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/teams/${id}`);
      toast.success('Team deleted');
      load(page);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to delete team');
    }
  };

  // Client-side filter on the fetched page
  const allTeams = data?.content ?? [];
  const teams = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTeams.filter((t) => {
      const matchesSearch = !q ||
          t.teamName?.toLowerCase().includes(q) ||
          t.leaderName?.toLowerCase().includes(q) ||
          t.advisorName?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allTeams, search, statusFilter]);

  const totalPages = data?.totalPages ?? 1;

  return (
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Teams</h1>
            <span className="text-sm text-muted-foreground">{data?.totalElements ?? 0} total</span>
          </div>
        </div>

        {/* Search + filter bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
                placeholder="Search by name, leader or advisor…"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="FORMING">Forming</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Team Name</th>
              <th className="text-left p-3 font-medium">Leader</th>
              <th className="text-left p-3 font-medium">Advisor</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Members</th>
              <th className="text-left p-3 font-medium">Created</th>
              <th className="p-3 font-medium w-16">Actions</th>
            </tr>
            </thead>
            <tbody>
            {loading ? (
                [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-t">
                      {[...Array(7)].map((_, j) => (
                          <td key={j} className="p-3"><Skeleton className="h-4 w-24" /></td>
                      ))}
                    </tr>
                ))
            ) : teams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">No teams found.</td>
                </tr>
            ) : (
                teams.map((t) => (
                    <tr key={t.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{t.teamName}</td>
                      <td className="p-3 text-muted-foreground">{t.leaderName}</td>
                      <td className="p-3 text-muted-foreground">
                        {t.advisorName ?? <span className="text-muted-foreground/50 italic text-xs">None</span>}
                      </td>
                      <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {t.status}
                    </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{t.memberCount}</td>
                      <td className="p-3 text-muted-foreground">{formatDate(t.createdAt)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" asChild title="View team">
                            <Link href={`/admin/teams/${t.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                          </Button>
                          <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              title="Delete team"
                              onClick={() => deleteTeam(t.id, t.teamName)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                ))
            )}
            </tbody>
          </table>
        </div>

        {/* Pagination — unchanged */}
        {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
                Next
              </Button>
            </div>
        )}
      </div>
  );
}