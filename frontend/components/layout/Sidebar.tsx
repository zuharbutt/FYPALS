'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  Search,
  UserCog, Mail,
  GraduationCap,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const advisorLinks: NavItem[] = [
  { label: 'Dashboard', href: '/advisor/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Posts',     href: '/posts',              icon: <FileText        className="h-4 w-4" /> },
  { label: 'Search',    href: '/search',             icon: <Search          className="h-4 w-4" /> },
];

const fypStaffLinks: NavItem[] = [
  { label: 'Dashboard', href: '/fyp-staff/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Posts',     href: '/posts',               icon: <FileText        className="h-4 w-4" /> },
  { label: 'Search',    href: '/search',              icon: <Search          className="h-4 w-4" /> },
];

const studentLinks: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Posts',     href: '/posts',     icon: <FileText        className="h-4 w-4" /> },
  { label: 'My Team',   href: '/teams',     icon: <Users           className="h-4 w-4" /> },
  { label: 'Search',    href: '/search',    icon: <Search          className="h-4 w-4" /> },
];

const adminLinks: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Users',     href: '/admin/users',     icon: <UserCog         className="h-4 w-4" /> },
  { label: 'Teams',     href: '/admin/teams',     icon: <Users           className="h-4 w-4" /> },
  { label: 'Posts',     href: '/admin/posts',     icon: <FileText        className="h-4 w-4" /> },
  { label: 'Email',     href: '/admin/email',     icon: <Mail            className="h-4 w-4" /> },
];

export function Sidebar() {
  const { user } = useAuthStore();
  const pathname = usePathname();

  const links =
      user?.role === 'ADMIN'     ? adminLinks     :
          user?.role === 'ADVISOR'   ? advisorLinks   :
              user?.role === 'FYP_STAFF' ? fypStaffLinks  :
                  studentLinks;

  return (
      <aside className="w-56 shrink-0 border-r h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
        <nav className="flex flex-col gap-0.5 p-3">
          {/* Role label */}
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-2 mt-1">
            {user?.role === 'ADMIN' ? 'Admin' :
                user?.role === 'ADVISOR' ? 'Advisor' :
                    user?.role === 'FYP_STAFF' ? 'FYP Staff' : 'Student'}
          </p>

          {links.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
                <Link
                    key={item.href + item.label}
                    href={item.href}
                    className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                        isActive
                            ? 'bg-[hsl(var(--sidebar-active-bg))] text-[hsl(var(--sidebar-active-fg))] shadow-sm'
                            : 'text-muted-foreground hover:bg-[hsl(var(--sidebar-active-bg))/50] hover:text-foreground'
                    )}
                >
                  {/* Active indicator bar */}
                  <span className={cn(
                      'absolute left-0 h-6 w-0.5 rounded-r-full bg-primary transition-all',
                      isActive ? 'opacity-100' : 'opacity-0'
                  )} />
                  <span className={cn(isActive ? 'text-primary' : '')}>
                  {item.icon}
                </span>
                  {item.label}
                </Link>
            );
          })}
        </nav>
      </aside>
  );
}