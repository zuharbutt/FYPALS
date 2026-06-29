'use client';

import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Trash2, Eye, Search } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import type { Post, Page } from '@/types';

const CATEGORIES = ['ALL', 'LOOKING_FOR_MEMBER', 'PROJECT_IDEA', 'GENERAL'];

const CATEGORY_LABELS: Record<string, string> = {
  LOOKING_FOR_MEMBER: 'Looking for Member',
  PROJECT_IDEA:       'Project',
  GENERAL:            'General',
};

const CATEGORY_COLORS: Record<string, string> = {
  LOOKING_FOR_MEMBER: 'bg-blue-100   text-blue-700   dark:bg-blue-900/40  dark:text-blue-300',
  PROJECT_IDEA:       'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  GENERAL:            'bg-gray-100   text-gray-600   dark:bg-gray-800     dark:text-gray-300',
};

// Inline engagement bar — separate upvotes (purple), downvotes (red), comments (amber)
function EngagementBar({ up, down, comments }: { up: number; down: number; comments: number }) {
  if (up === 0 && down === 0 && comments === 0) {
    return <span className="text-xs text-muted-foreground/50">—</span>;
  }
  const total = up + down + comments || 1;
  return (
      <div className="flex items-center gap-1.5 min-w-[110px]">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden flex">
          {up       > 0 && <div className="h-full bg-primary"   style={{ width: `${(up/total)*100}%` }} />}
          {down     > 0 && <div className="h-full bg-red-500"   style={{ width: `${(down/total)*100}%` }} />}
          {comments > 0 && <div className="h-full bg-amber-400" style={{ width: `${(comments/total)*100}%` }} />}
        </div>
        <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
        {up}↑ {down}↓ {comments}💬
      </span>
      </div>
  );
}

export default function AdminPostsPage() {
  const [data, setData]     = useState<Page<Post> | null>(null);
  const [page, setPage]     = useState(0);
  const [category, setCategory] = useState('ALL');
  const [loading, setLoading]   = useState(true);

  // Search (client-side on fetched page)
  const [search, setSearch] = useState('');

  const load = async (p = page, cat = category) => {
    setLoading(true);
    try {
      const params: any = { page: p, size: 100 };
      const res = await api.get('/admin/posts', { params }) as unknown as Page<Post>;
      setData(res);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  // Category change resets to page 0 — same as original
  useEffect(() => { setPage(0); load(0, category); }, [category]);
  useEffect(() => { if (page !== 0) load(page); }, [page]);

  const deletePost = async (id: number) => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/posts/${id}`);
      toast.success('Post deleted');
      load(page);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to delete post');
    }
  };

// Client-side search + category filter
  const allPosts = data?.content ?? [];
  const posts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allPosts.filter((p) => {
      const matchSearch = !q || p.title?.toLowerCase().includes(q) || p.authorName?.toLowerCase().includes(q);
      const matchCategory = category === 'ALL' || p.category === category;
      return matchSearch && matchCategory;
    });
  }, [allPosts, search, category]);

  const totalPages = data?.totalPages ?? 1;

  return (
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Posts</h1>
          <span className="text-sm text-muted-foreground">{data?.totalElements ?? 0} total</span>
        </div>

        {/* Search + category filter bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
                placeholder="Search by title or author…"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === 'ALL' ? 'All Categories' : CATEGORY_LABELS[c] ?? c}
                  </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Title</th>
              <th className="text-left p-3 font-medium">Category</th>
              <th className="text-left p-3 font-medium">Author</th>
              <th className="text-left p-3 font-medium">Engagement</th>
              <th className="p-3 font-medium w-24">Actions</th>
            </tr>
            </thead>
            <tbody>
            {loading ? (
                [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-t">
                      {[...Array(5)].map((_, j) => (
                          <td key={j} className="p-3"><Skeleton className="h-4 w-24" /></td>
                      ))}
                    </tr>
                ))
            ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">No posts found.</td>
                </tr>
            ) : (
                posts.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium max-w-[200px] truncate">{p.title}</td>
                      <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[p.category] ?? 'bg-gray-100 text-gray-600'}`}>
                      {CATEGORY_LABELS[p.category] ?? p.category}
                    </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{p.authorName}</td>
                      <td className="p-3">
                        <EngagementBar up={p.upvoteCount ?? 0} down={p.downvoteCount ?? 0} comments={p.commentCount ?? 0} />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" asChild title="View post">
                            <Link href={`/posts/${p.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                          </Button>
                          <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              title="Delete post"
                              onClick={() => deletePost(p.id)}
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