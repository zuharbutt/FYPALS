'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import type { Phase, Checkpoint, CheckpointStatus } from '@/types';

// Covers every status the backend can send, including TODO which was missing
// and caused "Cannot read properties of undefined (reading 'variant')"
const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  TODO:        { label: 'To Do',       variant: 'secondary'  },
  PENDING:     { label: 'Pending',     variant: 'secondary'  },
  IN_PROGRESS: { label: 'In Progress', variant: 'default'    },
  IN_REVIEW:   { label: 'In Review',   variant: 'default'    },
  COMPLETE:    { label: 'Complete',    variant: 'default'    },
};

// Safe fallback — never crashes even if backend sends an unexpected status string
const getSC = (status: string) =>
    STATUS_CONFIG[status] ?? { label: status ?? 'Unknown', variant: 'secondary' as const };

interface PhaseCardProps {
  phase: Phase;
  isLeader: boolean;
  callerRole: string;
  onStatusChange?: () => void;
  readOnly?: boolean;
}

export function PhaseCard({ phase, isLeader, callerRole, onStatusChange, readOnly = false }: PhaseCardProps) {
  const [open, setOpen] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  const handleStatusChange = async (checkpoint: Checkpoint, newStatus: CheckpointStatus) => {
    setUpdating(checkpoint.id);
    try {
      await api.put(`/checkpoints/${checkpoint.id}/status`, null, {
        params: { status: newStatus, callerRole },
      });
      toast.success('Status updated');
      onStatusChange?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const allStatuses: CheckpointStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETE'];
  const allowedForMember: CheckpointStatus[] = ['IN_PROGRESS', 'IN_REVIEW'];

  return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="border rounded-lg overflow-hidden">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 bg-muted/20">
              <div className="flex items-center gap-2">
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <h3 className="font-medium">{phase.name}</h3>
              </div>
              <span className="text-xs text-muted-foreground">
              {phase.startDate} → {phase.endDate}
            </span>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="divide-y">
              {(phase.checkpoints ?? []).length === 0 && (
                  <p className="px-4 py-3 text-sm text-muted-foreground">No checkpoints yet.</p>
              )}
              {(phase.checkpoints ?? []).map((cp) => {
                const sc = getSC(cp.status);
                return (
                    <div key={cp.id} className="flex items-center gap-3 px-4 py-3">
                      <Badge variant={sc.variant} className="shrink-0">{sc.label}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{cp.title}</p>
                        {cp.deadline && (
                            <p className="text-xs text-muted-foreground">Due: {cp.deadline}</p>
                        )}
                        {cp.assignedToName && (
                            <p className="text-xs text-muted-foreground">Assigned to: {cp.assignedToName}</p>
                        )}
                      </div>
                      {!readOnly && (
                          <Select
                              value={cp.status}
                              onValueChange={(val) => handleStatusChange(cp, val as CheckpointStatus)}
                              disabled={updating === cp.id}
                          >
                            <SelectTrigger className="w-36 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(isLeader ? allStatuses : allowedForMember).map((s) => (
                                  <SelectItem key={s} value={s} className="text-xs">
                                    {getSC(s).label}
                                  </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                      )}
                    </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
  );
}