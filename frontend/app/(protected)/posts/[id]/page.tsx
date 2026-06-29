'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ThumbsUp, ThumbsDown, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimeAgo } from '@/lib/utils';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Post, Comment } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  LOOKING_FOR_MEMBER: 'Looking for Member',
  PROJECT_IDEA: 'Project',
  GENERAL: 'General',
};

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const router = useRouter();
  const [post, setPost] = useState<any | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const loadPost = async () => {
    try {
      const res = await api.get(`/posts/${id}`) as any;
      const postData = res?.post ?? res;
      const commentsData = res?.comments ?? [];
      setPost(postData);
      setComments(Array.isArray(commentsData) ? commentsData : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPost(); }, [id]);

  const handleVote = async (voteType: 'UPVOTE' | 'DOWNVOTE') => {
    try {
      const res = await api.post(`/posts/${id}/vote`, { voteType }) as any;
      setPost((prev: any) => prev ? {
        ...prev,
        voteCount: res?.voteCount ?? prev.voteCount,
        upvoteCount: res?.upvoteCount ?? prev.upvoteCount,
        downvoteCount: res?.downvoteCount ?? prev.downvoteCount,
      } : prev);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to vote');
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/posts/${id}/comments`, { content: commentText });
      setCommentText('');
      await loadPost();
      toast.success('Comment added');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: number) => {
    try {
      await api.put(`/posts/comments/${commentId}`, { content: editText });
      setEditingCommentId(null);
      await loadPost();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to edit comment');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await api.delete(`/posts/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to delete comment');
    }
  };

  if (loading) {
    return (
        <div className="max-w-2xl space-y-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
    );
  }

  if (!post) return <p className="text-muted-foreground">Post not found.</p>;

  return (
      <div className="max-w-2xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="secondary">{CATEGORY_LABELS[post.category] ?? post.category}</Badge>
              <span className="text-sm text-muted-foreground">{post.authorName}</span>
              <span className="text-sm text-muted-foreground ml-auto">{formatTimeAgo(post.createdAt)}</span>
            </div>
            <h1 className="text-xl font-bold">{post.title}</h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm whitespace-pre-line">{post.description}</p>
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" className="gap-1" onClick={() => handleVote('UPVOTE')}>
                <ThumbsUp className="h-4 w-4" />
                <span className="text-xs">{post.upvoteCount ?? 0}</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => handleVote('DOWNVOTE')}>
                <ThumbsDown className="h-4 w-4" />
                <span className="text-xs">{post.downvoteCount ?? 0}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="font-semibold">{comments.length} Comment{comments.length !== 1 ? 's' : ''}</h2>
          {comments.map((c: any) => (
              <Card key={c.id}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-xs">
                        {(c.authorName ?? 'Unknown').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{c.authorName ?? 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(c.createdAt)}</span>
                        {c.authorId === user?.id && (
                            <div className="ml-auto flex gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6"
                                      onClick={() => { setEditingCommentId(c.id); setEditText(c.content); }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                                      onClick={() => handleDeleteComment(c.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                        )}
                      </div>
                      {editingCommentId === c.id ? (
                          <div className="mt-1 space-y-1">
                            <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2} />
                            <div className="flex gap-1">
                              <Button size="sm" onClick={() => handleEditComment(c.id)}>Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingCommentId(null)}>Cancel</Button>
                            </div>
                          </div>
                      ) : (
                          <p className="text-sm mt-0.5">{c.content}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
          ))}
        </div>

        <div className="space-y-2">
          <Textarea
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
          />
          <Button onClick={handleComment} disabled={submitting || !commentText.trim()}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Post Comment
          </Button>
        </div>
      </div>
  );
}