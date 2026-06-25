'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserMinus,
  Users2,
} from 'lucide-react';
import {
  clearAdminGroupChat,
  deleteGroup,
  getAdminGroupMembers,
  getGroups,
  removeAdminGroupMember,
  updateAdminGroupMemberRole,
  type AdminGroup,
  type AdminGroupMember,
} from '@/lib/api/admin';
import { formatRelativeTime } from '@/lib/utils';

const clearGroupChatConfirmation = 'CLEAR GROUP CHAT';
const roleOptions = ['member', 'moderator', 'admin', 'owner'] as const;

function readError(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const err = error as { message?: string; response?: { data?: { error?: string } } };
    return err.response?.data?.error || err.message || fallback;
  }
  return fallback;
}

function groupAvatar(group: AdminGroup) {
  return group.iconImage || group.coverImage || group.imageUrl || null;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedGroup, setSelectedGroup] = useState<AdminGroup | null>(null);
  const [members, setMembers] = useState<AdminGroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('all');
  const [memberPage, setMemberPage] = useState(1);
  const [memberTotalPages, setMemberTotalPages] = useState(1);
  const [memberTotal, setMemberTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getGroups({
        page,
        limit: 12,
        search: debouncedSearch || undefined,
      });
      setGroups(response.groups);
      setTotal(response.pagination.total);
      setTotalPages(Math.max(response.pagination.totalPages, 1));
    } catch (err) {
      setError(readError(err, 'Failed to load groups'));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const loadMembers = useCallback(async () => {
    if (!selectedGroup) return;
    setMembersLoading(true);
    setMembersError(null);
    try {
      const response = await getAdminGroupMembers(selectedGroup.id, {
        page: memberPage,
        limit: 12,
        search: memberSearch.trim() || undefined,
        role: memberRoleFilter,
      });
      setMembers(response.members);
      setMemberTotal(response.pagination.total);
      setMemberTotalPages(Math.max(response.pagination.totalPages, 1));
      setSelectedGroup(response.group);
    } catch (err) {
      setMembersError(readError(err, 'Failed to load members'));
    } finally {
      setMembersLoading(false);
    }
  }, [selectedGroup?.id, memberPage, memberSearch, memberRoleFilter]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const totalMembers = useMemo(
    () => groups.reduce((sum, group) => sum + (group._count?.members || 0), 0),
    [groups]
  );

  const totalMessages = useMemo(
    () => groups.reduce((sum, group) => sum + (group._count?.messages ?? group._count?.posts ?? 0), 0),
    [groups]
  );

  const openGroup = (group: AdminGroup) => {
    setSelectedGroup(group);
    setMemberSearch('');
    setMemberRoleFilter('all');
    setMemberPage(1);
    setMembers([]);
    setSuccessMessage(null);
  };

  const handleDeleteGroup = async (group: AdminGroup) => {
    const confirmed = window.confirm(
      `Delete "${group.name}" permanently? This also removes members, group chat rows, and group media.`
    );
    if (!confirmed) return;

    setActionLoading(`delete-${group.id}`);
    setSuccessMessage(null);
    try {
      await deleteGroup(group.id);
      setGroups((current) => current.filter((entry) => entry.id !== group.id));
      if (selectedGroup?.id === group.id) {
        setSelectedGroup(null);
        setMembers([]);
      }
      setSuccessMessage('Group deleted successfully.');
      await loadGroups();
    } catch (err) {
      alert(readError(err, 'Failed to delete group'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearGroupChat = async (group: AdminGroup) => {
    const typed = window.prompt(
      `Type ${clearGroupChatConfirmation} to clear chat history for "${group.name}".`
    );
    if (typed?.trim() !== clearGroupChatConfirmation) return;

    setActionLoading(`clear-${group.id}`);
    setSuccessMessage(null);
    try {
      const response = await clearAdminGroupChat(group.id, typed.trim());
      setGroups((current) =>
        current.map((entry) =>
          entry.id === group.id
            ? {
                ...entry,
                _count: {
                  ...entry._count,
                  posts: 0,
                  messages: 0,
                },
              }
            : entry
        )
      );
      if (selectedGroup?.id === group.id) {
        setSelectedGroup((current) =>
          current
            ? {
                ...current,
                _count: {
                  ...current._count,
                  posts: 0,
                  messages: 0,
                },
              }
            : current
        );
      }
      setSuccessMessage(
        `${response.group.name} chat cleared. Removed ${response.deleted.groupMessages.toLocaleString()} messages and ${response.media.deleted.toLocaleString()} media files.`
      );
      await loadGroups();
    } catch (err) {
      alert(readError(err, 'Failed to clear group chat'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (member: AdminGroupMember) => {
    if (!selectedGroup) return;
    const confirmed = window.confirm(`Remove ${member.user.name} from "${selectedGroup.name}"?`);
    if (!confirmed) return;

    setActionLoading(`remove-${member.userId}`);
    try {
      const response = await removeAdminGroupMember(selectedGroup.id, member.userId);
      setMembers((current) => current.filter((entry) => entry.userId !== member.userId));
      setMemberTotal((current) => Math.max(0, current - 1));
      setSelectedGroup((current) =>
        current ? { ...current, memberCount: response.memberCount, _count: { ...current._count, members: response.memberCount } } : current
      );
      await loadGroups();
    } catch (err) {
      alert(readError(err, 'Failed to remove member'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (member: AdminGroupMember, role: string) => {
    if (!selectedGroup || member.role === role) return;
    setActionLoading(`role-${member.userId}`);
    try {
      await updateAdminGroupMemberRole(selectedGroup.id, member.userId, role);
      setMembers((current) =>
        current.map((entry) =>
          entry.userId === member.userId ? { ...entry, role } : entry
        )
      );
    } catch (err) {
      alert(readError(err, 'Failed to update member role'));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="text-gray-500 mt-1">
            Manage {total.toLocaleString()} groups, members, and group chat storage.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadGroups()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Groups</p>
          <p className="text-2xl font-bold text-gray-900">{total.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Visible on Page</p>
          <p className="text-2xl font-bold text-blue-600">{groups.length.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Members Shown</p>
          <p className="text-2xl font-bold text-green-600">{totalMembers.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Chat Messages Shown</p>
          <p className="text-2xl font-bold text-purple-600">{totalMessages.toLocaleString()}</p>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search groups by name, slug, or description..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className={selectedGroup ? 'grid gap-6 xl:grid-cols-[1fr_430px]' : 'grid gap-6'}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={() => loadGroups()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-20">
              <Users2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No groups found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {groups.map((group) => {
                const image = groupAvatar(group);
                const messageCount = group._count.messages ?? group._count.posts;
                const isSelected = selectedGroup?.id === group.id;
                return (
                  <div
                    key={group.id}
                    className={`p-5 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                      <button
                        type="button"
                        onClick={() => openGroup(group)}
                        className="flex flex-1 items-start gap-4 text-left"
                      >
                        {image ? (
                          <img
                            src={image}
                            alt={group.name}
                            className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {group.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-semibold text-gray-900 truncate">{group.name}</h2>
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                              {group.privacy}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {group.description || 'No description'}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                            <span>{group._count.members.toLocaleString()} members</span>
                            <span>{messageCount.toLocaleString()} messages</span>
                            <span>Created by {group.createdBy?.name || 'Unknown'}</span>
                            <span>{formatRelativeTime(group.createdAt)}</span>
                          </div>
                        </div>
                      </button>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <button
                          type="button"
                          onClick={() => openGroup(group)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-white"
                        >
                          <Shield className="w-4 h-4" />
                          Manage
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearGroupChat(group)}
                          disabled={actionLoading === `clear-${group.id}`}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Clear Chat
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(group)}
                          disabled={actionLoading === `delete-${group.id}`}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 disabled:opacity-50"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {selectedGroup && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-fit">
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Manage Group</p>
                  <h2 className="text-lg font-bold text-gray-900 mt-1">{selectedGroup.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {memberTotal.toLocaleString()} members
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGroup(null)}
                  className="text-sm text-gray-500 hover:text-gray-900"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => handleClearGroupChat(selectedGroup)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
                >
                  <MessageSquare className="w-4 h-4" />
                  Clear Chat
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteGroup(selectedGroup)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>

            <div className="p-5 border-b border-gray-200 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={memberSearch}
                  onChange={(event) => {
                    setMemberSearch(event.target.value);
                    setMemberPage(1);
                  }}
                  placeholder="Search members..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <select
                value={memberRoleFilter}
                onChange={(event) => {
                  setMemberRoleFilter(event.target.value);
                  setMemberPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All roles</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            {membersError && (
              <div className="m-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {membersError}
              </div>
            )}

            {membersLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-9 w-9 border-4 border-blue-500 border-t-transparent"></div>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-16 px-5">
                <AlertTriangle className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No members found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {members.map((member) => (
                  <div key={member.id} className="p-4">
                    <div className="flex items-start gap-3">
                      {member.user.profileImage ? (
                        <img
                          src={member.user.profileImage}
                          alt={member.user.name}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                          {member.user.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">{member.user.name}</p>
                          {member.isCreator && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              creator
                            </span>
                          )}
                          {member.user.isBanned && (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                              banned
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          @{member.user.username || 'unknown'} {member.user.email ? `- ${member.user.email}` : ''}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Joined {formatRelativeTime(member.joinedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <select
                        value={member.role}
                        disabled={actionLoading === `role-${member.userId}`}
                        onChange={(event) => handleRoleChange(member, event.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member)}
                        disabled={member.isCreator || actionLoading === `remove-${member.userId}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <UserMinus className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => setMemberPage((current) => Math.max(1, current - 1))}
                disabled={memberPage === 1}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-sm text-gray-500">
                {memberPage} / {memberTotalPages}
              </span>
              <button
                onClick={() => setMemberPage((current) => Math.min(memberTotalPages, current + 1))}
                disabled={memberPage >= memberTotalPages}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
