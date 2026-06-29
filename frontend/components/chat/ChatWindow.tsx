'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Send } from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { formatTimeAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import type { ChatMessage } from '@/types';

interface ChatWindowProps {
  teamId: number;
}

export function ChatWindow({ teamId }: ChatWindowProps) {
  const { user } = useAuthStore();

  const [messages, setMessages]         = useState<ChatMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [connected, setConnected]       = useState(false);
  const [input, setInput]               = useState('');
  const clientRef                       = useRef<Client | null>(null);
  const bottomRef                       = useRef<HTMLDivElement>(null);

  // Use a ref so the WS subscription closure always reads the latest value
  // without needing to re-subscribe (which was the root cause of the race).
  const historyLoadedRef = useRef(false);
  const pendingWsMessages = useRef<ChatMessage[]>([]);

  // ── Load chat history FIRST ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    setHistoryLoaded(false);
    historyLoadedRef.current = false;
    setMessages([]);
    pendingWsMessages.current = [];

    api.get(`/teams/${teamId}/chat/history`)
        .then((data: any) => {
          if (cancelled) return;
          // Backend returns either a plain array OR {success, data: [...]} wrapper
          const history: ChatMessage[] = Array.isArray(data)
              ? data
              : Array.isArray((data as any)?.data)
                  ? (data as any).data
                  : [];

          // Flush any WS messages that arrived while history was loading
          const pending = pendingWsMessages.current;
          pendingWsMessages.current = [];

          const merged = [...history];
          for (const ws of pending) {
            const isDuplicate = merged.some(
                (m) =>
                    m.senderId === ws.senderId &&
                    m.content === ws.content &&
                    m.timestamp === ws.timestamp
            );
            if (!isDuplicate) merged.push(ws);
          }

          setMessages(merged);
          historyLoadedRef.current = true;
          setHistoryLoaded(true);
        })
        .catch(() => {
          if (!cancelled) {
            setMessages([]);
            historyLoadedRef.current = true;
            setHistoryLoaded(true);
          }
        });

    return () => { cancelled = true; };
  }, [teamId]);

  // ── WebSocket connection ─────────────────────────────────────────────────
  // NOTE: This effect does NOT depend on historyLoaded — it connects once per
  // teamId. The subscription callback reads historyLoadedRef (a ref) so it
  // always sees the current value without needing to re-subscribe.
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${process.env.NEXT_PUBLIC_API_URL}/ws`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/team/${teamId}`, (msg) => {
          try {
            const incoming: ChatMessage = JSON.parse(msg.body);

            if (!historyLoadedRef.current) {
              // Buffer the message — history hasn't loaded yet
              pendingWsMessages.current.push(incoming);
              return;
            }

            setMessages((prev) => {
              const isDuplicate = prev.some(
                  (m) =>
                      m.senderId === incoming.senderId &&
                      m.content === incoming.content &&
                      m.timestamp === incoming.timestamp
              );
              return isDuplicate ? prev : [...prev, incoming];
            });
          } catch {
            // ignore malformed messages
          }
        });
      },
      onDisconnect:  () => setConnected(false),
      onStompError:  () => setConnected(false),
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  }, [teamId]); // only teamId — not historyLoaded

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Send ─────────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    if (!input.trim() || !user || !clientRef.current) return;
    clientRef.current.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({
        teamId,
        senderId:    user.id,
        senderName:  user.name,
        content:     input.trim(),
        messageType: 'TEXT',
      }),
    });
    setInput('');
  }, [input, user, teamId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
      <div className="flex flex-col h-[600px] border rounded-lg bg-background">
        {/* Status bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b">
          <span className={cn('h-2 w-2 rounded-full', connected ? 'bg-green-500' : 'bg-red-500')} />
          <span className="text-xs text-muted-foreground">
          {connected ? 'Connected' : 'Reconnecting...'}
        </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!historyLoaded && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-sm">Loading messages...</p>
              </div>
          )}
          {historyLoaded && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <p className="text-2xl mb-2">👋</p>
                <p className="text-sm">No messages yet. Say hello!</p>
              </div>
          )}
          {messages.map((msg, i) => {
            const isOwn = msg.senderId === user?.id;
            return (
                <div key={msg.id ?? i} className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
                  <div className={cn(
                      'max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm',
                      isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  )}>
                    {msg.content}
                  </div>
                  <span className="text-xs text-muted-foreground mt-0.5">
                {isOwn ? 'You' : msg.senderName}
                    {msg.timestamp ? ` · ${formatTimeAgo(msg.timestamp)}` : ''}
              </span>
                </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t p-3 flex gap-2">
        <textarea
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[40px] max-h-[120px]"
            placeholder="Type a message... (Enter to send)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
        />
          <Button size="icon" onClick={handleSend} disabled={!input.trim() || !connected}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
  );
}