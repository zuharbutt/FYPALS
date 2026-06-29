'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Team, Deliverable } from '@/types';

const STATUS_VARIANTS: Record<string, any> = {
  PENDING: 'secondary',
  SUBMITTED: 'info',
  APPROVED: 'success',
  CHANGES_REQUESTED: 'warning',
};

export default function DeliverablesPage() {
  const { id: teamId } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [team, setTeam] = useState<Team | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen]         = useState<number | null>(null);
  const [driveLink, setDriveLink]           = useState('');
  const [resubComment, setResubComment]     = useState('');
  const [submitting, setSubmitting]         = useState(false);
  const [viewOpen, setViewOpen]             = useState<any | null>(null);

  const load = async () => {
    try {
      const t = await api.get(`/teams/${teamId}`) as unknown as Team;
      setTeam(t);
      if (t.project?.id) {
        const data = await api.get(`/deliverables/project/${t.project.id}`) as unknown as Deliverable[];
        setDeliverables(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load deliverables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [teamId]);

  const submit = async (id: number, isResubmission = false) => {
    if (!driveLink.trim()) { toast.error('Please enter a Google Drive link'); return; }
    const isDriveLink = driveLink.trim().match(/^https:\/\/(drive|docs)\.google\.com\/.+/);
    if (!isDriveLink) { toast.error('Please enter a valid Google Drive link (must start with https://drive.google.com or https://docs.google.com)'); return; }
    setSubmitting(true);
    try {
      const payload: any = { googleDriveLink: driveLink };
      if (isResubmission && resubComment.trim()) {
        payload.resubmissionComment = resubComment.trim();
      }
      await api.post(`/deliverables/${id}/submit`, payload);
      toast.success(isResubmission ? 'Deliverable resubmitted!' : 'Deliverable submitted!');
      setSubmitOpen(null);
      setDriveLink('');
      setResubComment('');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
        <div className="max-w-2xl space-y-4">
          <Skeleton className="h-8 w-48" />
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
    );
  }

  return (
      <div className="max-w-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/teams/${teamId}`}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
          </Button>
          <h1 className="text-xl font-bold">Deliverables</h1>
        </div>

        {deliverables.length === 0 && (
            <p className="text-sm text-muted-foreground">No deliverables assigned yet.</p>
        )}

        {deliverables.map((d: any) => (
            <Card key={d.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">{d.title}</p>
                    <p className="text-xs text-muted-foreground">Deadline: {d.deadline}</p>
                    {d.submittedAt && (
                        <p className="text-xs text-muted-foreground">Submitted: {d.submittedAt}</p>
                    )}
                    {/* View Submission — opens popup with link + resubmission comment */}
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
                    <Badge variant={STATUS_VARIANTS[d.status] ?? 'secondary'}>{d.status?.replace('_', ' ')}</Badge>

                    {/* Submit — only for PENDING */}
                    {d.status === 'PENDING' && (
                        <Dialog open={submitOpen === d.id} onOpenChange={(o) => { setSubmitOpen(o ? d.id : null); if (!o) { setDriveLink(''); setResubComment(''); } }}>
                          <DialogTrigger asChild>
                            <Button size="sm">Submit</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Submit Deliverable</DialogTitle></DialogHeader>
                            <div className="space-y-2">
                              <Label>Google Drive Link</Label>
                              <Input
                                  placeholder="https://drive.google.com/file/..."
                                  value={driveLink}
                                  onChange={(e) => setDriveLink(e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground">
                                Share the link with &quot;Anyone with the link&quot; access.
                              </p>
                            </div>
                            <DialogFooter>
                              <Button onClick={() => submit(d.id, false)} disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                    )}

                    {/* Resubmit — only for CHANGES_REQUESTED */}
                    {d.status === 'CHANGES_REQUESTED' && (
                        <Dialog open={submitOpen === d.id} onOpenChange={(o) => { setSubmitOpen(o ? d.id : null); if (!o) { setDriveLink(''); setResubComment(''); } }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="destructive">Resubmit</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Resubmit Deliverable</DialogTitle></DialogHeader>
                            <div className="space-y-3">
                              <div>
                                <Label>Google Drive Link</Label>
                                <Input
                                    placeholder="https://drive.google.com/file/..."
                                    value={driveLink}
                                    onChange={(e) => setDriveLink(e.target.value)}
                                />
                              </div>
                              <div>
                                <Label>Resubmission Comment <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                <Textarea
                                    placeholder="Describe what changes you made..."
                                    value={resubComment}
                                    onChange={(e) => setResubComment(e.target.value)}
                                    rows={3}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Share the link with &quot;Anyone with the link&quot; access.
                              </p>
                            </div>
                            <DialogFooter>
                              <Button onClick={() => submit(d.id, true)} disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Resubmit
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                    )}
                  </div>
                </div>

                {/* Bug 10: Show resubmission comment to student too */}
                {d.resubmissionComment && (
                    <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Your resubmission comment</p>
                      <p className="text-amber-900 dark:text-amber-200">{d.resubmissionComment}</p>
                    </div>
                )}

                {/* Advisor feedback */}
                {d.feedback && (
                    <div className="p-3 rounded-md bg-muted/50 border text-sm space-y-1">
                      <p className="font-medium text-xs text-muted-foreground">Advisor Feedback</p>
                      <p>{d.feedback.comment}</p>
                      <Badge variant={d.feedback.decision === 'APPROVED' ? 'default' : 'destructive'}>
                        {d.feedback.decision}
                      </Badge>
                    </div>
                )}

                {/* Bug 13: Staff comments visible to students — use dark-mode-safe colours */}
                {(d.staffComments ?? []).map((c: any) => (
                    <div key={c.id} className="p-3 rounded-md border border-primary/20 bg-primary/5 text-sm space-y-1">
                      <p className="text-xs font-medium text-primary">FYP Staff Comment</p>
                      <p className="text-foreground">{c.comment}</p>
                    </div>
                ))}
              </CardContent>
            </Card>
        ))}

        {/* View Submission popup */}
        {viewOpen && (
            <Dialog open={true} onOpenChange={(o) => { if (!o) setViewOpen(null); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submission — {viewOpen.title}</DialogTitle>
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
                      <p className="text-xs text-muted-foreground">Submitted: {viewOpen.submittedAt}</p>
                  )}
                  {/* Bug 10: Show resubmission comment to student in popup too */}
                  {viewOpen.resubmissionComment && (
                      <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Your resubmission note</p>
                        <p className="text-sm text-amber-900 dark:text-amber-200">{viewOpen.resubmissionComment}</p>
                      </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setViewOpen(null)}>Close</Button>
                  <Button asChild>
                    <a href={viewOpen.googleDriveLink} target="_blank" rel="noopener noreferrer">
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