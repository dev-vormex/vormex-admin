'use client';

import { useEffect, useState } from 'react';
import { getUsers, updateUser, deleteUser, banUser, unbanUser, setUserReelsAccess, AdminUserListItem, UsersResponse as APIUsersResponse } from '@/lib/api/admin';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import {
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Mail,
  Calendar,
  MapPin,
  Shield,
  ShieldOff,
  Video,
  Gamepad2,
} from 'lucide-react';

type ProfileThemeKey = 'default' | 'game_retro';

const profileThemeOptions: Array<{ key: ProfileThemeKey; label: string }> = [
  { key: 'default', label: 'Default' },
  { key: 'game_retro', label: 'Game Retro' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified' | 'banned'>('all');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await getUsers({
        page,
        limit: 10,
        search: search || undefined,
        status: filter !== 'all' ? filter : undefined,
      });
      setUsers(response.users);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, filter]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (page === 1) {
        fetchUsers();
      } else {
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [search]);

  const handleDelete = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await deleteUser(selectedUser.id);
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBan = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      if (selectedUser.isBanned) {
        await unbanUser(selectedUser.id);
      } else {
        await banUser(selectedUser.id, 'Banned by admin');
      }
      setShowBanModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user ban status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAdmin = async (user: AdminUserListItem) => {
    try {
      await updateUser(user.id, { isAdmin: !user.isAdmin });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update admin status');
    }
  };

  const handleToggleReelsAccess = async (user: AdminUserListItem) => {
    try {
      await setUserReelsAccess(user.id, !user.reelsAccess);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update reels access');
    }
  };

  const handleProfileThemeChange = async (user: AdminUserListItem, profileTheme: ProfileThemeKey) => {
    try {
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, profileTheme } : item
        )
      );
      await updateUser(user.id, { profileTheme });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update profile theme');
      fetchUsers();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">
            Manage all {total.toLocaleString()} users on the platform
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Users</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                      User
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                      College
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                      Stats
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                      Reels Access
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                      Profile Theme
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                      Joined
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.profileImage ? (
                            <img
                              src={user.profileImage}
                              alt={user.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                              {user.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.name}
                              {user.isAdmin && (
                                <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                  Admin
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            {user.username && (
                              <p className="text-xs text-gray-400">
                                @{user.username}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {user.isBanned ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full w-fit">
                              <Ban className="w-3 h-3" />
                              Banned
                            </span>
                          ) : user.isVerified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full w-fit">
                              <CheckCircle className="w-3 h-3" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full w-fit">
                              <XCircle className="w-3 h-3" />
                              Unverified
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.college ? (
                          <div className="text-sm text-gray-600">
                            <p>{user.college}</p>
                            {user.branch && <p className="text-xs text-gray-400">{user.branch}</p>}
                            {user.graduationYear && <p className="text-xs text-gray-400">{user.graduationYear}</p>}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600">
                            {user._count?.posts || 0} posts
                          </span>
                          <span className="text-gray-600">
                            {(user._count?.connectionsSent || 0) + (user._count?.connectionsReceived || 0)} connections
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${user.reelsAccess ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {user.reelsAccess ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Gamepad2 className="w-4 h-4 text-gray-400" />
                          <select
                            value={user.profileTheme || 'default'}
                            onChange={(e) =>
                              handleProfileThemeChange(user, e.target.value as ProfileThemeKey)
                            }
                            className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {profileThemeOptions.map((option) => (
                              <option key={option.key} value={option.key}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(user.createdAt)}
                        </div>
                        {user.lastActiveAt && (
                          <p className="text-xs text-gray-400 mt-1">
                            Last active: {formatRelativeTime(user.lastActiveAt)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={() =>
                              setDropdownOpen(
                                dropdownOpen === user.id ? null : user.id
                              )
                            }
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-500" />
                          </button>
                          {dropdownOpen === user.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                              <a
                                href={`/dashboard/users/${user.id}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </a>
                              <a
                                href={`/dashboard/users/${user.id}/edit`}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Edit className="w-4 h-4" />
                                Edit User
                              </a>
                              <button
                                onClick={() => {
                                  handleToggleAdmin(user);
                                  setDropdownOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                {user.isAdmin ? (
                                  <>
                                    <ShieldOff className="w-4 h-4" />
                                    Remove Admin
                                  </>
                                ) : (
                                  <>
                                    <Shield className="w-4 h-4" />
                                    Make Admin
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  handleToggleReelsAccess(user);
                                  setDropdownOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Video className="w-4 h-4" />
                                {user.reelsAccess ? 'Disable Reels' : 'Enable Reels'}
                              </button>
                              <hr className="my-1" />
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowBanModal(true);
                                  setDropdownOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50"
                              >
                                <Ban className="w-4 h-4" />
                                {user.isBanned ? 'Unban User' : 'Ban User'}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDeleteModal(true);
                                  setDropdownOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete User
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing {(page - 1) * 10 + 1} to{' '}
                {Math.min(page * 10, total)} of {total} users
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete User
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete{' '}
              <strong>
                {selectedUser.name}
              </strong>
              ? This action cannot be undone and will delete all their data.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {selectedUser.isBanned ? 'Unban User' : 'Ban User'}
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to{' '}
              {selectedUser.isBanned ? 'unban' : 'ban'}{' '}
              <strong>
                {selectedUser.name}
              </strong>
              ?
              {!selectedUser.isBanned &&
                ' They will no longer be able to access the platform.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBan}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-lg text-white disabled:opacity-50 ${
                  selectedUser.isBanned
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {actionLoading
                  ? 'Processing...'
                  : selectedUser.isBanned
                  ? 'Unban'
                  : 'Ban'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
