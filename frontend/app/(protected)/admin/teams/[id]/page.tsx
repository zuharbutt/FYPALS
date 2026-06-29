'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Plus, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import api from '@/lib/api';

interface TeamMember {
    userId: number;
    userName: string;
    email: string;
    role: string;
    memberRole: string;
}

interface TeamDetail {
    id: number;
    teamName: string;
    status: string;
    leaderId: number;
    leaderName: string;
    advisorName: string | null;
    createdAt: string;
    members: TeamMember[];
}

const STATUS_COLORS: Record<string, string> = {
    FORMING:   'bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-300',
    ACTIVE:    'bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300',
    LOCKED:    'bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-300',
    DISSOLVED: 'bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-300',
};

const ROLE_COLORS: Record<string, string> = {
    STUDENT:   'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300',
    ADVISOR:   'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    ADMIN:     'bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-300',
    FYP_STAFF: 'bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300',
};

export default function AdminTeamDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [team, setTeam]       = useState<TeamDetail | null>(null);
    const [loading, setLoading] = useState(true);

    // Add member state
    const [addOpen, setAddOpen]         = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching]     = useState(false);
    const [adding, setAdding]           = useState(false);

    const load = async () => {
        try {
            const data = await api.get(`/admin/teams/${id}`) as unknown as TeamDetail;
            setTeam(data);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Failed to load team');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [id]);

    const searchUsers = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            // Use admin/users which returns email — /search only returns skills as description
            const res = await api.get('/admin/users', { params: { page: 0, size: 50 } }) as any;
            const all: any[] = res?.content ?? [];
            const q = searchQuery.trim().toLowerCase();
            const existingIds = new Set((team?.members ?? []).map(m => m.userId));
            const filtered = all.filter(u =>
                !existingIds.has(u.id) &&
                (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
            );
            setSearchResults(filtered.slice(0, 8));
        } catch {
            toast.error('Search failed');
        } finally {
            setSearching(false);
        }
    };

    const addMember = async (userId: number, userName: string) => {
        setAdding(true);
        try {
            await api.post(`/admin/teams/${id}/members`, { userId });
            toast.success(`${userName} added to team`);
            setAddOpen(false);
            setSearchQuery('');
            setSearchResults([]);
            load();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Failed to add member');
        } finally {
            setAdding(false);
        }
    };

    const removeMember = async (userId: number, userName: string) => {
        if (!confirm(`Remove ${userName} from this team?`)) return;
        try {
            await api.delete(`/admin/teams/${id}/members/${userId}`);
            toast.success(`${userName} removed`);
            load();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Failed to remove member');
        }
    };

    if (loading) {
        return (
            <div className="max-w-2xl space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!team) return <p className="text-muted-foreground">Team not found.</p>;

    return (
        <div className="max-w-2xl space-y-4">

            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/teams"><ArrowLeft className="h-4 w-4 mr-1" /> Teams</Link>
                </Button>
                <h1 className="text-xl font-bold">{team.teamName}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[team.status] ?? ''}`}>
          {team.status}
        </span>
            </div>

            {/* Team info card */}
            <Card>
                <CardContent className="p-5 grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Leader</p>
                        <p className="font-medium text-sm">{team.leaderName}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Advisor</p>
                        <p className="font-medium text-sm">{team.advisorName ?? <span className="text-muted-foreground italic">None</span>}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Members</p>
                        <p className="font-medium text-sm">{team.members.length}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Created</p>
                        <p className="font-medium text-sm">
                            {team.createdAt ? new Date(team.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Members card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Members</CardTitle>
                        <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { setSearchQuery(''); setSearchResults([]); } }}>
                            <DialogTrigger asChild>
                                <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Add Member</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Add Member to {team.teamName}</DialogTitle></DialogHeader>
                                <div className="space-y-3">
                                    <div>
                                        <Label>Search by name or email</Label>
                                        <div className="flex gap-2 mt-1">
                                            <Input
                                                placeholder="e.g. John or john@uni.edu"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') searchUsers(); }}
                                            />
                                            <Button onClick={searchUsers} disabled={searching} size="sm">
                                                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>

                                    {searchResults.length > 0 && (
                                        <div className="border rounded-lg overflow-hidden divide-y max-h-60 overflow-y-auto">
                                            {searchResults.map((u) => (
                                                <div key={u.id} className="flex items-center justify-between p-3 hover:bg-muted/30">
                                                    <div>
                                                        <p className="text-sm font-medium">{u.name}</p>
                                                        <p className="text-xs text-muted-foreground">{u.email}</p>
                                                    </div>
                                                    <Button
                                                        size="sm" variant="outline"
                                                        disabled={adding}
                                                        onClick={() => addMember(u.id, u.name)}
                                                    >
                                                        {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {searchResults.length === 0 && searchQuery && !searching && (
                                        <p className="text-sm text-muted-foreground text-center py-2">No results found.</p>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {team.members.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-5">No active members.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left p-3 font-medium">Name</th>
                                <th className="text-left p-3 font-medium">Email</th>
                                <th className="text-left p-3 font-medium">Role</th>
                                <th className="text-left p-3 font-medium">Team Role</th>
                                <th className="p-3 font-medium w-16">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {team.members.map((m) => (
                                <tr key={m.userId} className="border-t hover:bg-muted/20">
                                    <td className="p-3 font-medium">
                                        {m.userName}
                                        {m.userId === team.leaderId && (
                                            <span className="ml-1 text-xs text-primary">👑</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-muted-foreground">{m.email}</td>
                                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {m.role}
                      </span>
                                    </td>
                                    <td className="p-3 text-xs text-muted-foreground">{m.memberRole}</td>
                                    <td className="p-3">
                                        {/* Cannot remove the leader */}
                                        {m.userId !== team.leaderId && (
                                            <Button
                                                size="icon" variant="ghost"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                title="Remove from team"
                                                onClick={() => removeMember(m.userId, m.userName)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}