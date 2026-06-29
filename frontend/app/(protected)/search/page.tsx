'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PostCardSkeleton } from '@/components/shared/PostCard';
import api from '@/lib/api';

// Added 'advisor' to the type union
type SearchType = 'all' | 'post' | 'student' | 'advisor';

interface RawSearchResult {
    id: number;
    type: 'post' | 'student' | 'advisor';
    title: string;
    description: string;
    extra: string;
}

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
    let timer: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

export default function SearchPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [query, setQuery] = useState(searchParams.get('q') ?? '');
    const [type, setType] = useState<SearchType>('all');
    const [results, setResults] = useState<RawSearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    const doSearch = useCallback(
        debounce(async (q: string, t: SearchType) => {
            if (!q.trim()) { setResults([]); return; }
            setLoading(true);
            try {
                const params: Record<string, string> = { q };
                if (t !== 'all') params.type = t;
                const data = await api.get('/search', { params }) as unknown as RawSearchResult[];
                setResults(Array.isArray(data) ? data : []);
            } catch (err: any) {
                toast.error(err?.response?.data?.message ?? 'Search failed');
            } finally {
                setLoading(false);
            }
        }, 300),
        []
    );

    useEffect(() => {
        doSearch(query, type);
        if (query) {
            router.replace(`/search?q=${encodeURIComponent(query)}`, { scroll: false });
        }
    }, [query, type]);

    const filterButtons: { value: SearchType; label: string }[] = [
        { value: 'all',     label: 'All' },
        { value: 'post',    label: 'Posts' },
        { value: 'student', label: 'Students' },
        { value: 'advisor', label: 'Advisors' },  // ← new
    ];

    return (
        <div className="max-w-3xl space-y-4">
            <h1 className="text-2xl font-bold">Search</h1>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    className="pl-9"
                    placeholder="Search posts, students, advisors..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                />
            </div>

            <div className="flex gap-2">
                {filterButtons.map(({ value, label }) => (
                    <Button
                        key={value}
                        variant={type === value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setType(value)}
                    >
                        {label}
                    </Button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)}
                </div>
            ) : results.length === 0 && query ? (
                <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                    <p className="text-lg font-medium">No results for &quot;{query}&quot;</p>
                    <p className="text-sm">Try a different search term.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {results.map((r) =>
                            r.type === 'post' ? (
                                <div
                                    key={`post-${r.id}`}
                                    className="rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => router.push(`/posts/${r.id}`)}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {r.extra?.replace(/_/g, ' ')}
                  </span>
                                        <span className="text-xs text-muted-foreground">Post</span>
                                    </div>
                                    <p className="font-semibold">{r.title}</p>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                                </div>

                            ) : r.type === 'student' ? (
                                <div
                                    key={`student-${r.id}`}
                                    className="rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => router.push(`/profile/${r.id}`)}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    Student
                  </span>
                                    </div>
                                    <p className="font-semibold">{r.title}</p>
                                    <p className="text-sm text-muted-foreground">{r.description}</p>
                                    <p className="text-xs text-muted-foreground mt-1 italic">{r.extra}</p>
                                </div>

                            ) : r.type === 'advisor' ? (
                                // ── Advisor result card ──────────────────────────────────────
                                <div
                                    key={`advisor-${r.id}`}
                                    className="rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => router.push(`/profile/${r.id}`)}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                    Advisor
                  </span>
                                    </div>
                                    <p className="font-semibold">{r.title}</p>
                                    <p className="text-sm text-muted-foreground">{r.description}</p>
                                    <p className="text-xs text-muted-foreground mt-1 italic">{r.extra}</p>
                                </div>

                            ) : null
                    )}
                </div>
            )}
        </div>
    );
}