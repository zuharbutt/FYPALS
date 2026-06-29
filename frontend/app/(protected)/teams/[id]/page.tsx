'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UserPlus, Loader2, Crown, Plus, Trash2, Lock, Pencil, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { PhaseCard } from '@/components/progress/PhaseCard';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Team } from '@/types';

function formatDate(raw: string | null | undefined): string {
  if (!raw) return '—';
  try {
    return new Date(raw).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return String(raw); }
}
function formatDateTime(raw: string | null | undefined): string {
  if (!raw) return '—';
  try {
    return new Date(raw).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return String(raw); }
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function TeamWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const router = useRouter();
  const [team, setTeam]             = useState<Team | null>(null);
  const [project, setProject]       = useState<any>(null);
  const [advisor, setAdvisor]       = useState<any>(null);
  const [timelineDelivs, setTimelineDelivs] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  // Student invite — two-step: enter email → preview profile → confirm
  const [inviteStudentOpen, setInviteStudentOpen] = useState(false);
  const [inviteEmail, setInviteEmail]             = useState('');
  const [invitePreview, setInvitePreview]         = useState<any | null>(null); // fetched profile
  const [inviting, setInviting]                   = useState(false);            // loading either step

  // Advisor invite — same two-step flow
  const [inviteAdvisorOpen, setInviteAdvisorOpen] = useState(false);
  const [advisorEmail, setAdvisorEmail]           = useState('');
  const [advisorPreview, setAdvisorPreview]       = useState<any | null>(null);
  const [invitingAdvisor, setInvitingAdvisor]     = useState(false);

  // Leave team state
  const [leaveOpen, setLeaveOpen]                   = useState(false);
  const [transferOpen, setTransferOpen]             = useState(false);
  const [selectedNewLeader, setSelectedNewLeader]   = useState('');
  const [confirmTransferOpen, setConfirmTransferOpen] = useState(false);
  const [leavingTeam, setLeavingTeam]               = useState(false);

  // Edit project name/description
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [projName, setProjName]               = useState('');
  const [projDesc, setProjDesc]               = useState('');
  const [savingProj, setSavingProj]           = useState(false);

  const load = useCallback(async () => {
    try {
      const t = await api.get(`/teams/${id}`) as unknown as Team;
      setTeam(t);
      const proj = (t as any).project;
      if (proj?.id) {
        try {
          const progData = await api.get(`/projects/${proj.id}/progress`) as any;
          setProject(progData);
        } catch {
          setProject(proj);
        }
        // Load advisor profile if supervisor is assigned
        if (proj?.supervisorId) {
          try {
            const advisorData = await api.get(`/users/${proj.supervisorId}/profile`) as any;
            setAdvisor(advisorData);
          } catch {
            setAdvisor({ name: 'Advisor', id: proj.supervisorId });
          }
        } else {
          setAdvisor(null);
        }
        // Fetch deliverables for the timeline
        try {
          const delivData = await api.get(`/deliverables/project/${proj.id}`) as any;
          setTimelineDelivs(Array.isArray(delivData) ? delivData : []);
        } catch {
          setTimelineDelivs([]);
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const isLeader    = team?.leaderId === user?.id;
  const projectId   = (team as any)?.project?.id ?? project?.id;
  const hasSupervisor = !!(team as any)?.project?.supervisorId;

  // Step 1 — fetch student profile and show preview
  const fetchStudentPreview = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const result = await api.get(
          `/users/by-email?email=${encodeURIComponent(inviteEmail)}`
      ) as any;
      if (!result?.id) { toast.error('Student not found'); return; }
      setInvitePreview(result);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Student not found');
    } finally { setInviting(false); }
  };

  // Step 2 — confirm and send student invite
  const handleInviteStudent = async () => {
    if (!invitePreview?.id) return;
    setInviting(true);
    try {
      await api.post(`/teams/${id}/invite-student?targetUserId=${invitePreview.id}`);
      toast.success('Invitation sent!');
      setInviteStudentOpen(false);
      setInviteEmail('');
      setInvitePreview(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to send invite');
    } finally { setInviting(false); }
  };

  // Step 1 — fetch advisor profile and show preview
  const fetchAdvisorPreview = async () => {
    if (!advisorEmail.trim()) return;
    setInvitingAdvisor(true);
    try {
      const result = await api.get(
          `/users/by-email?email=${encodeURIComponent(advisorEmail)}`
      ) as any;
      if (!result?.id) { toast.error('Advisor not found'); return; }
      setAdvisorPreview(result);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Advisor not found');
    } finally { setInvitingAdvisor(false); }
  };

  // Step 2 — confirm and send advisor invite
  const handleInviteAdvisor = async () => {
    if (!advisorPreview?.id) return;
    setInvitingAdvisor(true);
    try {
      await api.post(`/teams/${id}/invite-advisor?advisorId=${advisorPreview.id}`);
      toast.success('Advisor invitation sent!');
      setInviteAdvisorOpen(false);
      setAdvisorEmail('');
      setAdvisorPreview(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to invite advisor');
    } finally { setInvitingAdvisor(false); }
  };

  // Member leaves team
  const handleLeaveTeam = async () => {
    setLeavingTeam(true);
    try {
      await api.post(`/teams/${id}/leave`);
      toast.success('You have left the team');
      setLeaveOpen(false);
      router.replace('/teams');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to leave team');
    } finally { setLeavingTeam(false); }
  };

  // Leader transfers leadership then leaves
  const handleTransferAndLeave = async () => {
    if (!selectedNewLeader) return;
    setLeavingTeam(true);
    try {
      await api.post(`/teams/${id}/transfer-and-leave?newLeaderId=${selectedNewLeader}`);
      toast.success('Leadership transferred. You have left the team.');
      setConfirmTransferOpen(false);
      setTransferOpen(false);
      router.replace('/teams');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to transfer leadership');
    } finally { setLeavingTeam(false); }
  };

  const handleDrop = async (memberId: number, memberName: string) => {
    if (!confirm(`Remove ${memberName} from the team?`)) return;
    try {
      await api.delete(`/teams/${id}/members/${memberId}`);
      toast.success('Member removed');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to drop member');
    }
  };

  const openEditProject = () => {
    setProjName(project?.projectName ?? (team as any)?.project?.projectName ?? '');
    setProjDesc(project?.description ?? (team as any)?.project?.description ?? '');
    setEditProjectOpen(true);
  };

  const saveProjectDetails = async () => {
    if (!projectId) return;
    setSavingProj(true);
    try {
      await api.put(`/projects/${projectId}/progress`, {
        description: projDesc,
        projectName: projName,
      });
      toast.success('Project updated');
      setEditProjectOpen(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to update project');
    } finally { setSavingProj(false); }
  };

  if (loading) {
    return (
        <div className="space-y-4 max-w-4xl">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
    );
  }
  if (!team) return <p className="text-muted-foreground">Team not found.</p>;

  return (
      <div className="max-w-5xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold">{team.teamName}</h1>
            <div className="flex gap-2 mt-1 flex-wrap">
              <Badge variant="secondary">{team.status}</Badge>
              {hasSupervisor && <Badge variant="default">Advisor Assigned</Badge>}
            </div>
          </div>
          {isLeader && (
              <div className="flex gap-2 flex-wrap">
                {/* Invite Student */}
                <Dialog open={inviteStudentOpen} onOpenChange={(o) => {
                  setInviteStudentOpen(o);
                  if (!o) { setInviteEmail(''); setInvitePreview(null); }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm"><UserPlus className="h-4 w-4 mr-1" />Invite Student</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{invitePreview ? 'Confirm Invite' : 'Invite a Student'}</DialogTitle>
                    </DialogHeader>

                    {/* Step 1 — email input */}
                    {!invitePreview ? (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label>Student Email</Label>
                            <Input
                                placeholder="student@example.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') fetchStudentPreview(); }}
                            />
                          </div>
                          <DialogFooter>
                            <Button onClick={fetchStudentPreview} disabled={inviting || !inviteEmail.trim()}>
                              {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Find Student
                            </Button>
                          </DialogFooter>
                        </div>
                    ) : (
                        /* Step 2 — profile preview + confirm */
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 p-4 border rounded-xl bg-muted/30">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-lg font-bold text-primary">
                              {invitePreview.name?.slice(0, 2).toUpperCase()}
                            </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold">{invitePreview.name}</p>
                              <p className="text-sm text-muted-foreground">{invitePreview.email}</p>
                              {invitePreview.skills && (
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                    Skills: {invitePreview.skills}
                                  </p>
                              )}
                              {invitePreview.gpa && (
                                  <p className="text-xs text-muted-foreground">GPA: {invitePreview.gpa}</p>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Send a team invitation to <strong>{invitePreview.name}</strong>?
                          </p>
                          <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setInvitePreview(null)}>
                              ← Back
                            </Button>
                            <Button onClick={handleInviteStudent} disabled={inviting}>
                              {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Send Invite
                            </Button>
                          </DialogFooter>
                        </div>
                    )}
                  </DialogContent>
                </Dialog>

                {/* Invite Advisor */}
                {!hasSupervisor && (
                    <Dialog open={inviteAdvisorOpen} onOpenChange={(o) => {
                      setInviteAdvisorOpen(o);
                      if (!o) { setAdvisorEmail(''); setAdvisorPreview(null); }
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <UserPlus className="h-4 w-4 mr-1" />Invite Advisor
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{advisorPreview ? 'Confirm Invite' : 'Invite an Advisor'}</DialogTitle>
                        </DialogHeader>

                        {/* Step 1 — email input */}
                        {!advisorPreview ? (
                            <div className="space-y-3">
                              <div className="space-y-1.5">
                                <Label>Advisor Email</Label>
                                <Input
                                    placeholder="advisor@university.edu"
                                    value={advisorEmail}
                                    onChange={(e) => setAdvisorEmail(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') fetchAdvisorPreview(); }}
                                />
                              </div>
                              <DialogFooter>
                                <Button onClick={fetchAdvisorPreview} disabled={invitingAdvisor || !advisorEmail.trim()}>
                                  {invitingAdvisor && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Find Advisor
                                </Button>
                              </DialogFooter>
                            </div>
                        ) : (
                            /* Step 2 — profile preview + confirm */
                            <div className="space-y-4">
                              <div className="flex items-center gap-4 p-4 border rounded-xl bg-muted/30">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-lg font-bold text-primary">
                                {advisorPreview.name?.slice(0, 2).toUpperCase()}
                              </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold">{advisorPreview.name}</p>
                                  <p className="text-sm text-muted-foreground">{advisorPreview.email}</p>
                                  {advisorPreview.department && (
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        Dept: {advisorPreview.department}
                                      </p>
                                  )}
                                  {advisorPreview.researchAreas && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        Research: {advisorPreview.researchAreas}
                                      </p>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Send an advisor invitation to <strong>{advisorPreview.name}</strong>?
                              </p>
                              <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={() => setAdvisorPreview(null)}>
                                  ← Back
                                </Button>
                                <Button onClick={handleInviteAdvisor} disabled={invitingAdvisor}>
                                  {invitingAdvisor && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Send Invite
                                </Button>
                              </DialogFooter>
                            </div>
                        )}
                      </DialogContent>
                    </Dialog>
                )}
              </div>
          )}
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
          </TabsList>

          {/* ── Overview tab ── */}
          <TabsContent value="overview" className="space-y-4">
            {/* Project card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Project Details</CardTitle>
                  {isLeader && (
                      <Button size="sm" variant="ghost" onClick={openEditProject}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                      </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Project Name</p>
                  <p className="text-sm font-medium mt-0.5">
                    {project?.projectName || (team as any)?.project?.projectName || (
                        <span className="text-muted-foreground italic">Not set yet{isLeader ? ' — click Edit to add' : ''}</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Description</p>
                  <p className="text-sm mt-0.5 whitespace-pre-line">
                    {project?.description || (team as any)?.project?.description || (
                        <span className="text-muted-foreground italic">No description yet{isLeader ? ' — click Edit to add' : ''}</span>
                    )}
                  </p>
                </div>
                {project?.completionPercentage !== undefined && (
                    <div className="pt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Overall Progress</span>
                        <span>{Math.round(project.completionPercentage)}%</span>
                      </div>
                      <Progress value={project.completionPercentage} />
                    </div>
                )}
              </CardContent>
            </Card>

            {/* Members card */}
            <Card>
              <CardHeader><CardTitle className="text-base">Team Members</CardTitle></CardHeader>
              <CardContent>
                {(team.members ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No members yet. Invite your first teammate!</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(team.members ?? []).map((m) => (
                          <div key={m.id} className="flex items-center gap-3 p-3 border rounded-lg">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="text-xs">
                                {m.userName?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="text-sm font-medium">{m.userName}</p>
                                {m.userId === team.leaderId && (
                                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs">{m.memberRole}</Badge>
                            </div>
                            {isLeader && m.userId !== user?.id && (
                                <Button variant="ghost" size="icon"
                                        className="h-7 w-7 text-destructive"
                                        onClick={() => handleDrop(m.userId, m.userName)}>
                                  <UserPlus className="h-4 w-4 rotate-45" />
                                </Button>
                            )}
                          </div>
                      ))}
                    </div>
                )}
              </CardContent>
            </Card>

            {/* Advisor card — shown when a supervisor is assigned */}
            {advisor && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Supervisor / Advisor</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{advisor.name}</p>
                        {advisor.email && (
                            <p className="text-xs text-muted-foreground">{advisor.email}</p>
                        )}
                        {advisor.department && (
                            <p className="text-xs text-muted-foreground">{advisor.department}</p>
                        )}
                      </div>
                      <Badge variant="secondary">Advisor</Badge>
                    </div>
                  </CardContent>
                </Card>
            )}
            {/* ── Leave Team button ── */}
            <Card className="border-destructive/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-destructive">Leave Team</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isLeader && (team?.members ?? []).filter((m: any) => m.userId !== user?.id).length > 0
                        ? 'You must transfer leadership to another member before leaving.'
                        : 'You will lose access to this team and its data.'}
                  </p>
                </div>
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (!isLeader) { setLeaveOpen(true); return; }
                      // Leader: only go to transfer flow if other members exist
                      const otherMembers = (team?.members ?? []).filter((m: any) => m.userId !== user?.id);
                      if (otherMembers.length === 0) {
                        setLeaveOpen(true); // sole member — simple leave
                      } else {
                        setTransferOpen(true);
                      }
                    }}
                >
                  Leave Team
                </Button>
              </CardContent>
            </Card>

            {/* ── Report 5: Project timeline — vertical card layout ── */}
            {(() => {
              const createdAt = (team as any).createdAt;
              if (!createdAt) return null;

              const fmt = (d: Date | string | null | undefined) => {
                if (!d) return '—';
                const date = typeof d === 'string' ? new Date(d) : d;
                if (isNaN(date.getTime())) return '—';
                return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              };

              const teamCreatedDate = new Date(createdAt);

              interface TLEvent {
                icon: string;
                label: string;
                sub?: string;
                dateLabel: string;
                dotColor: string;
                tag?: string;
                tagColor?: string;
              }

              const events: TLEvent[] = [];

              // 1 — Team formed
              events.push({
                icon: '👥',
                label: 'Team Formed',
                sub: `Led by ${(team as any).leaderName ?? 'Unknown'}`,
                dateLabel: fmt(teamCreatedDate),
                dotColor: '#a855f7',
                tag: 'Done',
                tagColor: '#a855f7',
              });

              // 2 — Advisor assigned
              if (advisor) {
                events.push({
                  icon: '🎓',
                  label: 'Advisor Assigned',
                  sub: advisor.name + (advisor.department ? ` · ${advisor.department}` : ''),
                  dateLabel: fmt(teamCreatedDate), // no exact timestamp stored
                  dotColor: '#3b82f6',
                  tag: 'Done',
                  tagColor: '#3b82f6',
                });
              }

              // 3 — Deliverable events (one row per submission / resubmission / approval)
              const STATUS_ICON: Record<string, string> = {
                PENDING:           '📋',
                SUBMITTED:         '📤',
                APPROVED:          '✅',
                CHANGES_REQUESTED: '🔄',
              };
              const STATUS_COLOR: Record<string, string> = {
                PENDING:           '#6b7280',
                SUBMITTED:         '#3b82f6',
                APPROVED:          '#22c55e',
                CHANGES_REQUESTED: '#f59e0b',
              };
              const STATUS_TAG: Record<string, string> = {
                PENDING:           'Pending',
                SUBMITTED:         'Submitted',
                APPROVED:          'Approved',
                CHANGES_REQUESTED: 'Changes Needed',
              };

              // Sort deliverables by deadline ascending
              const sortedDelivs = [...timelineDelivs].sort((a, b) => {
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
              });

              for (const d of sortedDelivs) {
                const color = STATUS_COLOR[d.status] ?? '#6b7280';

                // Only show deliverables that have actually been acted on
                // (submitted, resubmitted, approved, or changes requested)
                // PENDING and unsubmitted deliverables are silently skipped

                if (!d.submittedAt && d.status === 'PENDING') continue;

                // Submission events
                if (d.submittedAt) {
                  // Always show the original submission
                  events.push({
                    icon: '📤',
                    label: `Submitted: ${d.title}`,
                    sub: `Deadline: ${fmt(d.deadline)}`,
                    dateLabel: fmt(d.submittedAt),
                    dotColor: '#3b82f6',
                    tag: 'Submission',
                    tagColor: '#3b82f6',
                  });

                  // If a resubmission comment exists, also show the resubmission as a separate event
                  if (d.resubmissionComment) {
                    events.push({
                      icon: '🔁',
                      label: `Resubmitted: ${d.title}`,
                      sub: `Note: "${d.resubmissionComment.slice(0, 70)}${d.resubmissionComment.length > 70 ? '…' : ''}"`,
                      dateLabel: fmt(d.submittedAt),
                      dotColor: '#f59e0b',
                      tag: 'Resubmission',
                      tagColor: '#f59e0b',
                    });
                  }
                }

                // Advisor decision event (Approved or Changes Requested)
                if (d.status === 'APPROVED' || d.status === 'CHANGES_REQUESTED') {
                  events.push({
                    icon: STATUS_ICON[d.status],
                    label: `${STATUS_TAG[d.status]}: ${d.title}`,
                    sub: `Deadline was ${fmt(d.deadline)}`,
                    dateLabel: d.submittedAt ? fmt(d.submittedAt) : fmt(d.deadline),
                    dotColor: color,
                    tag: STATUS_TAG[d.status],
                    tagColor: color,
                  });
                }
              }

              // Final — Today
              events.push({
                icon: '📍',
                label: 'Today',
                sub: undefined,
                dateLabel: fmt(new Date()),
                dotColor: '#f59e0b',
              });

              return (
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-sm font-semibold mb-5">Project Timeline</p>
                      <div className="relative">
                        {/* Vertical connector line */}
                        <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-border" />

                        <div className="space-y-0">
                          {events.map((ev, i) => (
                              <div key={i} className="relative flex items-start gap-4 pb-5 last:pb-0">

                                {/* Icon dot */}
                                <div
                                    className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base shadow-sm border-2 bg-background"
                                    style={{ borderColor: ev.dotColor }}
                                >
                                  {ev.icon}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 rounded-lg border bg-muted/20 px-3 py-2.5 mt-0.5">
                                  <div className="flex items-start justify-between gap-2 flex-wrap">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold leading-snug">{ev.label}</p>
                                      {ev.sub && (
                                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{ev.sub}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {ev.tag && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap"
                                                style={{ backgroundColor: ev.tagColor + '22', color: ev.tagColor }}>
                                      {ev.tag}
                                    </span>
                                      )}
                                      <span className="text-[10px] text-muted-foreground whitespace-nowrap font-medium">
                                    {ev.dateLabel}
                                  </span>
                                    </div>
                                  </div>
                                </div>

                              </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
              );
            })()}
          </TabsContent>

          {/* ── Chat tab ── */}
          <TabsContent value="chat">
            <ChatWindow teamId={Number(id)} />
          </TabsContent>

          {/* ── Progress tab ── deliverable-based boxes ── */}
          <TabsContent value="progress">
            <DeliverableProgressTab
                projectId={projectId}
                teamId={Number(id)}
                isLeader={isLeader}
                members={team.members ?? []}
            />
          </TabsContent>

          {/* ── Deliverables tab ── */}
          <TabsContent value="deliverables">
            <DeliverablesTabContent projectId={projectId} />
          </TabsContent>

          {/* ── Disputes tab ── */}
          <TabsContent value="disputes">
            <DisputesTabContent teamId={Number(id)} isLeader={isLeader} />
          </TabsContent>
        </Tabs>

        {/* ── Member leave confirmation ── */}
        <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Leave Team?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to leave <strong>{team?.teamName}</strong>?
              You will lose access to the team and all its data.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setLeaveOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleLeaveTeam} disabled={leavingTeam}>
                {leavingTeam && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yes, Leave Team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Leader: choose new leader ── */}
        <Dialog open={transferOpen} onOpenChange={(o) => { setTransferOpen(o); if (!o) setSelectedNewLeader(''); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Transfer Leadership</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Select a member to become the new leader of <strong>{team?.teamName}</strong>.
              You will be removed from the team after transferring.
            </p>
            <div className="space-y-2">
              <Label>New Leader</Label>
              <Select value={selectedNewLeader} onValueChange={setSelectedNewLeader}>
                <SelectTrigger><SelectValue placeholder="Select a member..." /></SelectTrigger>
                <SelectContent>
                  {(team?.members ?? [])
                      .filter((m: any) => m.userId !== user?.id)
                      .map((m: any) => (
                          <SelectItem key={m.userId} value={String(m.userId)}>
                            {m.userName}
                          </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
              <Button
                  variant="destructive"
                  disabled={!selectedNewLeader}
                  onClick={() => { setTransferOpen(false); setConfirmTransferOpen(true); }}
              >
                Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Leader: final confirmation ── */}
        <Dialog open={confirmTransferOpen} onOpenChange={setConfirmTransferOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Confirm Transfer & Leave</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              You are about to make{' '}
              <strong>
                {team?.members?.find((m: any) => String(m.userId) === selectedNewLeader)?.userName ?? 'selected member'}
              </strong>{' '}
              the new leader of <strong>{team?.teamName}</strong> and leave the team.
              This cannot be undone.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setConfirmTransferOpen(false); setTransferOpen(true); }}>
                ← Back
              </Button>
              <Button variant="destructive" onClick={handleTransferAndLeave} disabled={leavingTeam}>
                {leavingTeam && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm & Leave
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit project dialog */}
        <Dialog open={editProjectOpen} onOpenChange={setEditProjectOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Project Details</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Project Name</Label>
                <Input value={projName} onChange={(e) => setProjName(e.target.value)}
                       placeholder="e.g. Smart Campus System" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={projDesc} onChange={(e) => setProjDesc(e.target.value)}
                          rows={4} placeholder="What is your FYP about?" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={saveProjectDetails} disabled={savingProj}>
                {savingProj && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}

// ─── Deliverable-based Progress Tab ──────────────────────────────────────────
// Each deliverable appears as a box.
// Phases are grouped per deliverable by matching the deliverable index
// to which phases were created while that deliverable was active.
// We use a backend-driven approach: fetch phases with their deliverableId if
// the backend provides it, otherwise fall back to assigning all phases to the
// currently active deliverable.

function DeliverableProgressTab({
                                  projectId, teamId, isLeader, members,
                                }: {
  projectId?: number;
  teamId: number;
  isLeader: boolean;
  members: any[];
}) {
  const [deliverables, setDeliverables]   = useState<any[]>([]);
  const [phasesMap, setPhasesMap]         = useState<Record<number, any[]>>({});
  const [overallPct, setOverallPct]       = useState(0);
  const [loading, setLoading]             = useState(true);

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    try {
      const [progData, delivData] = await Promise.all([
        api.get(`/projects/${projectId}/progress`) as any,
        api.get(`/deliverables/project/${projectId}`) as any,
      ]);

      setOverallPct(progData?.completionPercentage ?? 0);
      const delivList = Array.isArray(delivData) ? delivData : [];
      setDeliverables(delivList);

      const allPhases = await api.get(`/projects/${projectId}/phases`) as any;
      const phaseList = Array.isArray(allPhases) ? allPhases : [];

      // Enrich phases with checkpoints
      const enriched = await Promise.all(
          phaseList.map(async (ph: any) => {
            try {
              const cps = await api.get(`/phases/${ph.id}/checkpoints`) as any;
              return { ...ph, checkpoints: Array.isArray(cps) ? cps : [] };
            } catch { return { ...ph, checkpoints: [] }; }
          })
      );

      // Build phases map: initialise all deliverable buckets
      const newMap: Record<number, any[]> = {};
      delivList.forEach((d: any) => { newMap[d.id] = []; });

      // If phases carry a deliverableId field (backend support), use it directly.
      const hasDeliverableId = enriched.some((ph: any) => ph.deliverableId != null);

      if (hasDeliverableId) {
        enriched.forEach((ph: any) => {
          const did = ph.deliverableId != null ? Number(ph.deliverableId) : null;
          if (did != null && newMap[did]) {
            newMap[did].push(ph);
          } else {
            const active = delivList.find((d: any) => d.status !== 'APPROVED') ?? delivList[delivList.length - 1];
            if (active) newMap[active.id].push(ph);
          }
        });
      } else {
        const approvedDelivs = delivList.filter((d: any) => d.status === 'APPROVED');
        const activeDeliverable = delivList.find((d: any) => d.status !== 'APPROVED')
            ?? delivList[delivList.length - 1];
        const sortedPhases = [...enriched].sort((a: any, b: any) => a.id - b.id);
        if (approvedDelivs.length === 0 || delivList.length === 1) {
          if (activeDeliverable) newMap[activeDeliverable.id] = sortedPhases;
        } else {
          const totalDelivsShown = delivList.length;
          const phasesPerDeliv = Math.floor(sortedPhases.length / totalDelivsShown);
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
    } catch (err: any) {
      toast.error('Failed to load progress');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  if (!projectId) {
    return <p className="text-sm text-muted-foreground py-4">No project yet.</p>;
  }
  if (loading) return <Skeleton className="h-48 w-full" />;

  const callerRole = isLeader ? 'LEADER' : 'MEMBER';

  return (
      <div className="space-y-4">
        {/* ── Circular overall progress ── */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              {/* Ring */}
              <div className="relative shrink-0">
                <svg width="120" height="120" viewBox="0 0 128 128">
                  <circle cx="64" cy="64" r="54" fill="none" stroke="currentColor"
                          strokeWidth="10" className="text-muted/30" />
                  <circle cx="64" cy="64" r="54" fill="none"
                          stroke={overallPct >= 100 ? "#22c55e" : "#a855f7"}
                          strokeWidth="10" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 54}
                          strokeDashoffset={2 * Math.PI * 54 - (overallPct / 100) * 2 * Math.PI * 54}
                          transform="rotate(-90 64 64)"
                          style={{ transition: "stroke-dashoffset 0.8s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold" style={{ color: overallPct >= 100 ? "#22c55e" : "#a855f7" }}>
                    {Math.round(overallPct)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">done</span>
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm">Overall Project Progress</p>
                {overallPct >= 100 && <p className="text-sm text-green-600 dark:text-green-400 mt-1">🎉 All done!</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Checkpoints-per-member vertical bar chart ── */}
        {(() => {
          // Build lookup: assignedToName → { total, done }
          const allCps = Object.values(phasesMap).flat().flatMap((ph: any) => ph.checkpoints ?? []);
          const cpMap = new Map<string, { total: number; done: number }>();
          for (const cp of allCps) {
            const name = cp.assignedToName ?? 'Unassigned';
            const e = cpMap.get(name) ?? { total: 0, done: 0 };
            e.total += 1;
            if (cp.status === 'COMPLETE') e.done += 1;
            cpMap.set(name, e);
          }

          // ALL members always shown (zero if no checkpoints assigned)
          const data = members.map((m: any) => {
            const e = cpMap.get(m.userName) ?? { total: 0, done: 0 };
            return { name: m.userName as string, total: e.total, done: e.done };
          });
          // Also include 'Unassigned' bucket if it exists
          if (cpMap.has('Unassigned')) {
            const e = cpMap.get('Unassigned')!;
            data.push({ name: 'Unassigned', total: e.total, done: e.done });
          }

          // Chart dimensions — compact
          const CHART_W    = 420;
          const CHART_H    = 140;
          const PAD_LEFT   = 28;
          const PAD_BOTTOM = 36;
          const PAD_TOP    = 20;
          const PAD_RIGHT  = 8;
          const plotW = CHART_W - PAD_LEFT - PAD_RIGHT;
          const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;
          const maxVal = Math.max(...data.map(d => d.total), 1);

          // Y-axis ticks — at most 4 nice integer steps
          const step = Math.ceil(maxVal / 4) || 1;
          const yTicks: number[] = [];
          for (let v = 0; v <= maxVal; v += step) yTicks.push(v);
          if (yTicks[yTicks.length - 1] < maxVal) yTicks.push(yTicks[yTicks.length - 1] + step);
          const yMax = yTicks[yTicks.length - 1];

          const barW    = Math.min(40, (plotW / data.length) * 0.5);
          const colW    = plotW / data.length;

          const yPos = (val: number) => PAD_TOP + plotH - (val / yMax) * plotH;

          return (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold">Checkpoints by Member</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{backgroundColor:'#a855f7'}}/> Done</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-muted"/> Total</span>
                    </div>
                  </div>
                  <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="overflow-visible max-w-full">
                    {/* Subtle horizontal gridlines only */}
                    {yTicks.map((v) => {
                      const y = yPos(v);
                      return (
                          <g key={v}>
                            <line x1={PAD_LEFT} y1={y} x2={PAD_LEFT + plotW} y2={y}
                                  stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="3 3" />
                            <text x={PAD_LEFT - 5} y={y + 3.5} textAnchor="end" fontSize="9"
                                  fill="#888" style={{fontFamily:'inherit'}}>{v}</text>
                          </g>
                      );
                    })}
                    {/* Baseline only */}
                    <line x1={PAD_LEFT} y1={PAD_TOP + plotH} x2={PAD_LEFT + plotW} y2={PAD_TOP + plotH}
                          stroke="currentColor" strokeOpacity="0.2" strokeWidth="1"/>
                    {/* Bars */}
                    {data.map((d, i) => {
                      const cx     = PAD_LEFT + i * colW + colW / 2;
                      const totalH = (d.total / yMax) * plotH;
                      const doneH  = (d.done  / yMax) * plotH;
                      const totalY = yPos(d.total);
                      const doneY  = yPos(d.done);
                      const label  = d.name.length > 12 ? d.name.slice(0, 11) + '…' : d.name;
                      return (
                          <g key={d.name}>
                            {/* Total bar — rounded pill, subtle */}
                            <rect x={cx - barW/2} y={d.total > 0 ? totalY : PAD_TOP + plotH}
                                  width={barW} height={d.total > 0 ? totalH : 0}
                                  rx="5" fill="currentColor" fillOpacity="0.12"/>
                            {/* Done bar — purple gradient feel */}
                            {d.done > 0 && (
                                <rect x={cx - barW/2} y={doneY} width={barW} height={doneH}
                                      rx="5" fill="url(#purpleGrad)"
                                      style={{transition:'height 0.7s cubic-bezier(.4,0,.2,1)'}}/>
                            )}
                            {/* Count badge above bar */}
                            <text x={cx} y={(d.total > 0 ? totalY : PAD_TOP + plotH) - 5}
                                  textAnchor="middle" fontSize="9.5" fontWeight="600"
                                  fill={d.total > 0 ? '#a855f7' : '#888'}
                                  style={{fontFamily:'inherit'}}>
                              {d.total > 0 ? `${d.done}/${d.total}` : '0'}
                            </text>
                            {/* Member name */}
                            <text x={cx} y={PAD_TOP + plotH + 13}
                                  textAnchor="middle" fontSize="10.5"
                                  fill="currentColor" style={{fontFamily:'inherit'}}>{label}</text>
                          </g>
                      );
                    })}
                    {/* Purple gradient def */}
                    <defs>
                      <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c084fc"/>
                        <stop offset="100%" stopColor="#7e22ce"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </CardContent>
              </Card>
          );
        })()}

        {deliverables.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <p className="font-medium">No deliverables assigned yet.</p>
              <p className="text-sm">Your advisor will create deliverables. Once the first one is assigned, you can add phases and checkpoints here.</p>
            </div>
        )}

        {deliverables.map((d: any, idx: number) => {
          const isApproved = d.status === 'APPROVED';
          const firstNonApprovedIdx = deliverables.findIndex((dd: any) => dd.status !== 'APPROVED');
          const isActive = !isApproved && idx === firstNonApprovedIdx;
          // Show approved deliverables and the current active one.
          // Hide future deliverables that haven't become active yet.
          const isVisible = isApproved || isActive || idx <= firstNonApprovedIdx;

          if (!isVisible) return null;

          const phases = phasesMap[d.id] ?? [];

          return (
              <DeliverableProgressBox
                  key={d.id}
                  deliverable={d}
                  phases={phases}
                  isActive={isActive}
                  isLeader={isLeader}
                  callerRole={callerRole}
                  members={members}
                  projectId={projectId}
                  onRefresh={load}
              />
          );
        })}
      </div>
  );
}

// ─── Single deliverable progress box ─────────────────────────────────────────

function DeliverableProgressBox({
                                  deliverable, phases, isActive, isLeader, callerRole, members, projectId, onRefresh,
                                }: {
  deliverable: any;
  phases: any[];
  isActive: boolean;
  isLeader: boolean;
  callerRole: string;
  members: any[];
  projectId: number;
  onRefresh: () => void;
}) {
  const [addPhaseOpen, setAddPhaseOpen] = useState(false);
  const [addCpOpen, setAddCpOpen]       = useState<number | null>(null);
  const [phaseForm, setPhaseForm]       = useState({ name: '', startDate: '', endDate: '' });
  const [cpForm, setCpForm]             = useState({ title: '', deadline: '', assignedToId: '' });

  const isApproved = deliverable.status === 'APPROVED';
  const locked     = isApproved || !isActive;

  // Compute checkpoint counts for inline progress bars
  const delivDone  = phases.flatMap((p: any) => p.checkpoints ?? []).filter((c: any) => c.status === 'COMPLETE').length;
  const delivTotal = phases.flatMap((p: any) => p.checkpoints ?? []).length;

  const addPhase = async () => {
    if (!phaseForm.name.trim()) { toast.error('Phase name required'); return; }
    if (!phaseForm.startDate || !phaseForm.endDate) { toast.error('Dates required'); return; }
    if (phaseForm.startDate >= phaseForm.endDate) { toast.error('Start must be before end'); return; }
    try {
      await api.post(`/projects/${projectId}/phases`, { ...phaseForm, deliverableId: deliverable.id });
      toast.success('Phase added');
      setAddPhaseOpen(false);
      setPhaseForm({ name: '', startDate: '', endDate: '' });
      onRefresh();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Failed'); }
  };

  const addCheckpoint = async (phaseId: number) => {
    if (!cpForm.title.trim()) { toast.error('Title required'); return; }
    try {
      await api.post(`/phases/${phaseId}/checkpoints`, {
        title: cpForm.title,
        deadline: cpForm.deadline || undefined,
        assignedToId: (cpForm.assignedToId && cpForm.assignedToId !== "UNASSIGNED") ? cpForm.assignedToId : undefined,
      });
      toast.success('Checkpoint added');
      setAddCpOpen(null);
      setCpForm({ title: '', deadline: '', assignedToId: '' });
      onRefresh();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Failed'); }
  };

  const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-600',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    APPROVED: 'bg-green-100 text-green-700',
    CHANGES_REQUESTED: 'bg-red-100 text-red-700',
  };

  return (
      <div className={`border rounded-xl overflow-hidden transition-all ${
          locked ? 'opacity-60' : 'shadow-sm'
      }`}>
        {/* Deliverable header */}
        <div className={`px-4 py-3 flex items-center justify-between ${
            isApproved ? 'bg-green-50 border-b border-green-100' :
                isActive   ? 'bg-primary/5 border-b border-primary/10' :
                    'bg-muted/30 border-b'
        }`}>
          <div className="flex items-center gap-2">
            {isApproved && <Lock className="h-4 w-4 text-green-600" />}
            <div>
              <p className="font-semibold text-sm">{deliverable.title}</p>
              <p className="text-xs text-muted-foreground">Deadline: {formatDate(deliverable.deadline)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[deliverable.status] ?? 'bg-gray-100'}`}>
            {deliverable.status?.replace('_', ' ')}
          </span>
            {isApproved && (
                <span className="text-xs text-green-600 font-medium">✓ Completed</span>
            )}
          </div>
        </div>
        {/* Deliverable inline progress bar */}
        {delivTotal > 0 && (
            <div className="px-4 py-2 border-b border-muted/30">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>{delivDone}/{delivTotal} checkpoints</span>
                <span>{Math.round((delivDone / delivTotal) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                     style={{ width: `${Math.round((delivDone / delivTotal) * 100)}%`, backgroundColor: isApproved ? '#22c55e' : '#a855f7' }} />
              </div>
            </div>
        )}

        {/* Phases & Checkpoints inside this deliverable */}
        <div className={`p-4 space-y-3 ${locked ? 'pointer-events-none select-none' : ''}`}>
          {phases.length === 0 && !locked && (
              <p className="text-sm text-muted-foreground italic">
                No phases yet. {isLeader ? 'Add a phase to get started.' : 'The team leader can add phases here.'}
              </p>
          )}
          {phases.length === 0 && locked && (
              <p className="text-sm text-muted-foreground italic">No phases were added for this deliverable.</p>
          )}

          {phases.map((phase: any) => (
              <div key={phase.id} className="space-y-2">
                <div className="text-xs text-muted-foreground px-1">
                  {formatDate(phase.startDate)} → {formatDate(phase.endDate)}
                </div>
                <PhaseCard
                    phase={phase}
                    isLeader={isLeader && !locked}
                    callerRole={locked ? 'VIEWER' : callerRole}
                    onStatusChange={onRefresh}
                    readOnly={locked}
                />
                {/* Phase inline progress bar */}
                {(() => {
                  const pd = (phase.checkpoints ?? []).filter((c: any) => c.status === 'COMPLETE').length;
                  const pt = (phase.checkpoints ?? []).length;
                  if (pt === 0) return null;
                  return (
                      <div className="px-1 pb-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                          <span>{pd}/{pt} checkpoints</span>
                          <span>{Math.round((pd / pt) * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                               style={{ width: `${Math.round((pd / pt) * 100)}%`, backgroundColor: pd === pt ? '#22c55e' : '#a855f7' }} />
                        </div>
                      </div>
                  );
                })()}
                {isLeader && !locked && (
                    <Dialog open={addCpOpen === phase.id} onOpenChange={(o) => setAddCpOpen(o ? phase.id : null)}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-xs h-7">
                          <Plus className="h-3 w-3 mr-1" />Add Checkpoint to {phase.name}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Add Checkpoint</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <div><Label>Title *</Label><Input value={cpForm.title} onChange={(e) => setCpForm({ ...cpForm, title: e.target.value })} /></div>
                          <div><Label>Deadline</Label><Input type="date" value={cpForm.deadline} onChange={(e) => setCpForm({ ...cpForm, deadline: e.target.value })} /></div>
                          <div>
                            <Label>Assign To (optional)</Label>
                            <Select value={cpForm.assignedToId} onValueChange={(v) => setCpForm({ ...cpForm, assignedToId: v })}>
                              <SelectTrigger><SelectValue placeholder="Select member..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                                {members.map((m: any) => (
                                    <SelectItem key={m.userId} value={String(m.userId)}>{m.userName}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter><Button onClick={() => addCheckpoint(phase.id)}>Add Checkpoint</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                )}
              </div>
          ))}

          {isLeader && !locked && (
              <Dialog open={addPhaseOpen} onOpenChange={setAddPhaseOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-1" />Add Phase
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Phase</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Phase Name *</Label><Input value={phaseForm.name} onChange={(e) => setPhaseForm({ ...phaseForm, name: e.target.value })} /></div>
                    <div><Label>Start Date *</Label><Input type="date" value={phaseForm.startDate} onChange={(e) => setPhaseForm({ ...phaseForm, startDate: e.target.value })} /></div>
                    <div><Label>End Date *</Label><Input type="date" value={phaseForm.endDate} onChange={(e) => setPhaseForm({ ...phaseForm, endDate: e.target.value })} /></div>
                  </div>
                  <DialogFooter><Button onClick={addPhase}>Add Phase</Button></DialogFooter>
                </DialogContent>
              </Dialog>
          )}
        </div>
      </div>
  );
}

// ─── Deliverables Tab (submission) ───────────────────────────────────────────

function DeliverablesTabContent({ projectId }: { projectId?: number }) {
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  // submitOpen tracks which deliverable's submit dialog is open
  const [submitOpen, setSubmitOpen]     = useState<number | null>(null);
  const [driveLink, setDriveLink]       = useState('');
  // resubmit comment for CHANGES_REQUESTED
  const [resubmitComment, setResubmitComment] = useState('');
  // viewLink dialog: show link + any resubmission comment
  const [viewOpen, setViewOpen]         = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    try {
      const data = await api.get(`/deliverables/project/${projectId}`) as any;
      setDeliverables(Array.isArray(data) ? data : []);
    } catch {} finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const openSubmit = (delivId: number) => {
    setDriveLink('');
    setResubmitComment('');
    setSubmitOpen(delivId);
  };

  const submit = async (deliv: any) => {
    if (!driveLink.trim()) { toast.error('Please enter a Google Drive link'); return; }
    const isDriveLink = driveLink.trim().match(/^https:\/\/(drive|docs)\.google\.com\/.+/);
    if (!isDriveLink) { toast.error('Please enter a valid Google Drive link (must start with https://drive.google.com or https://docs.google.com)'); return; }
    try {
      const payload: any = { googleDriveLink: driveLink };
      if (deliv.status === 'CHANGES_REQUESTED' && resubmitComment.trim()) {
        payload.resubmissionComment = resubmitComment.trim();
      }
      await api.post(`/deliverables/${deliv.id}/submit`, payload);
      toast.success(deliv.status === 'CHANGES_REQUESTED' ? 'Resubmitted!' : 'Deliverable submitted!');
      setSubmitOpen(null);
      setDriveLink('');
      setResubmitComment('');
      load();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Failed'); }
  };

  if (!projectId) return <p className="text-sm text-muted-foreground py-4">No project yet.</p>;
  if (loading) return <Skeleton className="h-48 w-full" />;

  const STATUS_BADGE: Record<string, string> = {
    PENDING: 'secondary', SUBMITTED: 'default', APPROVED: 'default', CHANGES_REQUESTED: 'destructive',
  };

  return (
      <div className="space-y-3">
        {deliverables.length === 0 && (
            <p className="text-sm text-muted-foreground">No deliverables assigned yet. Your advisor will create them.</p>
        )}
        {deliverables.map((d: any) => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{d.title}</p>
                    <p className="text-xs text-muted-foreground">Deadline: {formatDate(d.deadline)}</p>
                    {d.submittedAt && (
                        <p className="text-xs text-muted-foreground">Submitted: {formatDateTime(d.submittedAt)}</p>
                    )}

                    {/* View Submission button (opens popup instead of raw link) */}
                    {d.googleDriveLink && (
                        <button
                            type="button"
                            onClick={() => setViewOpen(d)}
                            className="text-xs text-primary underline hover:no-underline"
                        >
                          View Submission
                        </button>
                    )}

                    {/* View Resubmission button if there's a resubmission comment */}
                    {d.resubmissionComment && d.resubmissionGoogleDriveLink && (
                        <button
                            type="button"
                            onClick={() => setViewOpen({ ...d, showResubmission: true })}
                            className="text-xs text-primary underline hover:no-underline block"
                        >
                          View Resubmission
                        </button>
                    )}

                    <Badge variant={STATUS_BADGE[d.status] as any} className="mt-1">{d.status}</Badge>
                  </div>

                  {(d.status === 'PENDING' || d.status === 'CHANGES_REQUESTED') && (
                      <Button
                          size="sm"
                          variant={d.status === 'CHANGES_REQUESTED' ? 'destructive' : 'default'}
                          onClick={() => openSubmit(d.id)}
                      >
                        {d.status === 'CHANGES_REQUESTED' ? 'Resubmit' : 'Submit'}
                      </Button>
                  )}
                </div>

                {d.feedback && (
                    <div className="p-3 rounded-md bg-muted/50 border text-sm space-y-1 mt-2">
                      <p className="text-xs font-medium text-muted-foreground">Advisor Feedback</p>
                      <p>{d.feedback.comment}</p>
                      <Badge variant={d.feedback.decision === 'APPROVED' ? 'default' : 'destructive'}>
                        {d.feedback.decision}
                      </Badge>
                    </div>
                )}
                {(d.staffComments ?? []).map((c: any) => (
                    <div key={c.id} className="p-3 rounded-md border border-blue-300 text-sm space-y-1 mt-2" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
                      <p className="text-xs font-medium" style={{ color: '#2563eb' }}>FYP Staff Comment</p>
                      <p style={{ color: '#111827' }}>{c.comment}</p>
                    </div>
                ))}
              </CardContent>
            </Card>
        ))}

        {/* Submit / Resubmit dialog */}
        {submitOpen !== null && (() => {
          const deliv = deliverables.find((d) => d.id === submitOpen);
          if (!deliv) return null;
          const isResubmit = deliv.status === 'CHANGES_REQUESTED';
          return (
              <Dialog open={true} onOpenChange={(o) => { if (!o) setSubmitOpen(null); }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{isResubmit ? 'Resubmit Deliverable' : 'Submit Deliverable'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Google Drive Link *</Label>
                      <Input
                          placeholder="https://drive.google.com/..."
                          value={driveLink}
                          onChange={(e) => setDriveLink(e.target.value)}
                      />
                    </div>
                    {isResubmit && (
                        <div>
                          <Label>Resubmission Comment <span className="text-muted-foreground text-xs">(explain what changed)</span></Label>
                          <Textarea
                              placeholder="Describe what you changed or fixed..."
                              value={resubmitComment}
                              onChange={(e) => setResubmitComment(e.target.value)}
                              rows={3}
                          />
                        </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSubmitOpen(null)}>Cancel</Button>
                    <Button onClick={() => submit(deliv)}>
                      {isResubmit ? 'Resubmit' : 'Submit'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
          );
        })()}

        {/* View Submission popup */}
        {viewOpen && (
            <Dialog open={true} onOpenChange={(o) => { if (!o) setViewOpen(null); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {viewOpen.showResubmission ? 'Resubmission' : 'Submission'} — {viewOpen.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Google Drive Link</p>
                    <a
                        href={viewOpen.showResubmission ? viewOpen.resubmissionGoogleDriveLink : viewOpen.googleDriveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary underline break-all"
                    >
                      {viewOpen.showResubmission ? viewOpen.resubmissionGoogleDriveLink : viewOpen.googleDriveLink}
                    </a>
                  </div>
                  {viewOpen.showResubmission && viewOpen.resubmissionComment && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Resubmission Comment</p>
                        <p className="text-sm">{viewOpen.resubmissionComment}</p>
                      </div>
                  )}
                  {!viewOpen.showResubmission && viewOpen.submittedAt && (
                      <p className="text-xs text-muted-foreground">Submitted: {formatDateTime(viewOpen.submittedAt)}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setViewOpen(null)}>Close</Button>
                  <Button asChild>
                    <a
                        href={viewOpen.showResubmission ? viewOpen.resubmissionGoogleDriveLink : viewOpen.googleDriveLink}
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

// ─── Disputes Tab ─────────────────────────────────────────────────────────────

function DisputesTabContent({ teamId, isLeader }: { teamId: number; isLeader: boolean }) {
  const [disputes, setDisputes]       = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [raiseOpen, setRaiseOpen]     = useState(false);
  const [form, setForm]               = useState({ targetItem: '', reason: '' });
  const [rejectOpen, setRejectOpen]   = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [pollOpen, setPollOpen]       = useState<number | null>(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions]   = useState<string[]>(['', '']);
  const [pollDeadline, setPollDeadline] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.get(`/disputes/team/${teamId}/all`) as any;
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const withPolls = await Promise.all(
          list.map(async (d: any) => {
            if (d.status === 'OPEN' || d.status === 'RESOLVED') {
              try {
                const poll = await api.get(`/disputes/${d.id}/poll`) as any;
                const p = poll?.data ?? poll;
                const opts = (p?.options ?? '').replace(/^\[|\]$/g, '').split(/[,\n]/).map((o: string) => o.trim()).filter(Boolean);
                try {
                  const results = await api.get(`/disputes/${d.id}/polls/${p.id}/results`) as any;
                  const r = results?.data ?? results ?? {};
                  const total = Object.values(r).reduce((a: any, b: any) => a + b, 0) as number;
                  return { ...d, poll: { ...p, options: opts, results: opts.map((opt: string) => ({ option: opt, count: r[opt] ?? 0, percent: total > 0 ? Math.round(((r[opt] ?? 0) / total) * 100) : 0 })) } };
                } catch { return { ...d, poll: { ...p, options: opts } }; }
              } catch { return d; }
            }
            return d;
          })
      );
      setDisputes(withPolls);
    } catch {} finally { setLoading(false); }
  }, [teamId]);

  useEffect(() => { load(); }, [load]);

  const raiseDispute = async () => {
    if (!form.targetItem.trim() || !form.reason.trim()) { toast.error('All fields required'); return; }
    try {
      await api.post('/disputes', { teamId, ...form });
      toast.success('Dispute raised');
      setRaiseOpen(false);
      setForm({ targetItem: '', reason: '' });
      load();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Failed'); }
  };

  const accept = async (id: number) => {
    try { await api.post(`/disputes/${id}/accept`); toast.success('Accepted'); load(); }
    catch (err: any) { toast.error(err?.response?.data?.message ?? 'Failed'); }
  };

  const reject = async (id: number) => {
    if (!rejectReason.trim()) { toast.error('Reason required'); return; }
    try {
      await api.post(`/disputes/${id}/reject`, { rejectionReason: rejectReason });
      toast.success('Rejected');
      setRejectOpen(null);
      setRejectReason('');
      load();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Failed'); }
  };

  const createPoll = async (disputeId: number) => {
    const valid = pollOptions.filter(o => o.trim());
    if (!pollQuestion.trim() || valid.length < 2 || !pollDeadline) {
      toast.error('Question, at least 2 options, and deadline required');
      return;
    }
    try {
      await api.post(`/disputes/${disputeId}/poll`, { question: pollQuestion, options: valid.join('\n'), deadline: pollDeadline });
      toast.success('Poll created');
      setPollOpen(null);
      setPollQuestion(''); setPollOptions(['', '']); setPollDeadline('');
      load();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Failed'); }
  };

  const vote = async (disputeId: number, pollId: number, option: string) => {
    try { await api.post(`/disputes/${disputeId}/polls/${pollId}/vote`, { chosenOption: option }); toast.success('Voted!'); load(); }
    catch (err: any) { toast.error(err?.response?.data?.message ?? 'Already voted or error'); }
  };

  const resolve = async (id: number) => {
    try { await api.post(`/disputes/${id}/resolve`); toast.success('Resolved'); load(); }
    catch (err: any) { toast.error(err?.response?.data?.message ?? 'Failed'); }
  };

  if (loading) return <Skeleton className="h-48 w-full" />;

  return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Disputes</h3>
          <Dialog open={raiseOpen} onOpenChange={setRaiseOpen}>
            <DialogTrigger asChild><Button size="sm" variant="outline">Raise Dispute</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Raise a Dispute</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>What is this about? *</Label><Input value={form.targetItem} onChange={(e) => setForm({ ...form, targetItem: e.target.value })} placeholder="e.g. Task assignment" /></div>
                <div><Label>Reason *</Label><Textarea value={form.reason} onChange={(e: any) => setForm({ ...form, reason: e.target.value })} rows={4} /></div>
              </div>
              <DialogFooter><Button onClick={raiseDispute}>Submit</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {disputes.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <p className="text-lg">🤝</p>
              <p className="font-medium">No disputes raised.</p>
              <p className="text-sm">The team is getting along well!</p>
            </div>
        )}

        {disputes.map((d: any) => (
            <Card key={d.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{d.targetItem}</p>
                    <p className="text-xs text-muted-foreground">Raised by {d.raisedByName}</p>
                    <p className="text-sm mt-1">{d.reason}</p>
                  </div>
                  <Badge variant="secondary">{d.status}</Badge>
                </div>

                {d.status === 'REJECTED' && d.rejectionReason && (
                    <p className="text-xs text-muted-foreground border-t pt-2">❌ Rejected: {d.rejectionReason}</p>
                )}
                {d.status === 'RESOLVED' && (
                    <div className="p-3 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-sm mt-2">
                      <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">✅ Resolution</p>
                      <p className="text-green-900 dark:text-green-200">
                        {d.winningOption ?? 'Dispute resolved'}
                      </p>
                    </div>
                )}

                {isLeader && d.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => accept(d.id)}>Accept</Button>
                      <Dialog open={rejectOpen === d.id} onOpenChange={(o) => { setRejectOpen(o ? d.id : null); setRejectReason(''); }}>
                        <DialogTrigger asChild><Button size="sm" variant="outline">Reject</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Reject Dispute</DialogTitle></DialogHeader>
                          <div className="space-y-2">
                            <Label>Reason for Rejection *</Label>
                            <Textarea value={rejectReason} onChange={(e: any) => setRejectReason(e.target.value)} rows={3} />
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setRejectOpen(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={() => reject(d.id)}>Reject</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                )}

                {isLeader && d.status === 'OPEN' && !d.poll && (
                    <Dialog open={pollOpen === d.id} onOpenChange={(o) => { setPollOpen(o ? d.id : null); if (o) { setPollQuestion(''); setPollOptions(['', '']); setPollDeadline(''); } }}>
                      <DialogTrigger asChild><Button size="sm">Create Poll</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Create Poll</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <div><Label>Question *</Label><Input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} /></div>
                          <div className="space-y-2">
                            <Label>Options *</Label>
                            {pollOptions.map((opt, idx) => (
                                <div key={idx} className="flex gap-2">
                                  <Input value={opt} placeholder={`Option ${idx + 1}`}
                                         onChange={(e) => { const u = [...pollOptions]; u[idx] = e.target.value; setPollOptions(u); }} />
                                  {pollOptions.length > 2 && (
                                      <Button size="icon" variant="ghost" className="shrink-0 text-destructive"
                                              onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                  )}
                                </div>
                            ))}
                            <Button size="sm" variant="ghost" onClick={() => setPollOptions([...pollOptions, ''])}>
                              <Plus className="h-4 w-4 mr-1" />Add Option
                            </Button>
                          </div>
                          <div><Label>Voting Deadline *</Label><Input type="datetime-local" value={pollDeadline} onChange={(e) => setPollDeadline(e.target.value)} /></div>
                        </div>
                        <DialogFooter><Button onClick={() => createPoll(d.id)}>Create Poll</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                )}

                {d.poll && (
                    <div className="space-y-2 border-t pt-3">
                      <p className="font-medium text-sm">{d.poll.question}</p>
                      {(d.poll.options ?? []).map((opt: string) => {
                        const r = d.poll.results?.find((x: any) => x.option === opt);
                        return (
                            <div key={opt} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => vote(d.id, d.poll.id, opt)}>{opt}</Button>
                                {r && <span className="text-xs text-muted-foreground">{r.count} vote{r.count !== 1 ? 's' : ''} ({r.percent}%)</span>}
                              </div>
                              {r?.count > 0 && <div className="h-1.5 bg-muted rounded-full overflow-hidden ml-1"><div className="h-full bg-primary" style={{ width: `${r.percent}%` }} /></div>}
                            </div>
                        );
                      })}
                      {isLeader && <Button size="sm" variant="secondary" className="mt-2" onClick={() => resolve(d.id)}>Resolve Dispute</Button>}
                    </div>
                )}
              </CardContent>
            </Card>
        ))}
      </div>
  );
}