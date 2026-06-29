'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Users, FileCheck, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { User, Team } from '@/types';

// ── Report 8: Team Health Score ─────────────────────────────────────────────
// Score is computed from three factors — all purely from already-fetched data:
//   1. % checkpoints complete  (from completionPct stored per team)
//   2. Days until next deadline (nearest non-APPROVED deliverable deadline)
//   3. Whether latest deliverable is overdue (status=SUBMITTED past deadline or PENDING past deadline)
interface TeamHealth {
  score: 'good' | 'warning' | 'critical';
  label: string;
  reasons: string[];
}

function computeHealth(deliverables: any[], completionPct: number): TeamHealth {
  const reasons: string[] = [];
  let score = 0; // 0=critical, 1=warning, 2=good — start optimistic

  const now = new Date();

  // Factor 1: overall checkpoint completion
  if (completionPct >= 70)       score += 2;
  else if (completionPct >= 40)  { score += 1; reasons.push(`${Math.round(completionPct)}% checkpoints done`); }
  else                           { reasons.push(`Only ${Math.round(completionPct)}% checkpoints done`); }

  // Factor 2 & 3: deliverables
  const pending = deliverables.filter(d => d.status !== 'APPROVED');
  if (pending.length > 0) {
    const soonest = pending
        .filter(d => d.deadline)
        .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];

    if (soonest) {
      const daysLeft = Math.ceil((new Date(soonest.deadline).getTime() - now.getTime()) / 86400000);
      if (daysLeft < 0) {
        reasons.push(`Deadline passed ${Math.abs(daysLeft)}d ago`);
      } else if (daysLeft <= 3) {
        reasons.push(`${daysLeft}d until deadline`);
        score -= 1;
      } else if (daysLeft <= 7) {
        reasons.push(`${daysLeft}d until deadline`);
      }

      // Overdue: PENDING past deadline
      if (soonest.status === 'PENDING' && daysLeft < 0) {
        score -= 1;
        reasons.push('Deliverable not submitted');
      }
    }
  }

  const level: TeamHealth['score'] = score >= 3 ? 'good' : score >= 1 ? 'warning' : 'critical';
  const labelMap = { good: '● Healthy', warning: '● Needs Attention', critical: '● At Risk' };
  return { score: level, label: labelMap[level], reasons };
}

const HEALTH_COLORS = {
  good:     'text-green-600  dark:text-green-400',
  warning:  'text-amber-500  dark:text-amber-400',
  critical: 'text-red-500    dark:text-red-400',
};

export default function AdvisorDashboardPage() {
  const { user: authUser } = useAuthStore();
  const [profile, setProfile]             = useState<User | null>(null);
  const [teams, setTeams]                 = useState<Team[]>([]);
  const [teamData, setTeamData]           = useState<Record<number, { deliverables: any[]; pct: number }>>({});
  const [pendingDeliverables, setPendingDeliverables] = useState(0);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const p = await api.get('/users/me/profile') as unknown as User;
        setProfile(p);
        try {
          const t = await api.get('/advisor/teams') as unknown as Team[];
          const teamList = Array.isArray(t) ? t : (t as any)?.content ?? [];
          setTeams(teamList);

          let pending = 0;
          const newTeamData: Record<number, { deliverables: any[]; pct: number }> = {};

          for (const team of teamList) {
            const projId = (team as any).project?.id;
            if (projId) {
              try {
                const [delivs, prog] = await Promise.all([
                  api.get(`/deliverables/project/${projId}`) as any,
                  api.get(`/projects/${projId}/progress`) as any,
                ]);
                const delivList = Array.isArray(delivs) ? delivs : [];
                pending += delivList.filter((d: any) => d.status === 'SUBMITTED').length;
                newTeamData[team.id] = {
                  deliverables: delivList,
                  pct: prog?.completionPercent ?? prog?.completionPercentage ?? 0,
                };
              } catch {
                newTeamData[team.id] = { deliverables: [], pct: 0 };
              }
            } else {
              newTeamData[team.id] = { deliverables: [], pct: 0 };
            }
          }

          setPendingDeliverables(pending);
          setTeamData(newTeamData);
        } catch {
          setTeams([]);
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
        <div className="space-y-4 max-w-3xl">
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-2 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
          <Skeleton className="h-48" />
        </div>
    );
  }

  const profileComplete = profile?.profileComplete ?? false;

  return (
      <div className="max-w-3xl space-y-6">

        {/* Welcome */}
        <Card>
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold">Welcome, {profile?.name ?? authUser?.name}</h1>
            <p className="text-muted-foreground">
              {(profile as any)?.department ? `Department: ${(profile as any).department}` : 'FYP Advisor / Supervisor'}
            </p>
          </CardContent>
        </Card>

        {/* Profile completion banner */}
        {!profileComplete && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-800">
              <BookOpen className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Complete your supervisor profile</p>
                <p className="text-sm mt-1">
                  Add your department, research areas, and a brief bio so students can find you when looking for an advisor.
                </p>
                <Button size="sm" variant="outline" asChild className="mt-2 border-blue-300 hover:bg-blue-100">
                  <Link href={`/profile/${profile?.id ?? authUser?.id}`}>Complete Supervisor Profile</Link>
                </Button>
              </div>
            </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10"><Users className="h-6 w-6 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{teams.length}</p>
                <p className="text-sm text-muted-foreground">Teams Supervised</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-full bg-amber-100"><FileCheck className="h-6 w-6 text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold">{pendingDeliverables}</p>
                <p className="text-sm text-muted-foreground">Pending Feedback</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Supervised teams with health score */}
        <Card>
          <CardHeader><CardTitle className="text-base">Supervised Teams</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {teams.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No teams assigned to you yet. Teams will appear here once a student team leader invites you and you accept.
                </p>
            ) : (
                teams.map((t) => {
                  const td = teamData[t.id] ?? { deliverables: [], pct: 0 };
                  const health = computeHealth(td.deliverables, td.pct);
                  return (
                      <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{t.teamName}</p>
                            {/* Health traffic light */}
                            <span className={`text-xs font-medium ${HEALTH_COLORS[health.score]}`}>
                        {health.label}
                      </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {(t as any).memberCount ?? t.members?.length ?? 0} members
                            {' · '}{Math.round(td.pct)}% complete
                          </p>
                          {health.reasons.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-0.5 italic">
                                {health.reasons.join(' · ')}
                              </p>
                          )}
                        </div>
                        <Button size="sm" variant="outline" asChild className="shrink-0">
                          <Link href={`/advisor/teams/${t.id}`}>View Team</Link>
                        </Button>
                      </div>
                  );
                })
            )}
          </CardContent>
        </Card>
      </div>
  );
}