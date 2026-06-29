'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, LogOut, Menu, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useNotifications } from '@/hooks/useNotifications';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useState } from 'react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotifications();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const initials = user?.name
      ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
      : 'U';

  return (
      <>
        <header className="sticky top-0 z-40 flex h-16 items-center border-b px-4 gap-3">
          {/* Sidebar toggle */}
          <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="shrink-0">
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo */}
          <Link
              href="/dashboard"
              className="flex items-center gap-2 shrink-0"
          >
            {/* Purple gradient icon mark */}
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-bold">FP</span>
            </div>
            <span className="font-bold text-lg text-primary">FYPals</span>
          </Link>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            {/* Dark / Light toggle */}
            <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark'
                  ? <Sun className="h-4 w-4 text-amber-400" />
                  : <Moon className="h-4 w-4 text-violet-500" />
              }
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="icon" asChild className="relative">
              <Link href="/notifications">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary text-primary-foreground border-0">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                )}
              </Link>
            </Button>

            {/* Profile avatar */}
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/profile/${user?.id}`}>
                <Avatar className="h-8 w-8 ring-2 ring-primary/30">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </Button>

            {/* Logout */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setLogoutDialogOpen(true)}
                title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Sign Out</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to sign out of FYPals?
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleLogout}>
                Sign Out
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
  );
}