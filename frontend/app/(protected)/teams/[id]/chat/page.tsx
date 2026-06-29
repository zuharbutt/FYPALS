'use client';

import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatWindow } from '@/components/chat/ChatWindow';
import Link from 'next/link';

export default function TeamChatPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/teams/${id}`}><ArrowLeft className="h-4 w-4 mr-1" /> Back to Team</Link>
        </Button>
        <h1 className="text-xl font-bold">Team Chat</h1>
      </div>
      <ChatWindow teamId={Number(id)} />
    </div>
  );
}
