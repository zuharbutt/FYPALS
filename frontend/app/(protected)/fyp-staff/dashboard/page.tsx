'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { GraduationCap, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface AdvisorItem {
    id: number;
    name: string;
    email: string;
    bio: string;
    profileComplete: boolean;
    teamCount?: number;
}

// ── Report 6: Advisor Workload Heatmap bar ─────────────────────────────────
function WorkloadBar({ count, avg, max }: { count: number; avg: number; max: number }) {
    const pct = max > 0 ? (count / max) * 100 : 0;
    const color = count === 0
        ? '#6b7280'                           // grey — no teams
        : count <= avg
            ? '#22c55e'                           // green — at or below average
            : count <= avg * 1.5
                ? '#f59e0b'                           // amber — slightly above
                : '#ef4444';                          // red — heavily loaded

    return (
        <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
            <span className="text-xs font-semibold tabular-nums w-4 text-right" style={{ color }}>
        {count}
      </span>
        </div>
    );
}

export default function FYPStaffDashboardPage() {
    const { user: authUser } = useAuthStore();
    const [profile, setProfile]   = useState<any>(null);
    const [advisors, setAdvisors] = useState<AdvisorItem[]>([]);
    const [loading, setLoading]   = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [p, data] = await Promise.all([
                    api.get('/users/me/profile') as any,
                    api.get('/fyp-staff/advisors') as any,
                ]);
                setProfile(p);
                setAdvisors(Array.isArray(data) ? data : data?.data ?? []);
            } catch (err: any) {
                toast.error(err?.response?.data?.message ?? 'Failed to load dashboard');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const profileComplete = profile?.profileComplete ?? false;

    // Workload stats
    const teamCounts  = advisors.map(a => a.teamCount ?? 0);
    const avgTeams    = teamCounts.length ? teamCounts.reduce((s, n) => s + n, 0) / teamCounts.length : 0;
    const maxTeams    = Math.max(...teamCounts, 1);

    return (
        <div className="max-w-3xl space-y-6">

            {/* Welcome card */}
            <Card>
                <CardContent className="p-6">
                    <h1 className="text-2xl font-bold">Welcome, {profile?.name ?? authUser?.name}</h1>
                    <p className="text-muted-foreground">
                        {profile?.designation
                            ? `FYP Office Staff — ${profile.designation}`
                            : 'FYP Office Staff — Review deliverable submissions'}
                    </p>
                </CardContent>
            </Card>

            {/* Profile completion banner */}
            {!profileComplete && (
                <div className="flex items-start gap-3 p-4 rounded-lg border border-purple-200 bg-purple-50 text-purple-800">
                    <ClipboardList className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium">Set up your staff profile</p>
                        <p className="text-sm mt-1">
                            Add your designation (e.g. FYP Coordinator) so the system can properly identify your role.
                            This helps teams and advisors know who is reviewing their submissions.
                        </p>
                        <Button size="sm" variant="outline" asChild className="mt-2 border-purple-300 hover:bg-purple-100">
                            <Link href={`/profile/${profile?.id ?? authUser?.id}`}>Complete Staff Profile</Link>
                        </Button>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-3 rounded-full bg-purple-100">
                            <GraduationCap className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{advisors.length}</p>
                            <p className="text-sm text-muted-foreground">Advisors on Platform</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Advisors list + workload heatmap */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Advisor Workload</CardTitle>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>≤ avg</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>above avg</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>overloaded</span>
                        </div>
                    </div>
                    {advisors.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Avg: {avgTeams.toFixed(1)} teams/advisor
                        </p>
                    )}
                </CardHeader>
                <CardContent className="space-y-2">
                    {loading ? (
                        [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                    ) : advisors.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No advisors registered yet.</p>
                    ) : (
                        advisors.map((a) => (
                            <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <Avatar className="h-9 w-9 shrink-0">
                                        <AvatarFallback className="text-xs">{a.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="font-medium text-sm truncate">{a.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                                    </div>
                                </div>
                                {/* Workload bar */}
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-xs text-muted-foreground hidden sm:block">
                                        {a.teamCount ?? 0} team{(a.teamCount ?? 0) !== 1 ? 's' : ''}
                                    </div>
                                    <WorkloadBar count={a.teamCount ?? 0} avg={avgTeams} max={maxTeams} />
                                    {a.profileComplete && (
                                        <Badge variant="outline" className="text-xs hidden sm:flex">Complete</Badge>
                                    )}
                                    <Button size="sm" variant="outline" asChild>
                                        <Link href={`/fyp-staff/advisors/${a.id}`}>View Teams</Link>
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}