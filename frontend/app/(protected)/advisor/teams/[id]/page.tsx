'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, PlusCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PhaseCard } from '@/components/progress/PhaseCard';
import api from '@/lib/api';
import type { Team, ProjectProgress, Phase, Deliverable } from '@/types';

// ── Date helpers ─────────────────────────────────────────────────────────────
function formatDate(raw: string | null | undefined): string {
  if (!raw) return '—';
  try {
    return new Date(raw).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return String(raw);
  }
}

function formatDateTime(raw: string | null | undefined): string {
  if (!raw) return '—';
  try {
    return new Date(raw).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return String(raw);
  }
}

const STATUS_VARIANTS: Record<string, any> = {
  PENDING:            'secondary',
  SUBMITTED:          'default',
  APPROVED:           'default',
  CHANGES_REQUESTED:  'destructive',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  CHANGES_REQUESTED: 'bg-red-100 text-red-700',
};

export default function AdvisorTeamPage() {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam]               = useState<Team | null>(null);
  const [progress, setProgress]       = useState<ProjectProgress | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [phasesMap, setPhasesMap]     = useState<Record<number, Phase[]>>({});
  const [loading, setLoading]         = useState(true);

  // Feedback state
  const [feedbackOpen, setFeedbackOpen] = useState<number | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    comment: '', decision: 'APPROVED' as 'APPROVED' | 'CHANGES_REQUESTED',
  });
  const [submitting, setSubmitting] = useState(false);

  // Create deliverable state
  const [createOpen, setCreateOpen]   = useState(false);
  const [creating, setCreating]       = useState(false);
  const [createForm, setCreateForm]   = useState({ title: '', deadline: '' });

  // View submission popup
  const [viewOpen, setViewOpen]       = useState<any | null>(null);

  const load = useCallback(async () => {
    try {
      const t = await api.get(`/teams/${id}`) as unknown as Team;
      setTeam(t);
      if (t.project?.id) {
        const [prog, allPhases, delivs] = await Promise.all([
          api.get(`/projects/${t.project.id}/progress`) as unknown as ProjectProgress,
          api.get(`/projects/${t.project.id}/phases`)   as unknown as Phase[],
          api.get(`/deliverables/project/${t.project.id}`) as unknown as Deliverable[],
        ]);
        setProgress(prog);

        const phaseList = Array.isArray(allPhases) ? allPhases : (allPhases as any)?.phases ?? [];
        const delivList = Array.isArray(delivs) ? delivs : [];
        setDeliverables(delivList);

        // Enrich phases with checkpoints
        const enriched: Phase[] = await Promise.all(
            phaseList.map(async (ph: any) => {
              try {
                const cps = await api.get(`/phases/${ph.id}/checkpoints`) as any;
                return { ...ph, checkpoints: Array.isArray(cps) ? cps : [] };
              } catch { return { ...ph, checkpoints: [] }; }
            })
        );

        // Build phasesMap — same logic as student side
        const newMap: Record<number, Phase[]> = {};
        delivList.forEach((d: any) => { newMap[d.id] = []; });

        const hasDeliverableId = enriched.some((ph: any) => ph.deliverableId != null);
        if (hasDeliverableId) {
          enriched.forEach((ph: any) => {
            if (ph.deliverableId && newMap[ph.deliverableId]) {
              newMap[ph.deliverableId].push(ph);
            } else {
              const active = delivList.find((d: any) => d.status !== 'APPROVED') ?? delivList[delivList.length - 1];
              if (active) newMap[active.id].push(ph);
            }
          });
        } else {
          // FIX: distribute phases by order so approved deliverables keep their phases
          const sortedPhases = [...enriched].sort((a: any, b: any) => a.id - b.id);
          const approvedDelivs = delivList.filter((d: any) => d.status === 'APPROVED');
          const activeDeliverable = delivList.find((d: any) => d.status !== 'APPROVED')
              ?? delivList[delivList.length - 1];
          if (approvedDelivs.length === 0 || delivList.length === 1) {
            if (activeDeliverable) newMap[activeDeliverable.id] = sortedPhases;
          } else {
            const phasesPerDeliv = Math.floor(sortedPhases.length / delivList.length);
            let phaseIdx = 0;
            delivList.forEach((d: any, i: number) => {
              const isLast = i === delivList.length - 1;
              const count = isLast ? sortedPhases.length - phaseIdx : phasesPerDeliv;
              newMap[d.id] = sortedPhases.slice(phaseIdx, phaseIdx + count);
              phaseIdx += count;
            });
          }
        }

        setPhasesMap(newMap);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const submitFeedback = async (deliverableId: number) => {
    setSubmitting(true);
    try {
      await api.post(`/deliverables/${deliverableId}/feedback`, {
        ...feedbackForm,
        callerRole: 'ADVISOR',
      });
      toast.success('Feedback submitted');
      setFeedbackOpen(null);
      setFeedbackForm({ comment: '', decision: 'APPROVED' });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const createDeliverable = async () => {
    if (!createForm.title || !createForm.deadline) {
      toast.error('Please fill in title and deadline');
      return;
    }
    if (!(team as any)?.project?.id) {
      toast.error('No project found for this team');
      return;
    }
    setCreating(true);
    try {
      await api.post(`/deliverables/project/${(team as any).project.id}`, createForm);
      toast.success('Deliverable created');
      setCreateOpen(false);
      setCreateForm({ title: '', deadline: '' });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create deliverable');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
        <div className="max-w-4xl space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
    );
  }

  if (!team) return <p className="text-muted-foreground">Team not found.</p>;

  const pct = progress?.completionPercent ?? (progress as any)?.completionPercentage ?? 0;

  return (
      <div className="max-w-4xl space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/advisor/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Link>
          </Button>
          <h1 className="text-xl font-bold">{team.teamName}</h1>
          <Badge variant="secondary">{team.status}</Badge>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Members</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
          </TabsList>

          {/* ── Members tab ── */}
          <TabsContent value="overview">
            <Card>
              <CardHeader><CardTitle className="text-base">Team Members</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {team.members.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs">
                            {m.userName?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{m.userName}</p>
                          <Badge variant="outline" className="text-xs">{m.memberRole}</Badge>
                        </div>
                      </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Progress tab ── deliverable-based boxes (read-only) ── */}
          <TabsContent value="progress" className="space-y-4">
            {/* ── Report 4: Circular progress + Deliverable status donut ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Left: circular overall progress ring */}
              <Card>
                <CardContent className="p-5 flex items-center gap-5">
                  <div className="relative shrink-0">
                    <svg width="100" height="100" viewBox="0 0 128 128">
                      <circle cx="64" cy="64" r="54" fill="none" stroke="currentColor"
                              strokeWidth="10" strokeOpacity="0.12" />
                      <circle cx="64" cy="64" r="54" fill="none"
                              stroke={pct >= 100 ? "#22c55e" : "#a855f7"}
                              strokeWidth="10" strokeLinecap="round"
                              strokeDasharray={2 * Math.PI * 54}
                              strokeDashoffset={2 * Math.PI * 54 - (pct / 100) * 2 * Math.PI * 54}
                              transform="rotate(-90 64 64)"
                              style={{ transition: "stroke-dashoffset 0.8s ease" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold" style={{ color: pct >= 100 ? "#22c55e" : "#a855f7" }}>
                        {Math.round(pct)}%
                      </span>
                      <span className="text-[9px] text-muted-foreground">done</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Overall Progress</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Checkpoint completion across all phases
                    </p>
                    {pct >= 100 && <p className="text-xs text-green-600 mt-1 font-medium">🎉 All done!</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Right: deliverable status donut */}
              {deliverables.length > 0 && (() => {
                const counts = {
                  APPROVED:          deliverables.filter((d: any) => d.status === 'APPROVED').length,
                  SUBMITTED:         deliverables.filter((d: any) => d.status === 'SUBMITTED').length,
                  CHANGES_REQUESTED: deliverables.filter((d: any) => d.status === 'CHANGES_REQUESTED').length,
                  PENDING:           deliverables.filter((d: any) => d.status === 'PENDING').length,
                };
                const slices = [
                  { label: 'Approved',  value: counts.APPROVED,          color: '#22c55e' },
                  { label: 'Submitted', value: counts.SUBMITTED,         color: '#3b82f6' },
                  { label: 'Changes',   value: counts.CHANGES_REQUESTED,  color: '#ef4444' },
                  { label: 'Pending',   value: counts.PENDING,            color: '#6b7280' },
                ].filter(s => s.value > 0);

                const total = deliverables.length;
                const R = 40; const CX = 60; const CY = 60;
                const C = 2 * Math.PI * R;

                let cumulative = 0;
                const arcs = slices.map(s => {
                  const dash   = (s.value / total) * C;
                  const gap    = C - dash;
                  const offset = C - cumulative * (C / total);
                  cumulative  += s.value;
                  return { ...s, dash, gap, offset };
                });

                return (
                    <Card>
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="relative shrink-0">
                          <svg width="120" height="120" viewBox="0 0 120 120">
                            {arcs.map((arc, i) => (
                                <circle key={i} cx={CX} cy={CY} r={R}
                                        fill="none" stroke={arc.color} strokeWidth="18"
                                        strokeDasharray={`${arc.dash} ${arc.gap}`}
                                        strokeDashoffset={arc.offset}
                                        transform={`rotate(-90 ${CX} ${CY})`}
                                        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                                />
                            ))}
                            <text x={CX} y={CY + 5} textAnchor="middle"
                                  fontSize="14" fontWeight="700" fill="currentColor"
                                  style={{ fontFamily: 'inherit' }}>
                              {total}
                            </text>
                            <text x={CX} y={CY + 17} textAnchor="middle"
                                  fontSize="8" fill="#888" style={{ fontFamily: 'inherit' }}>
                              total
                            </text>
                          </svg>
                        </div>
                        <div className="space-y-1.5 min-w-0">
                          <p className="font-semibold text-sm mb-2">Deliverable Status</p>
                          {slices.map(s => (
                              <div key={s.label} className="flex items-center gap-2 text-xs">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                <span className="text-muted-foreground">{s.label}</span>
                                <span className="font-semibold ml-auto">{s.value}</span>
                              </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                );
              })()}
            </div>

            {deliverables.length === 0 && (
                <p className="text-sm text-muted-foreground">No deliverables yet. Create one in the Deliverables tab.</p>
            )}

            {/* Show each deliverable as a box with its phases inside — matches student view */}
            {deliverables.map((d: any) => {
              const isApproved = d.status === 'APPROVED';
              const phases = phasesMap[d.id] ?? [];

              return (
                  <div key={d.id} className={`border rounded-xl overflow-hidden ${isApproved ? '' : 'shadow-sm'}`}>
                    {/* Deliverable header */}
                    <div className={`px-4 py-3 flex items-center justify-between ${
                        isApproved
                            ? 'bg-green-50 border-b border-green-100'
                            : 'bg-primary/5 border-b border-primary/10'
                    }`}>
                      <div className="flex items-center gap-2">
                        {isApproved && <Lock className="h-4 w-4 text-green-600" />}
                        <div>
                          <p className="font-semibold text-sm">{d.title}</p>
                          <p className="text-xs text-muted-foreground">Deadline: {formatDate(d.deadline)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status] ?? 'bg-gray-100'}`}>
                          {d.status?.replace('_', ' ')}
                        </span>
                        {isApproved && <span className="text-xs text-green-600 font-medium">✓ Completed</span>}
                      </div>
                    </div>

                    {/* Phases inside this deliverable — read-only for advisor */}
                    <div className="p-4 space-y-3">
                      {phases.length === 0 && (
                          <p className="text-sm text-muted-foreground italic">No phases added for this deliverable.</p>
                      )}
                      {phases.map((phase: any) => (
                          <div key={phase.id} className="space-y-1">
                            <p className="text-xs text-muted-foreground px-1">
                              {formatDate(phase.startDate)} → {formatDate(phase.endDate)}
                            </p>
                            <PhaseCard phase={phase} isLeader={false} callerRole="ADVISOR" readOnly />
                          </div>
                      ))}
                    </div>
                  </div>
              );
            })}
          </TabsContent>

          {/* ── Deliverables tab ── */}
          <TabsContent value="deliverables" className="space-y-3">

            {/* Create Deliverable button */}
            <div className="flex justify-end">
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <PlusCircle className="h-4 w-4 mr-1" /> Create Deliverable
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create Deliverable</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Title</Label>
                      <Input
                          placeholder="e.g. Final Report Submission"
                          value={createForm.title}
                          onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Deadline</Label>
                      <Input
                          type="date"
                          value={createForm.deadline}
                          onChange={(e) => setCreateForm({ ...createForm, deadline: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={createDeliverable} disabled={creating}>
                      {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {deliverables.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No deliverables yet. Create one above.
                </p>
            )}

            {deliverables.map((d: any) => (
                <Card key={d.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="font-medium">{d.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Deadline: {formatDate(d.deadline as any)}
                        </p>
                        {d.submittedAt && (
                            <p className="text-xs text-muted-foreground">
                              Submitted: {formatDateTime(d.submittedAt)}
                            </p>
                        )}
                        {/* View Submission — opens popup with link + resubmission comment if any */}
                        {d.googleDriveLink && (
                            <button
                                type="button"
                                onClick={() => setViewOpen(d)}
                                className="text-xs text-primary underline hover:no-underline"
                            >
                              View Submission
                            </button>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={STATUS_VARIANTS[d.status]}>{d.status}</Badge>

                        {d.status === 'SUBMITTED' && (
                            <Dialog
                                open={feedbackOpen === d.id}
                                onOpenChange={(o) => {
                                  setFeedbackOpen(o ? d.id : null);
                                  if (o) setFeedbackForm({ comment: '', decision: 'APPROVED' });
                                }}
                            >
                              <DialogTrigger asChild>
                                <Button size="sm">Give Feedback</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Give Feedback</DialogTitle></DialogHeader>
                                <div className="space-y-3">
                                  <div>
                                    <Label>Comment</Label>
                                    <Textarea
                                        value={feedbackForm.comment}
                                        onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
                                        rows={4}
                                        placeholder="Provide detailed feedback..."
                                    />
                                  </div>
                                  <div>
                                    <Label>Decision</Label>
                                    <Select
                                        value={feedbackForm.decision}
                                        onValueChange={(v: 'APPROVED' | 'CHANGES_REQUESTED') =>
                                            setFeedbackForm({ ...feedbackForm, decision: v })
                                        }
                                    >
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="APPROVED">Approved</SelectItem>
                                        <SelectItem value="CHANGES_REQUESTED">Changes Requested</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button onClick={() => submitFeedback(d.id)} disabled={submitting}>
                                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Submit Feedback
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                        )}
                      </div>
                    </div>

                    {d.feedback && (
                        <div className="p-3 rounded-md bg-muted/50 border text-sm space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Your Feedback</p>
                          <p>{d.feedback.comment}</p>
                          <Badge variant={d.feedback.decision === 'APPROVED' ? 'default' : 'destructive'}>
                            {d.feedback.decision}
                          </Badge>
                        </div>
                    )}
                    {((d as any).staffComments ?? []).map((c: any) => (
                        <div key={c.id} className="p-3 rounded-md border border-blue-200 bg-white text-sm space-y-1">
                          <p className="text-xs font-medium text-blue-600">FYP Staff Comment</p>
                          <p className="text-gray-900">{c.comment}</p>
                        </div>
                    ))}
                  </CardContent>
                </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* View Submission / Resubmission popup */}
        {viewOpen && (
            <Dialog open={true} onOpenChange={(o) => { if (!o) setViewOpen(null); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    Submission — {viewOpen.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Google Drive Link</p>
                    <a
                        href={viewOpen.googleDriveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary underline break-all"
                    >
                      {viewOpen.googleDriveLink}
                    </a>
                  </div>
                  {viewOpen.submittedAt && (
                      <p className="text-xs text-muted-foreground">Submitted: {formatDateTime(viewOpen.submittedAt)}</p>
                  )}
                  {viewOpen.resubmissionComment && (
                      <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
                        <p className="text-xs font-medium text-blue-700 mb-1">Student&apos;s resubmission comment</p>
                        <p className="text-sm text-blue-900">{viewOpen.resubmissionComment}</p>
                      </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setViewOpen(null)}>Close</Button>
                  <Button asChild>
                    <a
                        href={viewOpen.googleDriveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                      Open in Drive
                    </a>
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        )}
      </div>
  );
}