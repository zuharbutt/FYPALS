'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, FileText, Search, AlertCircle, Sparkles, UserCheck, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatTimeAgo } from '@/lib/utils';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { User, Notification } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  LOOKING_FOR_MEMBER: 'Looking for Member',
  PROJECT_IDEA:       'Project',
  GENERAL:            'General',
};

export default function DashboardPage() {
  const { user: authUser } = useAuthStore();
  const router = useRouter();
  const [profile, setProfile]             = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [studentMatches, setStudentMatches] = useState<any[]>([]);
  const [advisorMatches, setAdvisorMatches] = useState<any[]>([]);
  const [postMatches, setPostMatches]       = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    if (authUser?.role === 'ADMIN')     { router.replace('/admin/dashboard');     return; }
    if (authUser?.role === 'ADVISOR')   { router.replace('/advisor/dashboard');   return; }
    if (authUser?.role === 'FYP_STAFF') { router.replace('/fyp-staff/dashboard'); return; }

    const load = async () => {
      try {
        const [p, n] = await Promise.all([
          api.get('/users/me/profile') as unknown as Promise<User>,
          api.get('/notifications')   as unknown as Promise<Notification[]>,
        ]);
        setProfile(p);
        setNotifications(Array.isArray(n) ? n.slice(0, 5) : []);

        // Build keyword from skills or interests — take first token
        const keyword = (p?.skills || p?.interests || '').split(',')[0]?.trim();
        if (keyword) {
          // Fire 3 searches in parallel — silently ignore individual failures
          const [studentsRes, advisorsRes, postsRes] = await Promise.allSettled([
            api.get('/search', { params: { q: keyword, type: 'student'  } }) as Promise<any[]>,
            api.get('/search', { params: { q: keyword, type: 'advisor'  } }) as Promise<any[]>,
            api.get('/search', { params: { q: keyword, type: 'post'     } }) as Promise<any[]>,
          ]);

          if (studentsRes.status === 'fulfilled') {
            setStudentMatches(
                (Array.isArray(studentsRes.value) ? studentsRes.value : [])
                    .filter((r: any) => r.id !== p.id)
                    .slice(0, 4)
            );
          }
          if (advisorsRes.status === 'fulfilled') {
            setAdvisorMatches(
                (Array.isArray(advisorsRes.value) ? advisorsRes.value : [])
                    .slice(0, 4)
            );
          }
          if (postsRes.status === 'fulfilled') {
            // Only show PROJECT_IDEA posts in this section
            setPostMatches(
                (Array.isArray(postsRes.value) ? postsRes.value : [])
                    .filter((r: any) => r.extra === 'PROJECT_IDEA')
                    .slice(0, 4)
            );
          }
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authUser?.role]);

  if (loading) {
    return (
        <div className="space-y-6">
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
    );
  }

  const unreadNotifications = notifications.filter(n => !n.read);
  const hasAnyMatch = studentMatches.length > 0 || advisorMatches.length > 0 || postMatches.length > 0;

  return (
      <div className="space-y-6 max-w-4xl">

        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {profile?.name ?? authUser?.name}!</h1>
          <p className="text-muted-foreground mt-1">
            Role: <Badge variant="secondary">{profile?.role ?? authUser?.role}</Badge>
            {profile?.teamId && (
                <span className="ml-2 text-sm">· <Link href={`/teams/${profile.teamId}`} className="text-primary hover:underline">Go to your team →</Link></span>
            )}
          </p>
        </div>

        {/* Profile incomplete alert */}
        {profile && !profile.profileComplete && profile.role === 'STUDENT' && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Complete your profile</p>
                <p className="text-sm mt-1">Add your skills, GPA, and interests — this helps with team matching!</p>
                <Button size="sm" variant="outline" asChild className="mt-2 border-amber-300 hover:bg-amber-100">
                  <Link href={`/profile/${authUser?.id}`}>Edit Profile</Link>
                </Button>
              </div>
            </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <Link href="/teams" className="flex flex-col items-center gap-2 text-center">
                <div className="p-3 rounded-full bg-primary/10"><Users className="h-6 w-6 text-primary" /></div>
                <p className="font-medium">My Team</p>
                <p className="text-xs text-muted-foreground">
                  {profile?.teamId ? 'View your team workspace' : 'Form or join a team'}
                </p>
              </Link>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <Link href="/posts" className="flex flex-col items-center gap-2 text-center">
                <div className="p-3 rounded-full bg-blue-100"><FileText className="h-6 w-6 text-blue-600" /></div>
                <p className="font-medium">Browse Posts</p>
                <p className="text-xs text-muted-foreground">Ideas, requirements, member hunts</p>
              </Link>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <Link href="/search" className="flex flex-col items-center gap-2 text-center">
                <div className="p-3 rounded-full bg-green-100"><Search className="h-6 w-6 text-green-600" /></div>
                <p className="font-medium">Find People</p>
                <p className="text-xs text-muted-foreground">Search students & advisors by skills</p>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Suggested Matches — only shown if there is at least one result */}
        {hasAnyMatch && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Suggested Matches
                  <span className="text-xs font-normal text-muted-foreground">(based on your skills &amp; interests)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Students */}
                {studentMatches.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5" /> Students
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {studentMatches.map((m: any) => (
                            <Link key={m.id} href={`/profile/${m.id}`}
                                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="text-xs">
                                  {m.title?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{m.title}</p>
                                {m.description && <p className="text-xs text-muted-foreground truncate">{m.description}</p>}
                              </div>
                            </Link>
                        ))}
                      </div>
                    </div>
                )}

                {/* Advisors */}
                {advisorMatches.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5" /> Advisors
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {advisorMatches.map((m: any) => (
                            <Link key={m.id} href={`/profile/${m.id}`}
                                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="text-xs">
                                  {m.title?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{m.title}</p>
                                {m.description && <p className="text-xs text-muted-foreground truncate">{m.description}</p>}
                                <Badge variant="outline" className="text-xs mt-0.5">Advisor</Badge>
                              </div>
                            </Link>
                        ))}
                      </div>
                    </div>
                )}

                {/* Project posts */}
                {postMatches.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" /> Projects
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {postMatches.map((m: any) => (
                            <Link key={m.id} href={`/posts/${m.id}`}
                                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                              <div className="p-2 rounded-full bg-blue-100 shrink-0">
                                <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{m.title}</p>
                                {m.description && <p className="text-xs text-muted-foreground truncate">{m.description}</p>}
                                <Badge variant="secondary" className="text-xs mt-0.5">Project</Badge>
                              </div>
                            </Link>
                        ))}
                      </div>
                    </div>
                )}

                <Button variant="ghost" size="sm" asChild className="w-full">
                  <Link href="/search">Search more →</Link>
                </Button>
              </CardContent>
            </Card>
        )}

        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Notifications</CardTitle>
              {unreadNotifications.length > 0 && (
                  <Badge variant="secondary">{unreadNotifications.length} unread</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
                notifications.slice(0, 5).map((n) => (
                    <div key={n.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50">
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${n.read ? 'text-muted-foreground' : 'font-medium'}`}>{n.message}</p>
                        <p className="text-xs text-muted-foreground">{formatTimeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                ))
            )}
            {notifications.length > 0 && (
                <Button variant="ghost" size="sm" asChild className="w-full mt-2">
                  <Link href="/notifications">View all notifications</Link>
                </Button>
            )}
          </CardContent>
        </Card>
      </div>
  );
}