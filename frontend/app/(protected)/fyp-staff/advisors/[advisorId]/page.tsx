'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Users, Mail, BookOpen, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';

interface TeamItem {
    teamId: number;
    teamName: string;
    status: string;
    memberCount: number;
    projectId: number;
}

interface AdvisorInfo {
    id: number;
    name: string;
    email: string;
    bio?: string;
    department?: string;
    researchAreas?: string;
    skills?: string;
    profileComplete: boolean;
}

export default function FYPStaffAdvisorTeamsPage() {
    const { advisorId } = useParams<{ advisorId: string }>();
    const [advisor, setAdvisor] = useState<AdvisorInfo | null>(null);
    const [teams, setTeams]     = useState<TeamItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                // FIX 3: Load full advisor profile to show department/research areas
                const [allAdvisors, advisorProfile, teamsData] = await Promise.all([
                    api.get('/fyp-staff/advisors') as any,
                    api.get(`/users/${advisorId}/profile`) as any,
                    api.get(`/fyp-staff/advisors/${advisorId}/teams`) as any,
                ]);
                const advisorList = Array.isArray(allAdvisors) ? allAdvisors : allAdvisors?.data ?? [];
                const found = advisorList.find((a: any) => String(a.id) === advisorId);
                // Merge basic info with full profile
                setAdvisor({ ...found, ...advisorProfile });
                setTeams(Array.isArray(teamsData) ? teamsData : teamsData?.data ?? []);
            } catch (err: any) {
                toast.error(err?.response?.data?.message ?? 'Failed to load');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [advisorId]);

    return (
        <div className="max-w-3xl space-y-4">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/fyp-staff/dashboard">
                        <ArrowLeft className="h-4 w-4 mr-1" /> All Advisors
                    </Link>
                </Button>
            </div>

            {/* FIX 3: Advisor details card with full profile info */}
            {loading ? (
                <Skeleton className="h-40 w-full" />
            ) : advisor ? (
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <Avatar className="h-14 w-14">
                                <AvatarFallback className="text-lg">
                                    {advisor.name?.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-bold">{advisor.name}</h1>
                                    {advisor.profileComplete && (
                                        <Badge variant="secondary" className="text-xs">Profile Complete</Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Mail className="h-3.5 w-3.5" />
                                    {advisor.email}
                                </div>
                                {advisor.department && (
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <Building2 className="h-3.5 w-3.5" />
                                        {advisor.department}
                                    </div>
                                )}
                                {advisor.researchAreas && (
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <BookOpen className="h-3.5 w-3.5" />
                                        Research: {advisor.researchAreas}
                                    </div>
                                )}
                                {advisor.bio && (
                                    <p className="text-sm text-muted-foreground italic mt-2">{advisor.bio}</p>
                                )}
                                {advisor.skills && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {advisor.skills.split(',').map((s: string) => (
                                            <Badge key={s.trim()} variant="outline" className="text-xs">{s.trim()}</Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            {/* Teams list */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Supervised Teams ({teams.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {loading ? (
                        [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                    ) : teams.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No teams supervised by this advisor yet.
                        </p>
                    ) : (
                        teams.map((t) => (
                            <div
                                key={t.teamId}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                            >
                                <div>
                                    <p className="font-medium text-sm">{t.teamName}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="secondary" className="text-xs">{t.status}</Badge>
                                        <span className="text-xs text-muted-foreground">
                      {t.memberCount} member{t.memberCount !== 1 ? 's' : ''}
                    </span>
                                    </div>
                                </div>
                                <Button size="sm" variant="outline" asChild>
                                    <Link href={`/fyp-staff/teams/${t.teamId}?projectId=${t.projectId}`}>
                                        View Deliverables
                                    </Link>
                                </Button>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}