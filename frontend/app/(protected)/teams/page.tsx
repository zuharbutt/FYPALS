'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import type { User } from '@/types';

const teamSchema = z.object({
  teamName: z.string().min(3, 'Team name must be at least 3 characters'),
});
type TeamFormValues = z.infer<typeof teamSchema>;

export default function TeamsPage() {
  const router = useRouter();
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);

  // Project name/description dialog (shown immediately after team creation)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [newTeamId, setNewTeamId]                 = useState<number | null>(null);
  const [projectName, setProjectName]             = useState('');
  const [projectDesc, setProjectDesc]             = useState('');
  const [savingProject, setSavingProject]         = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
  });

  useEffect(() => {
    const check = async () => {
      try {
        const p = await api.get('/users/me/profile') as unknown as User;
        if (p.teamId) {
          // Already in a team — go straight there, no blank screen
          router.replace(`/teams/${p.teamId}`);
          return;
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    check();
  }, []);

  const onSubmit = async (data: TeamFormValues) => {
    setCreating(true);
    try {
      const team = await api.post(
          `/teams?teamName=${encodeURIComponent(data.teamName)}`
      ) as unknown as { id: number; teamId?: number };

      const teamId = team.id ?? team.teamId;
      if (!teamId) throw new Error('No team ID returned');

      toast.success('Team created!');
      setNewTeamId(teamId);
      // Open the project name/description dialog immediately
      setProjectDialogOpen(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const saveProjectDetails = async () => {
    if (!newTeamId) return;
    setSavingProject(true);
    try {
      if (projectName.trim() || projectDesc.trim()) {
        // The project was auto-created by the backend — update its description
        // We need the project ID first
        const teamData = await api.get(`/teams/${newTeamId}`) as any;
        const projectId = teamData?.project?.id;
        if (projectId) {
          await api.put(`/projects/${projectId}/progress`, {
            description: projectDesc.trim() || `Project for team: ${projectName.trim()}`,
            projectName: projectName.trim(),
          });
        }
      }
    } catch {
      // Non-critical — project can be named later; just navigate
    } finally {
      setSavingProject(false);
      setProjectDialogOpen(false);
      // Navigate to team workspace — this is the FIX for the blank screen:
      // we only navigate AFTER the dialog is done, so the team definitely exists
      router.replace(`/teams/${newTeamId}`);
    }
  };

  const skipProjectDetails = () => {
    setProjectDialogOpen(false);
    if (newTeamId) router.replace(`/teams/${newTeamId}`);
  };

  if (loading) {
    return <Skeleton className="h-64 max-w-md" />;
  }

  return (
      <>
        <div className="max-w-md">
          <Card>
            <CardHeader>
              <div className="flex justify-center mb-2">
                <div className="p-4 rounded-full bg-primary/10">
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-center">Form Your Team</CardTitle>
              <CardDescription className="text-center">
                Start a new team for your Final Year Project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <Label>Team Name *</Label>
                  <Input placeholder="e.g. Team Alpha" {...register('teamName')} />
                  {errors.teamName && (
                      <p className="text-xs text-destructive">{errors.teamName.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Team
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Project name & description dialog — shown immediately after team creation */}
        <Dialog open={projectDialogOpen} onOpenChange={() => {}}>
          <DialogContent
              className="sm:max-w-md"
              // Prevent closing by clicking outside — user must either save or skip
              onPointerDownOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Name Your Project</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Give your FYP a name and description. You can update this anytime from the team Overview tab.
              </p>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label>Project Name</Label>
                <Input
                    placeholder="e.g. Smart Campus Management System"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
              <div>
                <Label>Project Description</Label>
                <Textarea
                    placeholder="Briefly describe what your FYP is about..."
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button variant="outline" onClick={skipProjectDetails} disabled={savingProject}>
                Skip for now
              </Button>
              <Button onClick={saveProjectDetails} disabled={savingProject}>
                {savingProject && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save & Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
  );
}