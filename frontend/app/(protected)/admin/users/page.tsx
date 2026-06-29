'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Trash2, Plus, Loader2, Search, Shield, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import type { Page } from '@/types';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  profileComplete: boolean;
  skills?: string;
  bio?: string;
  createdAt?: string;
}

const ROLE_COLORS: Record<string, string> = {
  STUDENT:   'bg-blue-100   text-blue-800   dark:bg-blue-900/40   dark:text-blue-300',
  ADVISOR:   'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  ADMIN:     'bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300',
  FYP_STAFF: 'bg-green-100  text-green-800  dark:bg-green-900/40  dark:text-green-300',
};

export default function AdminUsersPage() {
  const [data, setData]       = useState<Page<AdminUser> | null>(null);
  const [page, setPage]       = useState(0);
  const [loading, setLoading] = useState(true);

  // Search + filter
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Create user
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [form, setForm]             = useState({ name: '', email: '', password: '', role: 'STUDENT' });
  const [formError, setFormError]   = useState('');

  // Role + password dialog (Shield)
  const [roleOpen, setRoleOpen]           = useState(false);
  const [roleUser, setRoleUser]           = useState<AdminUser | null>(null);
  const [newRole, setNewRole]             = useState('');
  const [changingRole, setChangingRole]   = useState(false);
  const [newPassword, setNewPassword]     = useState('');
  const [pwError, setPwError]             = useState('');
  const [changingPw, setChangingPw]       = useState(false);
  const [showCreatePw, setShowCreatePw] = useState(false);
  const [showAdminPw, setShowAdminPw]   = useState(false);

  const load = useCallback(async (p = 0) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', { params: { page: p, size: 12 } }) as unknown as Page<AdminUser>;
      setData(res);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load users');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  const deleteUser = async (id: number, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('User deleted');
      load(page);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to delete user');
    }
  };

  const createUser = async () => {
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    if (!form.email.trim()) { setFormError('Email is required'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) { setFormError('Please enter a valid email address'); return; }
    if (!form.password.trim()) { setFormError('Password is required'); return; }
    if (form.password.trim().length < 6) { setFormError('Password must be at least 6 characters'); return; }
    setFormError('');
    setCreating(true);
    try {
      await api.post('/admin/users', form);
      toast.success('User created');
      setCreateOpen(false);
      setForm({ name: '', email: '', password: '', role: 'STUDENT' });
      load(page);
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Failed to create user');
    } finally { setCreating(false); }
  };

  const changeRole = async () => {
    if (!roleUser || newRole === roleUser.role) return;
    setChangingRole(true);
    try {
      await api.put(`/admin/users/${roleUser.id}/role`, { role: newRole });
      toast.success('Role updated');
      setRoleOpen(false);
      load(page);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to update role');
    } finally { setChangingRole(false); }
  };

  const changePassword = async () => {
    if (!newPassword.trim() || newPassword.trim().length < 6) {
      setPwError('Password must be at least 6 characters'); return;
    }
    if (!roleUser) return;
    setPwError('');
    setChangingPw(true);
    try {
      await api.put(`/admin/users/${roleUser.id}/password`, { password: newPassword.trim() });
      toast.success('Password updated');
      setNewPassword('');
      setRoleOpen(false);
    } catch (err: any) {
      setPwError(err?.response?.data?.message ?? 'Failed to update password');
    } finally { setChangingPw(false); }
  };

  // Client-side filter
  const allUsers = data?.content ?? [];
  const users = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allUsers.filter(u => {
      const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
      const matchRole   = roleFilter === 'ALL' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [allUsers, search, roleFilter]);

  const totalPages = data?.totalPages ?? 1;

  return (
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <p className="text-sm text-muted-foreground">{data?.totalElements ?? 0} total</p>
          </div>
          <Dialog open={createOpen} onOpenChange={(o) => {
            setCreateOpen(o);
            if (!o) { setFormError(''); setForm({ name: '', email: '', password: '', role: 'STUDENT' }); }
          }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Create User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name *</Label><Input placeholder="Full name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} onKeyDown={e => { if (/[0-9]/.test(e.key)) e.preventDefault(); }} /></div>
                <div><Label>Email *</Label><Input type="email" placeholder="user@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div><Label>Password *</Label>
                  <div className="relative">
                    <Input type={showCreatePw ? 'text' : 'password'} placeholder="Min 6 characters" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                    <button type="button" onClick={() => setShowCreatePw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showCreatePw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={v => setForm({...form, role: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STUDENT">Student</SelectItem>
                      <SelectItem value="ADVISOR">Advisor</SelectItem>
                      <SelectItem value="FYP_STAFF">FYP Staff</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={createUser} disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search + filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search by name or email…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="STUDENT">Student</SelectItem>
              <SelectItem value="ADVISOR">Advisor</SelectItem>
              <SelectItem value="FYP_STAFF">FYP Staff</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-left p-3 font-medium">Role</th>
              <th className="text-left p-3 font-medium">Profile</th>
              <th className="p-3 font-medium w-24">Actions</th>
            </tr>
            </thead>
            <tbody>
            {loading ? (
                [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-t">
                      {[...Array(5)].map((_, j) => <td key={j} className="p-3"><Skeleton className="h-4 w-24" /></td>)}
                    </tr>
                ))
            ) : users.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No users found.</td></tr>
            ) : (
                users.map(u => (
                    <tr key={u.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{u.name || <span className="text-muted-foreground italic">No name</span>}</td>
                      <td className="p-3 text-muted-foreground">{u.email}</td>
                      <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-700'}`}>
                      {u.role}
                    </span>
                      </td>
                      <td className="p-3">
                        <Badge variant={u.profileComplete ? 'default' : 'secondary'} className="text-xs">
                          {u.profileComplete ? 'Complete' : 'Incomplete'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {/* Shield — Role & Password */}
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" title="Manage user"
                                  onClick={() => { setRoleUser(u); setNewRole(u.role); setNewPassword(''); setPwError(''); setRoleOpen(true); }}>
                            <Shield className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Delete user"
                                  onClick={() => deleteUser(u.id, u.name)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                ))
            )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Next</Button>
            </div>
        )}

        {/* Shield dialog — Role + Password tabs */}
        <Dialog open={roleOpen} onOpenChange={(o) => {
          setRoleOpen(o);
          if (!o) { setRoleUser(null); setNewPassword(''); setPwError(''); }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Manage User — {roleUser?.name}
              </DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="role" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="role" className="flex-1 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Change Role
                </TabsTrigger>
                <TabsTrigger value="password" className="flex-1 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" /> Change Password
                </TabsTrigger>
              </TabsList>

              <TabsContent value="role" className="space-y-3 pt-3">
                <p className="text-sm text-muted-foreground">Current role: <strong>{roleUser?.role}</strong></p>
                <div>
                  <Label>New Role</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STUDENT">Student</SelectItem>
                      <SelectItem value="ADVISOR">Advisor</SelectItem>
                      <SelectItem value="FYP_STAFF">FYP Staff</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-amber-600">⚠ Changing role will update the user type. Make sure this is intentional.</p>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setRoleOpen(false)}>Cancel</Button>
                  <Button onClick={changeRole} disabled={changingRole || newRole === roleUser?.role}>
                    {changingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Role
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="password" className="space-y-3 pt-3">
                <p className="text-sm text-muted-foreground">Set a new password for <strong>{roleUser?.name}</strong>.</p>
                <div>
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input type={showAdminPw ? 'text' : 'password'} placeholder="Min 6 characters" value={newPassword} onChange={e => { setNewPassword(e.target.value); setPwError(''); }} />
                    <button type="button" onClick={() => setShowAdminPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showAdminPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {pwError && <p className="text-sm text-destructive">{pwError}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setRoleOpen(false)}>Cancel</Button>
                  <Button onClick={changePassword} disabled={changingPw || !newPassword.trim()}>
                    {changingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Password
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
  );
}