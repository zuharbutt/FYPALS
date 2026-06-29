'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';;
import { Loader2, CheckCircle, AlertCircle, Plus, X, Lock, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────────
// Split comma-separated string → trimmed array, filtering empties
const fromCSV = (s: string | undefined | null): string[] =>
    (s ?? '').split(',').map(t => t.trim()).filter(Boolean);

// Join array → comma-separated string for backend
const toCSV = (arr: string[]): string =>
    arr.filter(t => t.trim()).join(', ');

// ── Chip input — for simple single-value items (skills, interests, researchAreas) ──
interface ChipInputProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  required?: boolean; // if true, always shows at least 1 row
}
function ChipInput({ label, items, onChange, placeholder, required }: ChipInputProps) {
  const update = (i: number, val: string) => {
    const next = [...items];
    next[i] = val;
    onChange(next);
  };
  const remove = (i: number) => {
    const next = items.filter((_, idx) => idx !== i);
    // if required and last one, just clear the value instead of removing
    if (required && next.length === 0) { onChange(['']); return; }
    onChange(next);
  };
  const add = () => onChange([...items, '']);

  return (
      <div className="space-y-1.5">
        <Label>{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
        {items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input
                  value={item}
                  placeholder={placeholder}
                  onChange={(e) => update(i, e.target.value)}
              />
              {(!required || items.length > 1) && (
                  <Button type="button" size="icon" variant="ghost"
                          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => remove(i)}>
                    <X className="h-4 w-4" />
                  </Button>
              )}
            </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={add} className="text-xs gap-1">
          <Plus className="h-3.5 w-3.5" /> Add {label}
        </Button>
      </div>
  );
}

// ── Past Projects input — two fields per item: Name + Link ────────────────────
interface PastProject { name: string; link: string; }

interface PastProjectsInputProps {
  projects: PastProject[];
  onChange: (projects: PastProject[]) => void;
}
function PastProjectsInput({ projects, onChange }: PastProjectsInputProps) {
  const update = (i: number, field: keyof PastProject, val: string) => {
    const next = [...projects];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };
  const remove = (i: number) => onChange(projects.filter((_, idx) => idx !== i));
  const add    = () => onChange([...projects, { name: '', link: '' }]);

  return (
      <div className="space-y-2">
        <Label>Past Projects <span className="text-xs text-muted-foreground">(optional)</span></Label>
        {projects.map((proj, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2 relative bg-muted/20">
              <Button type="button" size="icon" variant="ghost"
                      className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(i)}>
                <X className="h-3.5 w-3.5" />
              </Button>
              <div>
                <Label className="text-xs">Project Name</Label>
                <Input
                    value={proj.name}
                    placeholder="e.g. FYP Management System"
                    onChange={(e) => update(i, 'name', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Link <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                    value={proj.link}
                    placeholder="https://github.com/..."
                    onChange={(e) => update(i, 'link', e.target.value)}
                />
              </div>
            </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={add} className="text-xs gap-1">
          <Plus className="h-3.5 w-3.5" /> Add Past Project
        </Button>
      </div>
  );
}

// ── Encode/decode past projects ── stored as "Name|Link, Name2|Link2" in DB
const projectsToCSV = (projects: PastProject[]): string =>
    projects
        .filter(p => p.name.trim())
        .map(p => p.link.trim() ? `${p.name.trim()}|${p.link.trim()}` : p.name.trim())
        .join(', ');

const projectsFromCSV = (s: string | undefined | null): PastProject[] => {
  if (!s?.trim()) return [];
  return s.split(',').map(item => {
    const trimmed = item.trim();
    const pipeIdx = trimmed.indexOf('|');
    if (pipeIdx === -1) return { name: trimmed, link: '' };
    return { name: trimmed.slice(0, pipeIdx).trim(), link: trimmed.slice(pipeIdx + 1).trim() };
  }).filter(p => p.name);
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: authUser, updateUser } = useAuthStore();
  const [profile, setProfile]   = useState<User | null>(null);
  const [loading, setLoading]   = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving]     = useState(false);

  // Simple string fields
  const [name, setName]               = useState('');
  const [bio, setBio]                 = useState('');
  const [gpa, setGpa]                 = useState('');
  const [department, setDepartment]   = useState('');
  const [designation, setDesignation] = useState('');

  // Multi-value fields
  const [skills, setSkills]               = useState<string[]>(['']);
  const [interests, setInterests]         = useState<string[]>(['']);
  const [researchAreas, setResearchAreas] = useState<string[]>(['']);
  const [pastProjects, setPastProjects]   = useState<PastProject[]>([]);

  // Change password state
  const [pwOpen, setPwOpen]     = useState(false);
  const [pwForm, setPwForm]     = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError]   = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [showPwFields, setShowPwFields] = useState({ old: false, new: false, confirm: false });

  const load = async () => {
    try {
      const p = await api.get(`/users/${id}/profile`) as unknown as User;
      setProfile(p);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const isOwnProfile = authUser?.id === Number(id);

  const openEdit = () => {
    if (!profile) return;
    setName(profile.name ?? '');
    setBio(profile.bio ?? '');
    setGpa(profile.gpa?.toString() ?? '');
    setDepartment((profile as any).department ?? '');
    setDesignation((profile as any).designation ?? '');

    // Multi-value — start with at least 1 empty entry for required fields
    const s = fromCSV(profile.skills);
    setSkills(s.length ? s : ['']);

    const interests_ = fromCSV(profile.interests);
    setInterests(interests_.length ? interests_ : ['']);

    const ra = fromCSV((profile as any).researchAreas);
    setResearchAreas(ra.length ? ra : ['']);

    setPastProjects(projectsFromCSV(profile.pastProjects));
    setEditOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const role = profile?.role ?? authUser?.role;
      const payload: any = {
        name:   name.trim(),
        bio:    bio.trim(),
        skills: toCSV(skills),
      };

      if (role === 'STUDENT') {
        if (gpa) payload.gpa = parseFloat(gpa);
        payload.interests    = toCSV(interests);
        payload.pastProjects = projectsToCSV(pastProjects);
      } else if (role === 'ADVISOR') {
        payload.department    = department.trim();
        payload.researchAreas = toCSV(researchAreas);
      } else if (role === 'FYP_STAFF') {
        payload.designation = designation.trim();
      }

      const updated = await api.put('/users/me/profile', payload) as unknown as User;
      setProfile(updated);
      updateUser({ name: updated.name, profileComplete: updated.profileComplete });
      toast.success('Profile updated!');
      setEditOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setPwError('');
    if (!pwForm.oldPassword.trim()) { setPwError('Current password is required'); return; }
    if (pwForm.newPassword.trim().length < 6) { setPwError('New password must be at least 6 characters'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('Passwords do not match'); return; }
    setSavingPw(true);
    try {
      await api.put('/users/me/password', {
        oldPassword: pwForm.oldPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success('Password changed successfully!');
      setPwOpen(false);
      setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPwError(err?.response?.data?.message ?? 'Failed to change password');
    } finally {
      setSavingPw(false);
    }
  };

  if (loading) {
    return (
        <div className="max-w-2xl space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
    );
  }

  if (!profile) return <p className="text-muted-foreground">Profile not found.</p>;

  const role = profile.role;
  const needsProfileComplete = role === 'STUDENT' || role === 'ADVISOR';

  // Display helpers — decode past projects for view
  const displayProjects = projectsFromCSV(profile.pastProjects);

  return (
      <div className="max-w-2xl space-y-4">

        {/* Header card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">{profile.role}</Badge>
                  {needsProfileComplete && (
                      profile.profileComplete
                          ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="h-3.5 w-3.5" /> Profile Complete</span>
                          : <span className="flex items-center gap-1 text-xs text-amber-600"><AlertCircle className="h-3.5 w-3.5" /> Incomplete Profile</span>
                  )}
                </div>
                <p className="text-muted-foreground mt-2">{profile.email}</p>
              </div>

              {isOwnProfile && (
                  <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={openEdit}>Edit Profile</Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                      <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
                      <div className="space-y-4">

                        {/* Name */}
                        <div>
                          <Label>Name <span className="text-destructive">*</span></Label>
                          <Input value={name}
                                 onChange={(e) => setName(e.target.value)}
                                 onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }} />
                        </div>

                        {/* Bio */}
                        <div>
                          <Label>Bio</Label>
                          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
                        </div>

                        {/* Skills — required, all roles */}
                        <ChipInput
                            label="Skills"
                            items={skills}
                            onChange={setSkills}
                            placeholder="e.g. React, Python..."
                            required
                        />

                        {/* Student fields */}
                        {role === 'STUDENT' && (
                            <>
                              <div>
                                <Label>GPA</Label>
                                <Input
                                    type="number" step="0.01" min="0" max="4"
                                    value={gpa}
                                    placeholder="e.g. 3.5"
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === '' || (parseFloat(val) >= 0 && parseFloat(val) <= 4)) {
                                        setGpa(val);
                                      }
                                    }}
                                />
                              </div>
                              <ChipInput
                                  label="Interests"
                                  items={interests}
                                  onChange={setInterests}
                                  placeholder="e.g. AI, Web Dev..."
                                  required
                              />
                              <PastProjectsInput
                                  projects={pastProjects}
                                  onChange={setPastProjects}
                              />
                            </>
                        )}

                        {/* Advisor fields */}
                        {role === 'ADVISOR' && (
                            <>
                              <div>
                                <Label>Department <span className="text-destructive">*</span></Label>
                                <Input
                                    value={department}
                                    placeholder="e.g. Computer Science"
                                    onChange={(e) => setDepartment(e.target.value)}
                                />
                              </div>
                              <ChipInput
                                  label="Research Areas"
                                  items={researchAreas}
                                  onChange={setResearchAreas}
                                  placeholder="e.g. Machine Learning..."
                                  required
                              />
                            </>
                        )}

                        {/* FYP Staff fields */}
                        {role === 'FYP_STAFF' && (
                            <div>
                              <Label>Designation</Label>
                              <Input
                                  value={designation}
                                  placeholder="e.g. FYP Coordinator"
                                  onChange={(e) => setDesignation(e.target.value)}
                              />
                            </div>
                        )}
                      </div>

                      <DialogFooter>
                        <Button onClick={save} disabled={saving}>
                          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Changes
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bio */}
        {profile.bio && (
            <Card>
              <CardHeader><CardTitle className="text-sm">About</CardTitle></CardHeader>
              <CardContent><p className="text-sm">{profile.bio}</p></CardContent>
            </Card>
        )}

        {/* Skills */}
        {profile.skills && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Skills</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {fromCSV(profile.skills).map((s) => (
                      <Badge key={s} variant="outline">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
        )}

        {/* Student academic info */}
        {role === 'STUDENT' && (profile.gpa || profile.interests || displayProjects.length > 0) && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Academic Info</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {profile.gpa && (
                    <p className="text-sm"><span className="font-medium">GPA:</span> {profile.gpa}</p>
                )}
                {profile.interests && (
                    <div>
                      <p className="text-sm font-medium mb-1">Interests</p>
                      <div className="flex flex-wrap gap-2">
                        {fromCSV(profile.interests).map((i) => (
                            <Badge key={i} variant="outline">{i}</Badge>
                        ))}
                      </div>
                    </div>
                )}
                {displayProjects.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Past Projects</p>
                      <div className="space-y-1.5">
                        {displayProjects.map((p, i) => (
                            <div key={i} className="text-sm">
                              {p.link ? (
                                  <a href={p.link} target="_blank" rel="noopener noreferrer"
                                     className="text-primary hover:underline font-medium">
                                    {p.name}
                                  </a>
                              ) : (
                                  <span className="font-medium">{p.name}</span>
                              )}
                            </div>
                        ))}
                      </div>
                    </div>
                )}
              </CardContent>
            </Card>
        )}

        {/* Advisor academic info */}
        {role === 'ADVISOR' && ((profile as any).department || (profile as any).researchAreas) && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Academic Info</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(profile as any).department && (
                    <p className="text-sm"><span className="font-medium">Department:</span> {(profile as any).department}</p>
                )}
                {(profile as any).researchAreas && (
                    <div>
                      <p className="text-sm font-medium mb-1">Research Areas</p>
                      <div className="flex flex-wrap gap-2">
                        {fromCSV((profile as any).researchAreas).map((r) => (
                            <Badge key={r} variant="outline">{r}</Badge>
                        ))}
                      </div>
                    </div>
                )}
              </CardContent>
            </Card>
        )}

        {/* FYP Staff info */}
        {role === 'FYP_STAFF' && (profile as any).designation && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Staff Info</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm"><span className="font-medium">Designation:</span> {(profile as any).designation}</p>
              </CardContent>
            </Card>
        )}

        {/* Change Password — own profile only */}
        {isOwnProfile && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Password</p>
                      <p className="text-xs text-muted-foreground">Change your login password</p>
                    </div>
                  </div>
                  <Dialog open={pwOpen} onOpenChange={(o) => {
                    setPwOpen(o);
                    if (!o) { setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' }); setPwError(''); }
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">Change Password</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div>
                          <Label>Current Password</Label>
                          <div className="relative">
                            <Input type={showPwFields.old ? 'text' : 'password'} placeholder="Enter current password" value={pwForm.oldPassword} onChange={(e) => { setPwForm({ ...pwForm, oldPassword: e.target.value }); setPwError(''); }} />
                            <button type="button" onClick={() => setShowPwFields(s => ({ ...s, old: !s.old }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                              {showPwFields.old ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <Label>New Password</Label>
                          <div className="relative">
                            <Input type={showPwFields.new ? 'text' : 'password'} placeholder="Min 6 characters" value={pwForm.newPassword} onChange={(e) => { setPwForm({ ...pwForm, newPassword: e.target.value }); setPwError(''); }} />
                            <button type="button" onClick={() => setShowPwFields(s => ({ ...s, new: !s.new }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                              {showPwFields.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <Label>Confirm New Password</Label>
                          <div className="relative">
                            <Input type={showPwFields.confirm ? 'text' : 'password'} placeholder="Repeat new password" value={pwForm.confirmPassword} onChange={(e) => { setPwForm({ ...pwForm, confirmPassword: e.target.value }); setPwError(''); }} />
                            <button type="button" onClick={() => setShowPwFields(s => ({ ...s, confirm: !s.confirm }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                              {showPwFields.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        {pwError && <p className="text-sm text-destructive">{pwError}</p>}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setPwOpen(false)}>Cancel</Button>
                        <Button onClick={changePassword} disabled={savingPw}>
                          {savingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Update Password
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
        )}
      </div>
  );
}