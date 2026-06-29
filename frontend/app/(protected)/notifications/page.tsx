'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimeAgo } from '@/lib/utils';
import api from '@/lib/api';
import type { Notification } from '@/types';

const TYPE_ICONS: Record<string, string> = {
    TEAM_INVITE:           '👥',
    ADVISOR_INVITE:        '🎓',
    INVITE_ACCEPTED:       '✅',
    INVITE_DECLINED:       '❌',
    MEMBER_DROPPED:        '🚪',
    TEAM_DROPPED:          '🚪',
    DISPUTE_RAISED:        '⚠️',
    DISPUTE_ACCEPTED:      '🤝',
    DISPUTE_REJECTED:      '🚫',
    DISPUTE_RESOLVED:      '🏆',
    DELIVERABLE_SUBMITTED: '📎',
    DELIVERABLE_FEEDBACK:  '💬',
    DEADLINE_REMINDER:     '⏰',
    COMMENT:               '💬',
    GENERAL:               '🔔',
};

/**
 * ONLY unread TEAM_INVITE and ADVISOR_INVITE show Accept/Decline buttons.
 * INVITE_ACCEPTED and INVITE_DECLINED are informational notifications sent
 * TO the leader to tell them someone accepted/declined — NO buttons.
 */
const ACTIONABLE_INVITE_TYPES = new Set<string>(['TEAM_INVITE', 'ADVISOR_INVITE']);

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState<{ id: number; action: 'accept' | 'decline' } | null>(null);
    const [actedOn, setActedOn] = useState<Set<number>>(new Set());

    const load = (): void => {
        api.get('/notifications')
            .then((data) => {
                const raw = data as unknown as Notification[];
                const list = Array.isArray(raw) ? raw : (raw as any)?.content ?? [];
                const sorted = [...list].sort((a: Notification, b: Notification) => {
                    if (a.read !== b.read) return a.read ? 1 : -1;
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                });
                setNotifications(sorted);
            })
            .catch((err: any) => {
                toast.error(err?.response?.data?.message ?? 'Failed to load notifications');
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => { load(); }, []);

    const markRead = (id: number): void => {
        api.put(`/notifications/${id}/read`)
            .then(() => {
                setNotifications((prev) =>
                    prev.map((n) => (n.id === id ? { ...n, read: true } : n))
                );
            })
            .catch(() => { /* silent */ });
    };

    const markAllRead = (): void => {
        const unread = notifications.filter((n) => !n.read);
        Promise.all(
            unread.map((n) => api.put(`/notifications/${n.id}/read`).catch(() => {}))
        ).then(() => {
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            toast.success('All marked as read');
        }).catch(() => {
            toast.error('Failed to mark all as read');
        });
    };

    const handleInviteAction = (n: Notification, action: 'accept' | 'decline'): void => {
        if (!n.referenceId) {
            toast.error('Invalid invite — no team reference');
            return;
        }

        setActing({ id: n.id, action });

        api.post(`/teams/${n.referenceId}/invites/${n.id}/${action}`)
            .then((res: any) => {
                const msg = res?.message ?? (action === 'accept' ? 'Invite accepted!' : 'Invite declined');
                toast.success(msg);

                // Mark as acted-on so buttons disappear immediately without re-fetch
                setActedOn((prev) => new Set([...Array.from(prev), n.id]));
                setNotifications((prev) =>
                    prev.map((notif) => notif.id === n.id ? { ...notif, read: true } : notif)
                );

                if (action === 'accept') {
                    if (String(n.type) === 'TEAM_INVITE') {
                        router.push(`/teams/${n.referenceId}`);
                    } else if (String(n.type) === 'ADVISOR_INVITE') {
                        router.push(`/advisor/teams/${n.referenceId}`);
                    }
                }
                // On decline: do NOT reload — avoids the loop where the new
                // INVITE_DECLINED notification re-appears as unread with buttons.
            })
            .catch((err: any) => {
                toast.error(err?.response?.data?.message ?? `Failed to ${action} invite`);
            })
            .finally(() => {
                setActing(null);
            });
    };

    const handleCardClick = (n: Notification): void => {
        if (ACTIONABLE_INVITE_TYPES.has(String(n.type))) return;
        markRead(n.id);
        if (n.type === 'COMMENT' && n.referenceId) {
            router.push(`/posts/${n.referenceId}`);
        } else if (
            (n.type === 'DISPUTE_RAISED' || n.type === 'DISPUTE_ACCEPTED') && n.referenceId
        ) {
            router.push(`/teams/${n.referenceId}`);
        }
    };

    const renderNotification = (n: Notification) => {
        // Show Accept/Decline ONLY for TEAM_INVITE or ADVISOR_INVITE that are:
        // - unread
        // - not yet acted on in this session
        // INVITE_ACCEPTED and INVITE_DECLINED are purely informational (sent to leader).
        const typeStr = String(n.type);
        const isActionableInvite =
            ACTIONABLE_INVITE_TYPES.has(typeStr) &&
            !n.read &&
            !actedOn.has(n.id) &&
            !n.message?.toLowerCase().includes('leader');

        const isActingNow = acting?.id === n.id;

        return (
            <Card
                key={n.id}
                className={`transition-shadow ${
                    !n.read ? 'border-primary/20 bg-primary/5' : 'opacity-70'
                } ${!isActionableInvite ? 'cursor-pointer hover:shadow-md' : ''}`}
                onClick={() => { if (!isActionableInvite) handleCardClick(n); }}
            >
                <CardContent className="p-3 flex items-start gap-3">
          <span className="text-xl shrink-0 mt-0.5">
            {TYPE_ICONS[n.type] ?? '🔔'}
          </span>

                    <div className="flex-1 min-w-0 space-y-2">
                        <div>
                            <p className={`text-sm ${!n.read ? 'font-medium' : ''}`}>{n.message}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{formatTimeAgo(n.createdAt)}</p>
                        </div>

                        {isActionableInvite && (
                            <div className="flex gap-2 pt-1">
                                <Button
                                    size="sm"
                                    disabled={isActingNow}
                                    onClick={(e) => { e.stopPropagation(); handleInviteAction(n, 'accept'); }}
                                >
                                    {isActingNow && acting?.action === 'accept' && (
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    )}
                                    Accept
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isActingNow}
                                    onClick={(e) => { e.stopPropagation(); handleInviteAction(n, 'decline'); }}
                                >
                                    {isActingNow && acting?.action === 'decline' && (
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    )}
                                    Decline
                                </Button>
                            </div>
                        )}
                    </div>

                    {!n.read && !isActionableInvite && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                </CardContent>
            </Card>
        );
    };

    const unread = notifications.filter((n) => !n.read);
    const read   = notifications.filter((n) => n.read);

    if (loading) {
        return (
            <div className="max-w-2xl space-y-3">
                <Skeleton className="h-8 w-48" />
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
        );
    }

    return (
        <div className="max-w-2xl space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Notifications</h1>
                    {unread.length > 0 && (
                        <p className="text-sm text-muted-foreground">{unread.length} unread</p>
                    )}
                </div>
                {unread.length > 0 && (
                    <Button variant="outline" size="sm" onClick={markAllRead}>
                        <CheckCheck className="h-4 w-4 mr-1" /> Mark All Read
                    </Button>
                )}
            </div>

            {notifications.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                    <Bell className="h-10 w-10 opacity-40" />
                    <p className="text-lg font-medium">No notifications</p>
                    <p className="text-sm">You&apos;re all caught up!</p>
                </div>
            )}

            {unread.length > 0 && (
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Unread ({unread.length})
                    </h2>
                    {unread.map(renderNotification)}
                </div>
            )}

            {read.length > 0 && (
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Read
                    </h2>
                    {read.map(renderNotification)}
                </div>
            )}
        </div>
    );
}