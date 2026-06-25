'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  FileText,
  Users2,
  Briefcase,
  GraduationCap,
  Code2,
  Award,
  Video,
  Store,
  Gift,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield,
  Bell,
  Flag,
  Crown,
  Database,
  ShieldCheck,
  Megaphone,
} from 'lucide-react';
import { verifyAdminAccess, type AdminUser } from '@/lib/api/admin';
import { removeToken } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'Premium', href: '/dashboard/premium', icon: Crown },
  { name: 'Ads', href: '/dashboard/ads', icon: Megaphone },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Posts', href: '/dashboard/posts', icon: FileText },
  { name: 'Reels', href: '/dashboard/reels', icon: Video },
  { name: 'Reports', href: '/dashboard/reports', icon: Flag },
  { name: 'Student Verification', href: '/dashboard/student-verification', icon: GraduationCap },
  { name: 'Trust Safety', href: '/dashboard/trust-safety', icon: ShieldCheck },
  { name: 'Groups', href: '/dashboard/groups', icon: Users2 },
  { name: 'Maintenance', href: '/dashboard/maintenance', icon: Database },
  { name: 'Jobs', href: '/dashboard/jobs', icon: Briefcase },
  { name: 'Learning', href: '/dashboard/learning', icon: GraduationCap },
  { name: 'Challenges', href: '/dashboard/challenges', icon: Code2 },
  { name: 'Badges', href: '/dashboard/badges', icon: Award },
  { name: 'Store', href: '/dashboard/store', icon: Store },
  { name: 'Referrals', href: '/dashboard/referrals', icon: Gift },
  { name: 'Audit Logs', href: '/dashboard/audit-logs', icon: ClipboardList },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await verifyAdminAccess();
        if (!response.isAdmin) {
          removeToken();
          router.push('/login');
          return;
        }
        if (response.requiresTwoFactor) {
          router.replace('/login?step=2fa');
          return;
        }
        setAdmin(response.user);
      } catch {
        removeToken();
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Vormex</h1>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
            <button
              className="ml-auto lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User section */}
          <div className="border-t border-gray-800 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                {admin?.profileImage ? (
                  <img src={admin.profileImage} alt={admin.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-medium text-gray-400">
                    {admin?.name?.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{admin?.name}</p>
                <p className="text-xs text-gray-500 truncate">{admin?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur-sm border-b border-gray-800">
          <div className="flex items-center gap-4 px-4 py-3 lg:px-6">
            <button
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-800"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5 text-gray-400" />
            </button>
            <div className="flex-1" />
            <Link
              href="/dashboard/notifications"
              className={cn(
                'p-2 rounded-lg hover:bg-gray-800 relative',
                pathname === '/dashboard/notifications' && 'bg-gray-800'
              )}
            >
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
