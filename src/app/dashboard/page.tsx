'use client';

import { useEffect, useState } from 'react';
import { getDashboardStats } from '@/lib/api/admin';
import { formatNumber, formatRelativeTime } from '@/lib/utils';
import {
  Users,
  FileText,
  Users2,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  MessageSquare,
  Heart,
  UserPlus,
  Calendar,
} from 'lucide-react';

interface DashboardStats {
  stats: {
    totalUsers: number;
    totalPosts: number;
    totalGroups: number;
    totalJobs: number;
    totalCompanies: number;
    totalConnections: number;
    totalMessages: number;
    activeUsersToday: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
    bannedUsers: number;
    verifiedUsers: number;
  };
  recentSignups: Array<{
    id: string;
    name: string;
    email: string;
    username: string;
    profileImage: string | null;
    createdAt: string;
    isVerified: boolean;
    college: string | null;
  }>;
}

function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeLabel,
  color,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  change?: number;
  changeLabel?: string;
  color: string;
}) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {formatNumber(value)}
          </p>
          {change !== undefined && (
            <div className="flex items-center mt-2">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : isNegative ? (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              ) : null}
              <span
                className={`text-sm font-medium ${
                  isPositive
                    ? 'text-green-500'
                    : isNegative
                    ? 'text-red-500'
                    : 'text-gray-500'
                }`}
              >
                {isPositive ? '+' : ''}
                {change}%
              </span>
              {changeLabel && (
                <span className="text-sm text-gray-500 ml-1">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className={`p-4 rounded-xl ${color}`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );
}

function ActivityItem({
  activity,
}: {
  activity: {
    id: string;
    type: string;
    description: string;
    createdAt: string;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  };
}) {
  const getIcon = () => {
    switch (activity.type) {
      case 'user_registered':
        return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'post_created':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'connection':
        return <Users className="w-4 h-4 text-cyan-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="p-2 bg-gray-100 rounded-lg">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{activity.description}</p>
        {activity.user && (
          <p className="text-xs text-gray-500 mt-0.5">
            by {activity.user.firstName} {activity.user.lastName}
          </p>
        )}
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap">
        {formatRelativeTime(activity.createdAt)}
      </span>
    </div>
  );
}

function QuickStatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{formatNumber(value)}</p>
        <p className="text-sm text-gray-500">{title}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const { stats: s, recentSignups } = stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome back! Here's what's happening with Vormex.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={s.totalUsers}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Posts"
          value={s.totalPosts}
          icon={FileText}
          color="bg-green-500"
        />
        <StatCard
          title="Total Groups"
          value={s.totalGroups}
          icon={Users2}
          color="bg-purple-500"
        />
        <StatCard
          title="Total Jobs"
          value={s.totalJobs}
          icon={Briefcase}
          color="bg-orange-500"
        />
      </div>

      {/* Secondary Stats & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Overview
          </h2>
          <div className="space-y-4">
            <QuickStatCard
              title="New Users Today"
              value={s.newUsersToday}
              icon={UserPlus}
              color="bg-blue-500"
            />
            <QuickStatCard
              title="New Users This Week"
              value={s.newUsersThisWeek}
              icon={UserPlus}
              color="bg-green-500"
            />
            <QuickStatCard
              title="Active Users Today"
              value={s.activeUsersToday}
              icon={Eye}
              color="bg-cyan-500"
            />
            <QuickStatCard
              title="Total Connections"
              value={s.totalConnections}
              icon={Users}
              color="bg-purple-500"
            />
          </div>
        </div>

        {/* Recent Signups */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Signups
            </h2>
            <a
              href="/dashboard/users"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View all
            </a>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {recentSignups && recentSignups.length > 0 ? (
              recentSignups.map((user) => (
                <div key={user.id} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <UserPlus className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 font-medium">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    {user.college && (
                      <p className="text-xs text-gray-400">{user.college}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatRelativeTime(user.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">
                No recent signups
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <a
            href="/dashboard/users"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Users className="w-6 h-6 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">
              Manage Users
            </span>
          </a>
          <a
            href="/dashboard/posts"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <FileText className="w-6 h-6 text-green-500" />
            <span className="text-sm font-medium text-gray-700">
              Manage Posts
            </span>
          </a>
          <a
            href="/dashboard/groups"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <Users2 className="w-6 h-6 text-purple-500" />
            <span className="text-sm font-medium text-gray-700">
              Manage Groups
            </span>
          </a>
          <a
            href="/dashboard/jobs"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-colors"
          >
            <Briefcase className="w-6 h-6 text-orange-500" />
            <span className="text-sm font-medium text-gray-700">
              Manage Jobs
            </span>
          </a>
          <a
            href="/dashboard/analytics"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-cyan-500 hover:bg-cyan-50 transition-colors"
          >
            <TrendingUp className="w-6 h-6 text-cyan-500" />
            <span className="text-sm font-medium text-gray-700">
              View Analytics
            </span>
          </a>
          <a
            href="/dashboard/audit-logs"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-gray-500 hover:bg-gray-50 transition-colors"
          >
            <Activity className="w-6 h-6 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              Audit Logs
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
