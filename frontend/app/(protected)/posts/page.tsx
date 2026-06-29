'use client';

import { useEffect, useState } from 'react';
import { Plus, Loader2, TrendingUp, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PostCard, PostCardSkeleton } from '@/components/shared/PostCard';
import api from '@/lib/api';

// All 5 backend categories
const CATEGORIES = [
  { value: 'LOOKING_FOR_MEMBER',  label: 'Looking for Member',  color: 'bg-green-100 text-green-700' },
  { value: 'LOOKING_FOR_ADVISOR', label: 'Looking for Advisor', color: 'bg-purple-100 text-purple-700' },
  { value: 'PROJECT_IDEA',        label: 'Project',        color: 'bg-blue-100 text-blue-700' },
  { value: 'REQUIREMENT',         label: 'Requirement',         color: 'bg-amber-100 text-amber-700' },
  { value: 'GENERAL',             label: 'General',             color: 'bg-gray-100 text-gray-700' },
];

type CategoryValue = typeof CATEGORIES[number]['value'];

const createSchema = z.object({
  title:       z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category:    z.string().min(1, 'Category is required'),
});
type CreateValues = z.infer<typeof createSchema>;

type SortMode = 'date' | 'votes';

export default function PostsPage() {
  const [posts, setPosts]               = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [creating, setCreating]         = useState(false);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryValue | 'ALL'>('ALL');
  const [sortMode, setSortMode]         = useState<SortMode>('date');
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<CategoryValue>('GENERAL');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { category: 'GENERAL' },
  });

  const load = async (pg = 0, cat = categoryFilter, sort = sortMode) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: pg, size: 10, sortBy: sort };
      if (cat !== 'ALL') params.category = cat;
      const data = await api.get('/posts', { params }) as any;
      if (data && Array.isArray(data.content)) {
        setPosts(data.content);
        setTotalPages(data.totalPages ?? 1);
        setPage(pg);
      } else if (Array.isArray(data)) {
        setPosts(data);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(0, categoryFilter, sortMode); }, [categoryFilter, sortMode]);

  const handleVote = (postId: number, voteCount: number, upvoteCount: number, downvoteCount: number) => {
    setPosts((prev) => prev.map((p) =>
        p.id === postId ? { ...p, voteCount, upvoteCount, downvoteCount } : p
    ));
  };

  const onCreatePost = async (data: CreateValues) => {
    setCreating(true);
    try {
      await api.post('/posts', data);
      toast.success('Post published!');
      setDialogOpen(false);
      reset();
      setSelectedCategory('GENERAL');
      load(0, categoryFilter, sortMode);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create post');
    } finally {
      setCreating(false);
    }
  };

  return (
      <div className="max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Community Board</h1>
          {/* Sort toggle — Feature 9: rankings by votes */}
          <div className="flex gap-1 border rounded-md p-1">
            <Button
                size="sm" variant={sortMode === 'date' ? 'secondary' : 'ghost'}
                className="h-7 gap-1 text-xs"
                onClick={() => setSortMode('date')}
            >
              <Clock className="h-3.5 w-3.5" /> Latest
            </Button>
            <Button
                size="sm" variant={sortMode === 'votes' ? 'secondary' : 'ghost'}
                className="h-7 gap-1 text-xs"
                onClick={() => setSortMode('votes')}
            >
              <TrendingUp className="h-3.5 w-3.5" /> Top Rated
            </Button>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-2 flex-wrap">
          <Button
              variant={categoryFilter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter('ALL')}
          >
            All
          </Button>
          {CATEGORIES.map((cat) => (
              <Button
                  key={cat.value}
                  variant={categoryFilter === cat.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter(cat.value as CategoryValue)}
              >
                {cat.label}
              </Button>
          ))}
        </div>
        <div className="relative">
          <input
              type="text"
              placeholder="Search by author name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {sortMode === 'votes' && (
            <p className="text-xs text-muted-foreground italic">
              📊 Showing posts ranked by community votes
            </p>
        )}

        {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <PostCardSkeleton key={i} />)}
            </div>
        ) : posts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <p className="text-lg font-medium">No posts yet.</p>
              <p className="text-sm">Be the first to share an idea!</p>
              <Button onClick={() => setDialogOpen(true)}>Create Post</Button>
            </div>
        ) : (
            <div className="space-y-3">
              {posts.filter((post: any) =>
                  !search.trim() || post.authorName?.toLowerCase().includes(search.trim().toLowerCase())
              ).map((post, idx) => (
                  <div key={post.id} className="relative">
                    {sortMode === 'votes' && idx < 3 && (
                        <span className="absolute -left-5 top-3 text-sm font-bold text-muted-foreground select-none">
                  #{idx + 1}
                </span>
                    )}
                    <PostCard post={post} onVote={handleVote} />
                  </div>
              ))}
            </div>
        )}

        {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => load(page - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => load(page + 1)}>Next</Button>
            </div>
        )}

        {/* Floating create button */}
        <Button
            className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg p-0"
            onClick={() => setDialogOpen(true)}
            title="Create Post"
        >
          <Plus className="h-5 w-5" />
        </Button>

        {/* Create post dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Post</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onCreatePost)} className="space-y-3">
              <div className="space-y-1">
                <Label>Title *</Label>
                <Input {...register('title')} placeholder="Post title..." />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Description *</Label>
                <Textarea {...register('description')} placeholder="Describe your post..." rows={4} />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Category *</Label>
                <Select
                    value={selectedCategory}
                    onValueChange={(val: CategoryValue) => {
                      setSelectedCategory(val);
                      setValue('category', val);
                    }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Publish
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
  );
}