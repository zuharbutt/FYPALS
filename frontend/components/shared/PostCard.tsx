'use client';

import Link from 'next/link';
import { ThumbsUp, ThumbsDown, MessageSquare, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatTimeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Post, PostCategory } from '@/types';

const categoryConfig: Record<PostCategory, { label: string; variant: 'default' | 'info' | 'success' | 'warning' }> = {
  LOOKING_FOR_MEMBER:  { label: 'Looking for Member', variant: 'info' },
  PROJECT_IDEA:        { label: 'Project',             variant: 'success' },
  GENERAL:             { label: 'General',             variant: 'default' },
  REQUIREMENT:         { label: 'Requirement',         variant: 'warning' },
  LOOKING_FOR_ADVISOR: { label: 'Looking for Advisor', variant: 'info' },
};

interface PostCardProps {
  post: Post;
  onVote?: (postId: number, voteCount: number, upvoteCount: number, downvoteCount: number) => void;
}

export function PostCard({ post, onVote }: PostCardProps) {
  const cat = categoryConfig[post.category] ?? categoryConfig.GENERAL;
  const initials = post.authorName
      ? post.authorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
      : 'U';

  const handleVote = async (voteType: 'UPVOTE' | 'DOWNVOTE') => {
    try {
      const result = await api.post(`/posts/${post.id}/vote`, { voteType }) as any;
      onVote?.(
          post.id,
          result?.voteCount ?? post.voteCount,
          result?.upvoteCount ?? 0,
          result?.downvoteCount ?? 0
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to vote');
    }
  };

  return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant={cat.variant}>{cat.label}</Badge>
                <span className="text-xs text-muted-foreground">{post.authorName}</span>
                <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                  {formatTimeAgo(post.createdAt)}
              </span>
              </div>
              <Link href={`/posts/${post.id}`} className="hover:underline">
                <h3 className="font-semibold text-sm leading-tight line-clamp-2">{post.title}</h3>
              </Link>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={() => handleVote('UPVOTE')}>
                  <ThumbsUp className="h-3.5 w-3.5" />
                  <span className="text-xs">{(post as any).upvoteCount ?? 0}</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={() => handleVote('DOWNVOTE')}>
                  <ThumbsDown className="h-3.5 w-3.5" />
                  <span className="text-xs">{(post as any).downvoteCount ?? 0}</span>
                </Button>
                <Link href={`/posts/${post.id}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {post.commentCount}
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
  );
}

export function PostCardSkeleton() {
  return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-3 bg-muted animate-pulse rounded w-full" />
              <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
            </div>
          </div>
        </CardContent>
      </Card>
  );
}