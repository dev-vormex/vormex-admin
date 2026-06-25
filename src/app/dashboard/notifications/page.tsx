'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  type AdminNotificationAudience,
  type AdminUserListItem,
  getNotificationAudienceFilters,
  getUsers,
  sendAdminNotification,
} from '@/lib/api/admin';
import ReengagementQaPanel from '@/components/notifications/ReengagementQaPanel';
import { cn } from '@/lib/utils';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  GraduationCap,
  Megaphone,
  Search,
  Send,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

const audienceOptions: Array<{
  value: AdminNotificationAudience;
  title: string;
  description: string;
}> = [
  {
    value: 'all',
    title: 'All Users',
    description: 'Broadcast to everyone on Vormex in one go.',
  },
  {
    value: 'filtered',
    title: 'Filtered Audience',
    description: 'Target people by name search, colleges, and skills.',
  },
  {
    value: 'specific',
    title: 'Selected Users',
    description: 'Hand-pick exactly who should receive this message.',
  },
];

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<AdminNotificationAudience>('all');
  const [search, setSearch] = useState('');
  const [collegeSearch, setCollegeSearch] = useState('');
  const [skillSearch, setSkillSearch] = useState('');
  const [availableColleges, setAvailableColleges] = useState<string[]>([]);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [selectedColleges, setSelectedColleges] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<AdminUserListItem[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<AdminUserListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [recipientTotal, setRecipientTotal] = useState(0);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filteredColleges = availableColleges
    .filter((college) => college.toLowerCase().includes(collegeSearch.toLowerCase()))
    .slice(0, 32);
  const filteredSkills = availableSkills
    .filter((skill) => skill.toLowerCase().includes(skillSearch.toLowerCase()))
    .slice(0, 40);

  const fetchFilterOptions = async () => {
    setLoadingFilters(true);
    setLoadError(null);
    try {
      const response = await getNotificationAudienceFilters();
      setAvailableColleges(response.colleges);
      setAvailableSkills(response.skills);
    } catch (error: any) {
      setLoadError(error.response?.data?.error || error.message || 'Failed to load notification filters');
    } finally {
      setLoadingFilters(false);
    }
  };

  const fetchRecipients = async () => {
    setLoadingRecipients(true);
    setLoadError(null);

    try {
      const response = await getUsers({
        page,
        limit: 12,
        search: audience === 'all' ? undefined : search || undefined,
        excludeBanned: true,
        colleges: audience === 'filtered' || audience === 'specific' ? selectedColleges : undefined,
        skills: audience === 'filtered' || audience === 'specific' ? selectedSkills : undefined,
      });

      setCandidates(response.users);
      setTotalPages(Math.max(response.pagination.totalPages, 1));

      if (audience === 'specific') {
        setRecipientTotal(selectedUsers.length);
      } else {
        setRecipientTotal(response.pagination.total);
      }
    } catch (error: any) {
      setLoadError(error.response?.data?.error || error.message || 'Failed to load recipient preview');
    } finally {
      setLoadingRecipients(false);
    }
  };

  useEffect(() => {
    void fetchFilterOptions();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [audience, search, selectedColleges, selectedSkills]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchRecipients();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [page, audience, search, selectedColleges, selectedSkills, selectedUsers.length]);

  const toggleCollege = (college: string) => {
    setSelectedColleges((current) =>
      current.includes(college)
        ? current.filter((entry) => entry !== college)
        : [...current, college]
    );
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((current) =>
      current.includes(skill)
        ? current.filter((entry) => entry !== skill)
        : [...current, skill]
    );
  };

  const toggleSelectedUser = (user: AdminUserListItem) => {
    setSelectedUsers((current) => {
      const exists = current.some((entry) => entry.id === user.id);
      if (exists) {
        return current.filter((entry) => entry.id !== user.id);
      }
      return [...current, user];
    });
  };

  const isUserSelected = (userId: string) => {
    return selectedUsers.some((user) => user.id === userId);
  };

  const clearFilters = () => {
    setSearch('');
    setCollegeSearch('');
    setSkillSearch('');
    setSelectedColleges([]);
    setSelectedSkills([]);
  };

  const handleSend = async () => {
    setSubmitError(null);
    setSuccessMessage(null);

    if (!title.trim()) {
      setSubmitError('Notification title is required.');
      return;
    }

    if (!body.trim()) {
      setSubmitError('Notification description is required.');
      return;
    }

    if (audience === 'specific' && selectedUsers.length === 0) {
      setSubmitError('Choose at least one user before sending.');
      return;
    }

    if (audience === 'filtered' && recipientTotal === 0) {
      setSubmitError('Your current filters do not match any users.');
      return;
    }

    setSending(true);
    try {
      const response = await sendAdminNotification({
        audience,
        title: title.trim(),
        body: body.trim(),
        search: audience === 'filtered' ? search.trim() || undefined : undefined,
        colleges: audience === 'filtered' ? selectedColleges : undefined,
        skills: audience === 'filtered' ? selectedSkills : undefined,
        userIds: audience === 'specific' ? selectedUsers.map((user) => user.id) : undefined,
      });

      setSuccessMessage(
        `${response.message} Delivered to ${response.recipientsCount} users. Push reached ${response.pushSuccessCount} users with active devices.`
      );
      setTitle('');
      setBody('');
    } catch (error: any) {
      setSubmitError(error.response?.data?.error || error.message || 'Failed to send notification.');
    } finally {
      setSending(false);
    }
  };

  const sendDisabled =
    sending ||
    !title.trim() ||
    !body.trim() ||
    (audience === 'specific' && selectedUsers.length === 0) ||
    (audience === 'filtered' && recipientTotal === 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 text-gray-500">
            Compose branded Vormex notifications and target the right audience before sending.
          </p>
        </div>
        <button
          onClick={handleSend}
          disabled={sendDisabled}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition',
            sendDisabled
              ? 'cursor-not-allowed bg-gray-300 text-gray-500'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          )}
        >
          <Send className="h-4 w-4" />
          {sending ? 'Sending...' : 'Send Notification'}
        </button>
      </div>

      {(loadError || submitError || successMessage) && (
        <div className="space-y-3">
          {loadError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {loadError}
            </div>
          )}
          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}
          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}
        </div>
      )}

      <ReengagementQaPanel />

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Compose Broadcast</h2>
                <p className="text-sm text-gray-500">
                  Title and description are sent as a branded Vormex notification.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Title</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Vormex Update"
                  maxLength={120}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-2 text-xs text-gray-400">{title.length}/120</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Tell your users what is new, important, or time-sensitive."
                  maxLength={500}
                  rows={5}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-2 text-xs text-gray-400">{body.length}/500</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Audience</h2>
                <p className="text-sm text-gray-500">
                  Choose everyone, a filtered segment, or a manually selected list.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <Users className="h-3.5 w-3.5" />
                {recipientTotal.toLocaleString()} recipients
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {audienceOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAudience(option.value)}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition',
                    audience === option.value
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{option.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">{option.description}</p>
                    </div>
                    <div
                      className={cn(
                        'mt-1 flex h-5 w-5 items-center justify-center rounded-full border',
                        audience === option.value
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-gray-300 bg-white text-transparent'
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Targeting Filters</h2>
                <p className="text-sm text-gray-500">
                  Search by names and narrow the audience using colleges and skills.
                </p>
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </button>
            </div>

            <div className={cn('space-y-5', audience === 'all' && 'opacity-50')}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={
                    audience === 'specific'
                      ? 'Search users by name, username, email, college...'
                      : 'Search audience by name, username, email, college...'
                  }
                  disabled={audience === 'all'}
                  className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Colleges</h3>
                  </div>
                  <input
                    value={collegeSearch}
                    onChange={(event) => setCollegeSearch(event.target.value)}
                    placeholder="Search colleges"
                    disabled={audience === 'all' || loadingFilters}
                    className="mb-3 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                  />
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {loadingFilters ? (
                      <p className="text-sm text-gray-500">Loading colleges...</p>
                    ) : filteredColleges.length === 0 ? (
                      <p className="text-sm text-gray-500">No colleges match your search.</p>
                    ) : (
                      filteredColleges.map((college) => (
                        <button
                          key={college}
                          type="button"
                          onClick={() => toggleCollege(college)}
                          disabled={audience === 'all'}
                          className={cn(
                            'flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition',
                            selectedColleges.includes(college)
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
                            audience === 'all' && 'cursor-not-allowed'
                          )}
                        >
                          <span className="truncate">{college}</span>
                          {selectedColleges.includes(college) && <Check className="h-4 w-4 shrink-0" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Skills</h3>
                  </div>
                  <input
                    value={skillSearch}
                    onChange={(event) => setSkillSearch(event.target.value)}
                    placeholder="Search skills"
                    disabled={audience === 'all' || loadingFilters}
                    className="mb-3 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                  />
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {loadingFilters ? (
                      <p className="text-sm text-gray-500">Loading skills...</p>
                    ) : filteredSkills.length === 0 ? (
                      <p className="text-sm text-gray-500">No skills match your search.</p>
                    ) : (
                      filteredSkills.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          disabled={audience === 'all'}
                          className={cn(
                            'flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition',
                            selectedSkills.includes(skill)
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
                            audience === 'all' && 'cursor-not-allowed'
                          )}
                        >
                          <span className="truncate">{skill}</span>
                          {selectedSkills.includes(skill) && <Check className="h-4 w-4 shrink-0" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-white shadow-sm">
                <Image
                  src="/vormex-logo.png"
                  alt="Vormex logo"
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Mobile Preview</h2>
                <p className="text-sm text-gray-500">
                  Users will only see the Vormex logo, title, and description.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] bg-gray-950 p-3 shadow-inner">
              <div className="rounded-[24px] bg-white p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-white shadow-sm">
                    <Image
                      src="/vormex-logo.png"
                      alt="Vormex logo"
                      width={26}
                      height={26}
                      className="h-6 w-6 object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Vormex</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-900">
                    {title.trim() || 'Your notification title'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {body.trim() || 'Your notification description will appear here.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {audience === 'specific' && selectedUsers.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Selected Users</h2>
                  <p className="text-sm text-gray-500">
                    These users will receive the message when you send it.
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {selectedUsers.length}
                </span>
              </div>
              <div className="space-y-3">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
                      <p className="truncate text-xs text-gray-500">@{user.username}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSelectedUser(user)}
                      className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {audience === 'specific' ? 'User Search' : 'Recipient Preview'}
                </h2>
                <p className="text-sm text-gray-500">
                  {audience === 'specific'
                    ? 'Search and select the exact users who should receive this notification.'
                    : 'Preview the people matched by your current audience settings.'}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                <Filter className="h-3.5 w-3.5" />
                {recipientTotal.toLocaleString()} total
              </div>
            </div>

            {loadingRecipients ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
              </div>
            ) : candidates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center">
                <p className="text-sm font-medium text-gray-700">No users match the current targeting.</p>
                <p className="mt-1 text-sm text-gray-500">
                  Try broadening your search, colleges, or skills.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {candidates.map((user) => (
                  <div
                    key={user.id}
                    className={cn(
                      'rounded-2xl border px-4 py-3 transition',
                      audience === 'specific' && isUserSelected(user.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                            {(user.name || user.username || 'V').charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
                            <p className="truncate text-xs text-gray-500">
                              @{user.username} {user.college ? `• ${user.college}` : ''}
                            </p>
                          </div>
                        </div>
                        {user.skills.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {user.skills.slice(0, 3).map((skill) => (
                              <span
                                key={`${user.id}-${skill}`}
                                className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {audience === 'specific' ? (
                        <button
                          type="button"
                          onClick={() => toggleSelectedUser(user)}
                          className={cn(
                            'rounded-xl px-3 py-2 text-xs font-semibold transition',
                            isUserSelected(user.id)
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          )}
                        >
                          {isUserSelected(user.id) ? 'Selected' : 'Select'}
                        </button>
                      ) : (
                        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Included
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(current - 1, 1))}
                    disabled={page === 1}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
                      page === 1
                        ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <span className="text-sm text-gray-500">
                    Page {page} of {Math.max(totalPages, 1)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                    disabled={page >= totalPages}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
                      page >= totalPages
                        ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
