'use client';

import { useState } from 'react';
import { Send, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';

export default function AdminEmailPage() {
    const [to, setTo]           = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    // User lookup
    const [lookupQuery, setLookupQuery] = useState('');
    const [lookupResults, setLookupResults] = useState<any[]>([]);
    const [looking, setLooking] = useState(false);

    const lookupUser = async () => {
        if (!lookupQuery.trim()) return;
        setLooking(true);
        try {
            // Use admin/users which returns full user data including email
            const res = await api.get('/admin/users', {
                params: { page: 0, size: 20 },
            }) as any;
            const all: any[] = res?.content ?? [];
            const q = lookupQuery.trim().toLowerCase();
            const filtered = all.filter(u =>
                u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
            );
            setLookupResults(filtered.slice(0, 8));
        } catch {
            toast.error('User lookup failed');
        } finally {
            setLooking(false);
        }
    };

    const sendEmail = async () => {
        if (!to.trim())      { toast.error('Recipient email is required');  return; }
        if (!subject.trim()) { toast.error('Subject is required');          return; }
        if (!message.trim()) { toast.error('Message body is required');     return; }

        setSending(true);
        try {
            await api.post('/admin/send-email', {
                to:      to.trim(),
                subject: subject.trim(),
                message: message.trim(),
            });
            toast.success(`Email sent to ${to.trim()}`);
            setTo(''); setSubject(''); setMessage('');
            setLookupQuery(''); setLookupResults([]);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Failed to send email');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-5">
            <div>
                <h1 className="text-2xl font-bold">Send Email</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Send a direct email to any user using the platform email account.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-5">

                {/* User lookup helper */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Find a User's Email</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Search by name…"
                                value={lookupQuery}
                                onChange={(e) => setLookupQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') lookupUser(); }}
                            />
                            <Button variant="outline" size="sm" onClick={lookupUser} disabled={looking}>
                                {looking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </Button>
                        </div>

                        {lookupResults.length > 0 && (
                            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                                {lookupResults.map((u) => (
                                    <button
                                        key={u.id}
                                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/40 text-left transition-colors"
                                        onClick={() => {
                                            setTo(u.email ?? '');
                                            setLookupResults([]);
                                            setLookupQuery('');
                                        }}
                                    >
                                        <div>
                                            <p className="text-sm font-medium">{u.name}</p>
                                            <p className="text-xs text-muted-foreground">{u.email}</p>
                                        </div>
                                        <span className="text-xs text-primary shrink-0 ml-2">Use →</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Compose */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Compose</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>To (email address) <span className="text-destructive">*</span></Label>
                            <Input
                                type="email"
                                placeholder="user@university.edu"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Subject <span className="text-destructive">*</span></Label>
                            <Input
                                placeholder="e.g. Important Update Regarding Your FYP"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Message <span className="text-destructive">*</span></Label>
                            <Textarea
                                placeholder="Write your message here…"
                                rows={8}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <p className="text-xs text-muted-foreground">
                                Sent from the FYPals platform email account.
                            </p>
                            <Button onClick={sendEmail} disabled={sending}>
                                {sending
                                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
                                    : <><Send className="mr-2 h-4 w-4" /> Send Email</>
                                }
                            </Button>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}