'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { PhaseCard } from '@/components/progress/PhaseCard';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Phase, ProjectProgress, Team } from '@/types';

// ── Date formatter ─────────────────────────────────────────────────────────────
function formatDate(raw: any): string {
  if (!raw) return '—';
  if (Array.isArray(raw)) {
    const [y, m, d] = raw as number[];
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  try { return new Date(raw).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return String(raw); }
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:           'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED:         'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  APPROVED:          'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  CHANGES_REQUESTED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

interface Deliverable { id: number; title: string; deadline: any; status: string; }
interface EnrichedPhase extends Phase { checkpoints: any[]; deliverableId?: number | null; }
interface DeliverableGroup { deliverable: Deliverable; phases: EnrichedPhase[]; }

function groupPhasesByDeliverable(phases: EnrichedPhase[], deliverables: Deliverable[]): DeliverableGroup[] {
  // Sort by deadline asc, then by id asc as stable tiebreaker
  const sorted = [...deliverables].sort((a, b) => {
    const t = (d: Deliverable) => Array.isArray(d.deadline)
        ? new Date((d.deadline as number[])[0], (d.deadline as number[])[1] - 1, (d.deadline as number[])[2]).getTime()
        : new Date(d.deadline).getTime();
    const diff = t(a) - t(b);
    return diff !== 0 ? diff : a.id - b.id; // stable: lower id = created first
  });

  const groups = new Map<number, EnrichedPhase[]>();
  sorted.forEach(d => groups.set(d.id, []));

  // Phases with a valid deliverableId go to their linked deliverable.
  // Phases with null deliverableId (legacy data before Phase.java fix) go to the
  // FIRST (oldest) deliverable, since that is when they were originally created.
  const firstDeliverable = sorted[0] ?? null;

  for (const phase of phases) {
    const did = phase.deliverableId;
    if (did != null && groups.has(did)) {
      groups.get(did)!.push(phase);
    } else if (firstDeliverable) {
      groups.get(firstDeliverable.id)!.push(phase);
    }
  }
  return sorted.map(d => ({ deliverable: d, phases: groups.get(d.id) ?? [] }));
}

// ── 1. Circular Progress Ring ─────────────────────────────────────────────────
function CircularProgress({ pct, total, completed }: { pct: number; total: number; completed: number }) {
  const R = 54;
  const C = 2 * Math.PI * R;
  const offset = C - (pct / 100) * C;

  // Colour changes with progress
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#a855f7' : '#a855f7';

  return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            {/* Ring */}
            <div className="relative shrink-0">
              <svg width="128" height="128" viewBox="0 0 128 128">
                {/* Track */}
                <circle cx="64" cy="64" r={R} fill="none" stroke="currentColor"
                        strokeWidth="10" className="text-muted/30" />
                {/* Progress arc */}
                <circle cx="64" cy="64" r={R} fill="none" stroke={color}
                        strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={C}
                        strokeDashoffset={offset}
                        transform="rotate(-90 64 64)"
                        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              {/* Centre label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold" style={{ color }}>{pct}%</span>
                <span className="text-[10px] text-muted-foreground leading-none">done</span>
              </div>
            </div>
            {/* Text info */}
            <div className="space-y-1">
              <p className="text-base font-semibold">Overall Project Progress</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{completed}</span> of{' '}
                <span className="font-medium text-foreground">{total}</span> checkpoints complete
              </p>
              {pct === 100 && (
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">🎉 All done!</p>
              )}
              {pct === 0 && total > 0 && (
                  <p className="text-sm text-muted-foreground">Get started by completing your first checkpoint.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
  );
}

// ── 2. Checkpoints-per-member bar chart ───────────────────────────────────────
function MemberCheckpointChart({ groups }: { groups: DeliverableGroup[] }) {
  const data = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    for (const { phases } of groups) {
      for (const phase of phases) {
        for (const cp of phase.checkpoints ?? []) {
          const name = cp.assignedToName ?? 'Unassigned';
          const entry = map.get(name) ?? { total: 0, done: 0 };
          entry.total += 1;
          if (cp.status === 'COMPLETE') entry.done += 1;
          map.set(name, entry);
        }
      }
    }
    return Array.from(map.entries()).map(([name, { total, done }]) => ({ name, total, done }));
  }, [groups]);

  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => d.total), 1);
  const BAR_H  = 32;
  const GAP    = 12;
  const LABEL_W = 110;
  const BAR_AREA = 260;
  const svgH    = data.length * (BAR_H + GAP) + 8;

  return (
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold mb-4">Checkpoints by Member</p>
          <svg width="100%" viewBox={`0 0 ${LABEL_W + BAR_AREA + 60} ${svgH}`} className="overflow-visible">
            {data.map((d, i) => {
              const y       = i * (BAR_H + GAP) + 4;
              const totalW  = (d.total / maxVal) * BAR_AREA;
              const doneW   = (d.done  / maxVal) * BAR_AREA;
              const donePct = d.total > 0 ? Math.round((d.done / d.total) * 100) : 0;

              return (
                  <g key={d.name}>
                    {/* Member label */}
                    <text x={LABEL_W - 8} y={y + BAR_H / 2 + 5} textAnchor="end"
                          fontSize="12" className="fill-foreground" style={{ fontFamily: 'inherit' }}>
                      {d.name.length > 14 ? d.name.slice(0, 13) + '…' : d.name}
                    </text>
                    {/* Total bar (light track) */}
                    <rect x={LABEL_W} y={y} width={totalW} height={BAR_H} rx="6"
                          className="fill-muted" />
                    {/* Done bar */}
                    <rect x={LABEL_W} y={y} width={doneW} height={BAR_H} rx="6"
                          fill="#a855f7" style={{ transition: 'width 0.6s ease' }} />
                    {/* Count label */}
                    <text x={LABEL_W + totalW + 8} y={y + BAR_H / 2 + 5}
                          fontSize="11" className="fill-muted-foreground" style={{ fontFamily: 'inherit' }}>
                      {d.done}/{d.total} ({donePct}%)
                    </text>
                  </g>
              );
            })}
          </svg>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-primary" /> Complete
          </span>
            <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-muted" /> Total assigned
          </span>
          </div>
        </CardContent>
      </Card>
  );
}

// ── 3. Inline progress bar for deliverable / phase ────────────────────────────
function InlineProgressBar({ done, total, color = '#a855f7' }: { done: number; total: number; color?: string }) {
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  return (
      <div className="mt-1.5 space-y-0.5">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{done}/{total} checkpoints</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, backgroundColor: color, transition: 'width 0.6s ease' }}
          />
        </div>
      </div>
  );
}

// ── 4. Checkpoint Completion Velocity ────────────────────────────────────────
// Groups COMPLETE checkpoints by week (using their deadline date as proxy),
// then draws a filled area line chart showing completions per week.



// ── Main component ─────────────────────────────────────────────────────────────
export default function ProgressPage() {
  const { id: teamId } = useParams<{ id: string }>();
  const { user } = useAuthStore();

  const [team, setTeam]         = useState<Team | null>(null);
  const [progress, setProgress] = useState<ProjectProgress | null>(null);
  const [groups, setGroups]     = useState<DeliverableGroup[]>([]);
  const [loading, setLoading]   = useState(true);

  const [addPhaseOpen, setAddPhaseOpen] = useState<number | false>(false);
  const [addCpOpen, setAddCpOpen]       = useState<number | null>(null);
  const [phaseForm, setPhaseForm]       = useState({ name: '', startDate: '', endDate: '' });
  const [cpForm, setCpForm]             = useState({ title: '', deadline: '' });
  const [saving, setSaving]             = useState(false);

  const load = async () => {
    try {
      const t = await api.get(`/teams/${teamId}`) as unknown as Team;
      setTeam(t);

      if (t.project?.id) {
        const [prog, rawPhases, rawDelivs] = await Promise.all([
          api.get(`/projects/${t.project.id}/progress`) as unknown as ProjectProgress,
          api.get(`/projects/${t.project.id}/phases`)   as unknown as Phase[],
          api.get(`/deliverables/project/${t.project.id}`),
        ]);
        setProgress(prog);

        const phaseList: Phase[] = Array.isArray(rawPhases) ? rawPhases : (rawPhases as any)?.phases ?? [];
        const delivList: Deliverable[] = Array.isArray(rawDelivs) ? rawDelivs as Deliverable[] : [];

        const enriched: EnrichedPhase[] = await Promise.all(
            phaseList.map(async (ph: any) => {
              try {
                const cps = await api.get(`/phases/${ph.id}/checkpoints`) as any;
                return { ...ph, checkpoints: Array.isArray(cps) ? cps : [] };
              } catch { return { ...ph, checkpoints: [] }; }
            }),
        );

        setGroups(delivList.length > 0 ? groupPhasesByDeliverable(enriched, delivList) : []);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load progress');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [teamId]);

  const isLeader   = team?.leaderId === user?.id;
  const projectId  = team?.project?.id;
  const callerRole = isLeader ? 'LEADER' : 'MEMBER';
  const activeDeliverable = groups.find(g => g.deliverable.status !== 'APPROVED')?.deliverable ?? null;

  const addPhase = async (deliverableId: number, deliverableTitle: string) => {
    setSaving(true);
    try {
      await api.post(`/projects/${projectId}/phases`, { ...phaseForm, deliverableId: String(deliverableId) });
      toast.success('Phase added');
      setAddPhaseOpen(false);
      setPhaseForm({ name: '', startDate: '', endDate: '' });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to add phase');
    } finally { setSaving(false); }
  };

  const addCheckpoint = async (phaseId: number) => {
    setSaving(true);
    try {
      await api.post(`/phases/${phaseId}/checkpoints`, cpForm);
      toast.success('Checkpoint added');
      setAddCpOpen(null);
      setCpForm({ title: '', deadline: '' });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to add checkpoint');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
        <div className="max-w-3xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
    );
  }

  if (!projectId) {
    return (
        <div className="max-w-3xl space-y-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/teams/${teamId}`}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
          </Button>
          <p className="text-muted-foreground">No project assigned to this team yet.</p>
        </div>
    );
  }

  const pct       = Math.round((progress as any)?.completionPercent ?? (progress as any)?.completionPercentage ?? 0);
  const completed = (progress as any)?.completedCheckpoints ?? 0;
  const total     = (progress as any)?.totalCheckpoints ?? 0;

  return (
      <div className="max-w-3xl space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/teams/${teamId}`}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
            </Button>
            <h1 className="text-xl font-bold">Project Progress</h1>
          </div>


        </div>

        {/* ── Report 1: Circular overall progress ── */}
        <CircularProgress pct={pct} total={total} completed={completed} />

        {/* ── Report 2: Checkpoints-per-member bar chart ── */}
        <MemberCheckpointChart groups={groups} />


        {/* No deliverables yet */}
        {groups.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <p className="text-lg font-medium">No deliverables yet.</p>
              <p className="text-sm">Phases will appear here once an advisor creates a deliverable.</p>
            </div>
        )}

        {/* ── One box per deliverable ── */}
        {groups.map(({ deliverable: d, phases }) => {
          const isApproved = d.status === 'APPROVED';
          const isActive   = d.id === activeDeliverable?.id;

          // Compute deliverable-level checkpoint counts for Report 3
          const delivDone  = phases.flatMap(p => p.checkpoints).filter(c => c.status === 'COMPLETE').length;
          const delivTotal = phases.flatMap(p => p.checkpoints).length;

          return (
              <div key={d.id} className={`border rounded-xl overflow-hidden ${isApproved ? 'opacity-75' : 'shadow-sm'}`}>

                {/* Deliverable header */}
                <div className={`px-4 py-3 border-b ${isApproved
                    ? 'bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-800'
                    : 'bg-primary/5 border-primary/10'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isApproved && <Lock className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />}
                      <div>
                        <p className="font-semibold text-sm">{d.title}</p>
                        <p className="text-xs text-muted-foreground">Deadline: {formatDate(d.deadline)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {d.status?.replace('_', ' ')}
                  </span>
                      {isApproved && <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Completed</span>}
                    </div>
                  </div>
                  {/* ── Report 3a: Deliverable progress bar ── */}
                  <InlineProgressBar done={delivDone} total={delivTotal}
                                     color={isApproved ? '#22c55e' : '#a855f7'} />
                </div>

                {/* Phases inside */}
                <div className="p-4 space-y-3">
                  {phases.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        {isApproved ? 'No phases were added for this deliverable.' : 'No phases yet. Add a phase below.'}
                      </p>
                  )}

                  {phases.map((phase) => {
                    // Compute phase-level checkpoint counts for Report 3b
                    const phaseDone  = (phase.checkpoints ?? []).filter(c => c.status === 'COMPLETE').length;
                    const phaseTotal = (phase.checkpoints ?? []).length;

                    return (
                        <div key={phase.id} className="space-y-1">
                          <PhaseCard
                              phase={phase}
                              isLeader={isLeader && isActive}
                              callerRole={isActive ? callerRole : 'MEMBER'}
                              onStatusChange={load}
                              readOnly={isApproved}
                          />
                          {/* ── Report 3b: Phase progress bar (shown below phase card) ── */}
                          {phaseTotal > 0 && (
                              <div className="px-4 pb-2">
                                <InlineProgressBar done={phaseDone} total={phaseTotal}
                                                   color={phaseDone === phaseTotal ? '#22c55e' : '#a855f7'} />
                              </div>
                          )}

                          {isLeader && isActive && (
                              <Dialog open={addCpOpen === phase.id} onOpenChange={(o) => {
                                setAddCpOpen(o ? phase.id : null);
                                if (!o) setCpForm({ title: '', deadline: '' });
                              }}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-xs ml-2">
                                    + Add Checkpoint to {phase.name}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader><DialogTitle>Add Checkpoint</DialogTitle></DialogHeader>
                                  <div className="space-y-3">
                                    <div><Label>Title</Label><Input value={cpForm.title} onChange={(e) => setCpForm({ ...cpForm, title: e.target.value })} /></div>
                                    <div>
                                      <Label>Deadline</Label>
                                      <Input type="date" min={phase.startDate as string} max={phase.endDate as string}
                                             value={cpForm.deadline} onChange={(e) => setCpForm({ ...cpForm, deadline: e.target.value })} />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button onClick={() => addCheckpoint(phase.id)} disabled={saving}>
                                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Checkpoint
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                          )}
                        </div>
                    );
                  })}
                  {/* Add Phase button — shown for every non-approved deliverable */}
                  {isLeader && !isApproved && (
                      <Dialog open={addPhaseOpen === d.id} onOpenChange={(o) => {
                        setAddPhaseOpen(o ? d.id : false);
                        if (!o) setPhaseForm({ name: '', startDate: '', endDate: '' });
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="w-full mt-1">+ Add Phase</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Add Phase — "{d.title}"</DialogTitle></DialogHeader>
                          <div className="space-y-3">
                            <div><Label>Phase Name</Label><Input value={phaseForm.name} onChange={(e) => setPhaseForm({ ...phaseForm, name: e.target.value })} /></div>
                            <div><Label>Start Date</Label><Input type="date" value={phaseForm.startDate} onChange={(e) => setPhaseForm({ ...phaseForm, startDate: e.target.value })} /></div>
                            <div><Label>End Date</Label><Input type="date" value={phaseForm.endDate} onChange={(e) => setPhaseForm({ ...phaseForm, endDate: e.target.value })} /></div>
                          </div>
                          <DialogFooter>
                            <Button onClick={() => addPhase(d.id, d.title)} disabled={saving}>
                              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Phase
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                  )}
                </div>
              </div>
          );
        })}
      </div>
  );
}