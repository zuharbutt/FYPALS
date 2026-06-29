import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { User } from '@/types';

interface UserCardProps {
  user: User;
}

export function UserCard({ user }: UserCardProps) {
  const initials = user.name?.slice(0, 2).toUpperCase() ?? 'U';
  const skills = user.skills ? user.skills.split(',').map((s) => s.trim()).filter(Boolean) : [];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-sm">{user.name}</p>
              {user.gpa != null && (
                <span className="text-xs text-muted-foreground">GPA: {user.gpa}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-2">{user.email}</p>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {skills.slice(0, 4).map((skill) => (
                  <Badge key={skill} variant="outline" className="text-xs py-0">
                    {skill}
                  </Badge>
                ))}
                {skills.length > 4 && (
                  <Badge variant="outline" className="text-xs py-0">
                    +{skills.length - 4}
                  </Badge>
                )}
              </div>
            )}
            <Button size="sm" variant="outline" asChild className="w-full mt-1 h-7 text-xs">
              <Link href={`/profile/${user.id}`}>View Profile</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function UserCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
            <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
            <div className="flex gap-1">
              <div className="h-5 w-12 bg-muted animate-pulse rounded-full" />
              <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
