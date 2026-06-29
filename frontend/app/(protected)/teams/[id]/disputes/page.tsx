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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Team, Dispute } from '@/types';

const STATUS_VARIANTS: Record<string, any> = {
  PENDING: 'warning',
  OPEN: 'info',
  RESOLVED: 'success',
  REJECTED: 'destructive',
};

export default function DisputesPage() {
  const { id: teamId } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [team, setTeam] = useState<Team | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  const [raiseOpen, setRaiseOpen] = useState(false);
  const [raiseForm, setRaiseForm] = useState({ targetItem: '', reason: '' });
  const [raising, setRaising] = useState(false);

  const [pollOpen, setPollOpen] = useState<number | null>(null);
  const [pollForm, setPollForm] = useState({ question: '', options: '', deadline: '' });

  const load = async () => {
    try {
      const t = await api.get(`/teams/${teamId}`) as unknown as Team;
      setTeam(t);
      const data = await api.get(`/disputes/team/${teamId}/pending`) as unknown as Dispute[];
      setDisputes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [teamId]);

  const isLeader = team?.leaderId === user?.id;

  const raiseDispute = async () => {
    setRaising(true);
    try {
      await api.post('/disputes', { teamId: Number(teamId), ...raiseForm });
      toast.success('Dispute raised');
      setRaiseOpen(false);
      setRaiseForm({ targetItem: '', reason: '' });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to raise dispute');
    } finally {
      setRaising(false);
    }
  };

  const accept = async (id: number) => {
    try {
      await api.post(`/disputes/${id}/accept`);
      toast.success('Dispute accepted');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed');
    }
  };

  const reject = async (id: number) => {
    try {
      await api.post(`/disputes/${id}/reject`);
      toast.success('Dispute rejected');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed');
    }
  };

  const createPoll = async (disputeId: number) => {
    try {
      const options = pollForm.options.split('\n').map((o) => o.trim()).filter(Boolean);
      await api.post(`/disputes/${disputeId}/poll`, { ...pollForm, options });
      toast.success('Poll created');
      setPollOpen(null);
      setPollForm({ question: '', options: '', deadline: '' });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed');
    }
  };

  const vote = async (pollId: number, option: string) => {
    try {
      await api.post(`/polls/${pollId}/vote`, { chosenOption: option });
      toast.success('Vote cast!');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Already voted or error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/teams/${teamId}`}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
          </Button>
          <h1 className="text-xl font-bold">Disputes</h1>
        </div>
        <Dialog open={raiseOpen} onOpenChange={setRaiseOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Raise Dispute</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Raise a Dispute</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Target Item</Label>
                <Input value={raiseForm.targetItem} onChange={(e) => setRaiseForm({ ...raiseForm, targetItem: e.target.value })} placeholder="What is this dispute about?" />
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea value={raiseForm.reason} onChange={(e) => setRaiseForm({ ...raiseForm, reason: e.target.value })} placeholder="Explain the issue..." rows={4} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={raiseDispute} disabled={raising}>
                {raising && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {disputes.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <p className="text-3xl">🤝</p>
          <p className="font-medium text-lg">No disputes raised.</p>
          <p className="text-sm">The team is getting along well!</p>
        </div>
      )}

      {disputes.map((d) => (
        <Card key={d.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{d.targetItem}</p>
                <p className="text-xs text-muted-foreground">Raised by {d.raisedByName}</p>
              </div>
              <Badge variant={STATUS_VARIANTS[d.status]}>{d.status}</Badge>
            </div>
            <p className="text-sm">{d.reason}</p>

            {/* Leader actions on PENDING disputes */}
            {isLeader && d.status === 'PENDING' && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={() => accept(d.id)}>Accept</Button>
                <Button size="sm" variant="outline" onClick={() => reject(d.id)}>Reject</Button>
              </div>
            )}

            {/* Leader create poll on OPEN disputes without poll */}
            {isLeader && d.status === 'OPEN' && !d.poll && (
              <Dialog open={pollOpen === d.id} onOpenChange={(o) => setPollOpen(o ? d.id : null)}>
                <DialogTrigger asChild>
                  <Button size="sm">Create Poll</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create Poll</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Question</Label>
                      <Input value={pollForm.question} onChange={(e) => setPollForm({ ...pollForm, question: e.target.value })} />
                    </div>
                    <div>
                      <Label>Options (one per line)</Label>
                      <Textarea value={pollForm.options} onChange={(e) => setPollForm({ ...pollForm, options: e.target.value })} rows={4} placeholder={"Option A\nOption B\nOption C"} />
                    </div>
                    <div>
                      <Label>Deadline</Label>
                      <Input type="datetime-local" value={pollForm.deadline} onChange={(e) => setPollForm({ ...pollForm, deadline: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter><Button onClick={() => createPoll(d.id)}>Create</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Active poll */}
            {d.poll && (
              <div className="border-t pt-3 space-y-3">
                <p className="font-medium text-sm">{d.poll.question}</p>
                <div className="space-y-2">
                  {(d.poll.options ?? []).map((opt) => {
                    const result = d.poll!.results?.find((r) => r.option === opt);
                    return (
                      <div key={opt} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => vote(d.poll!.id, opt)}>
                            {opt}
                          </Button>
                          {result && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {result.count} ({result.percent}%)
                            </span>
                          )}
                        </div>
                        {result && <Progress value={result.percent} className="h-1.5" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
