'use client';

import { useEffect, useState } from 'react';
import {
  type AdminUserListItem,
  type ReengagementDryRunResponse,
  type ReengagementStatusResponse,
  getReengagementNotificationStatus,
  getUsers,
  runReengagementNotificationDryRun,
} from '@/lib/api/admin';
import { cn } from '@/lib/utils';
import {
  Activity,
  BellRing,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Siren,
  Smartphone,
  TriangleAlert,
  UserRoundSearch,
  Zap,
} from 'lucide-react';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available';

  try {
    return new Date(value).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
}

function formatSlotLabel(hourIst: number) {
  const normalizedHour = ((hourIst % 24) + 24) % 24;
  const period = normalizedHour >= 12 ? 'PM' : 'AM';
  const displayHour = normalizedHour % 12 || 12;
  return `${displayHour}:00 ${period}`;
}

function buildTodaySlotIso(hourIst: number) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === 'year')?.value || 0);
  const month = Number(parts.find((part) => part.type === 'month')?.value || 1);
  const day = Number(parts.find((part) => part.type === 'day')?.value || 1);
  const utcMs = Date.UTC(year, month - 1, day, hourIst, 0, 0, 0) - IST_OFFSET_MS;
  return new Date(utcMs).toISOString();
}

function formatLocalDateTimeInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function buildTomorrowSlotDateTimeLocal(hourIst: number) {
  const tomorrowSlotIso = buildTodaySlotIso(hourIst + 24);
  return formatLocalDateTimeInput(new Date(tomorrowSlotIso));
}

function getReasonLabel(reason: string) {
  const reasonLabels: Record<string, string> = {
    already_grew_today: 'This user already did a real growth action today.',
    already_sent_for_slot: 'This slot was already sent for this user.',
    eligible: 'Everything looks ready for this slot.',
    no_active_device_token: 'The user has no active push token.',
    outside_lookback_window: 'The user is outside the recent activity lookback window.',
    outside_slot_window: 'Use one of the configured slot buttons to test a valid slot.',
    reengagement_disabled: 'The campaign is disabled in backend config.',
    user_banned: 'The user is banned and excluded from the campaign.',
    user_not_found: 'No matching user was found.',
    user_online: 'The user is online right now, so the campaign skips them.',
  };

  return reasonLabels[reason] || reason.replace(/_/g, ' ');
}

function getDeliveryTotals(status: ReengagementStatusResponse | null) {
  const totals = {
    failed: 0,
    pending: 0,
    sent: 0,
  };

  if (!status) {
    return totals;
  }

  for (const row of status.deliveryBreakdown) {
    if (row.status === 'sent') totals.sent += row._count._all;
    if (row.status === 'failed') totals.failed += row._count._all;
    if (row.status === 'pending') totals.pending += row._count._all;
  }

  return totals;
}

function StatusTile({
  title,
  value,
  ok,
  help,
}: {
  title: string;
  value: string;
  ok: boolean;
  help: string;
}) {
  return (
    <div className={cn(
      'rounded-2xl border p-4 shadow-sm transition',
      ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">{value}</p>
          <p className="mt-2 text-sm text-gray-600">{help}</p>
        </div>
        <div className={cn(
          'mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl',
          ok ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
        )}>
          {ok ? <CheckCircle2 className="h-5 w-5" /> : <TriangleAlert className="h-5 w-5" />}
        </div>
      </div>
    </div>
  );
}

export default function ReengagementQaPanel() {
  const [status, setStatus] = useState<ReengagementStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<AdminUserListItem[]>([]);
  const [quickUsers, setQuickUsers] = useState<AdminUserListItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingQuickUsers, setLoadingQuickUsers] = useState(false);
  const [onlyPushReady, setOnlyPushReady] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
  const [selectedSlotKey, setSelectedSlotKey] = useState<string>('');
  const [customDateTime, setCustomDateTime] = useState('');
  const [runningMode, setRunningMode] = useState<'preview' | 'send' | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<ReengagementDryRunResponse | null>(null);

  const loadStatus = async () => {
    setLoadingStatus(true);
    setStatusError(null);

    try {
      const response = await getReengagementNotificationStatus();
      setStatus(response);
      setSelectedSlotKey((current) => current || response.currentSlotKey || response.configuredSlots[0]?.key || '');
    } catch (error: any) {
      setStatusError(error.response?.data?.error || error.message || 'Failed to load re-engagement status.');
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  useEffect(() => {
    const loadQuickUsers = async () => {
      setLoadingQuickUsers(true);

      try {
        const response = await getUsers({
          excludeBanned: true,
          hasActivePushToken: true,
          limit: 6,
          page: 1,
          sortBy: 'lastActiveAt',
          sortOrder: 'desc',
        });
        setQuickUsers(response.users);
      } catch {
        setQuickUsers([]);
      } finally {
        setLoadingQuickUsers(false);
      }
    };

    void loadQuickUsers();
  }, []);

  useEffect(() => {
    const query = userSearch.trim();
    if (query.length < 2) {
      setUserResults([]);
      setLoadingUsers(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoadingUsers(true);

      try {
        const response = await getUsers({
          excludeBanned: true,
          hasActivePushToken: onlyPushReady,
          limit: 6,
          page: 1,
          search: query,
        });
        setUserResults(response.users);
      } catch {
        setUserResults([]);
      } finally {
        setLoadingUsers(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [onlyPushReady, userSearch]);

  const selectedSlot =
    status?.configuredSlots.find((slot) => slot.key === selectedSlotKey) ||
    status?.configuredSlots[0] ||
    null;
  const requestedAtIso = selectedSlot
    ? customDateTime
      ? new Date(customDateTime).toISOString()
      : buildTodaySlotIso(selectedSlot.hourIst)
    : null;
  const usingCustomTime = Boolean(customDateTime);

  const deliveryTotals = getDeliveryTotals(status);
  const automationReady = Boolean(status?.enabled && status?.redisConfigured && status?.fcmConfigured);

  const handleRun = async (mode: 'preview' | 'send') => {
    if (!selectedUser || !selectedSlot) {
      setRunError('Pick one user and one slot before testing.');
      return;
    }

    if (!requestedAtIso || Number.isNaN(new Date(requestedAtIso).getTime())) {
      setRunError('Pick a valid custom date and time.');
      return;
    }

    setRunError(null);
    setRunningMode(mode);

    try {
      const response = await runReengagementNotificationDryRun({
        now: requestedAtIso,
        send: mode === 'send',
        userId: selectedUser.id,
      });

      setRunResult(response);
      if (mode === 'send') {
        await loadStatus();
      }
    } catch (error: any) {
      setRunError(error.response?.data?.error || error.message || `Failed to ${mode} notification.`);
    } finally {
      setRunningMode(null);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <BellRing className="h-3.5 w-3.5" />
            Re-engagement QA
          </div>
          <h2 className="mt-3 text-xl font-semibold text-gray-900">Check whether the campaign is actually healthy</h2>
          <p className="mt-2 max-w-3xl text-sm text-gray-500">
            This panel is the quick answer to “is everything working?” Refresh the health checks, pick a user,
            preview the exact copy, and send one safe test push without touching the whole audience.
          </p>
        </div>

        <button
          type="button"
          onClick={loadStatus}
          disabled={loadingStatus}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={cn('h-4 w-4', loadingStatus && 'animate-spin')} />
          Refresh checks
        </button>
      </div>

      {statusError && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {statusError}
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className={cn(
            'rounded-2xl border px-5 py-4',
            automationReady ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
          )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                'mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl text-white',
                automationReady ? 'bg-emerald-600' : 'bg-amber-500'
              )}>
                {automationReady ? <CheckCircle2 className="h-5 w-5" /> : <TriangleAlert className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {automationReady ? 'Ready for testing' : 'Needs attention before you trust it'}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {automationReady
                    ? 'Campaign flag, Redis queueing, and FCM credentials are all available from the admin API.'
                    : 'One or more core checks are missing. Fix the amber cards below before expecting reliable delivery.'}
                </p>
                {status?.note && <p className="mt-2 text-xs text-gray-500">{status.note}</p>}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <StatusTile
              title="Campaign switch"
              value={status?.enabled ? 'Enabled' : 'Disabled'}
              ok={Boolean(status?.enabled)}
              help="If this is off, nothing will send."
            />
            <StatusTile
              title="Redis queue"
              value={status?.redisConfigured ? 'Connected' : 'Missing'}
              ok={Boolean(status?.redisConfigured)}
              help="Scheduler and worker depend on Redis."
            />
            <StatusTile
              title="FCM credentials"
              value={status?.fcmConfigured ? 'Configured' : 'Missing'}
              ok={Boolean(status?.fcmConfigured)}
              help="Without this, real mobile pushes will not go out."
            />
            <StatusTile
              title="Live slot"
              value={status?.currentSlotKey ? `${status.currentSlotKey} live now` : 'No slot right now'}
              ok={Boolean(status?.currentSlotKey)}
              help="Not being in a live slot is normal. Use the slot buttons on the right to test immediately."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sent today</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{deliveryTotals.sent}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pending today</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{deliveryTotals.pending}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Failed today</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{deliveryTotals.failed}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Recent deliveries</h3>
                <p className="text-sm text-gray-500">Latest backend attempts recorded in the delivery table.</p>
              </div>
              {loadingStatus && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            </div>

            {status?.recentDeliveries?.length ? (
              <div className="space-y-3">
                {status.recentDeliveries.slice(0, 6).map((delivery) => (
                  <div key={`${delivery.userId}-${delivery.slotKey}-${delivery.createdAt}`} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{delivery.title}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {delivery.campaignDateKey} • {delivery.slotKey} • {delivery.campaignType}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-semibold',
                          delivery.status === 'sent'
                            ? 'bg-emerald-100 text-emerald-700'
                            : delivery.status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                        )}>
                          {delivery.status}
                        </span>
                        <span className="text-xs text-gray-500">{formatDateTime(delivery.sentAt || delivery.createdAt)}</span>
                      </div>
                    </div>
                    {delivery.reason && <p className="mt-2 text-xs text-red-600">Reason: {delivery.reason}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                No re-engagement deliveries recorded yet.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <UserRoundSearch className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Single-user test</h3>
                <p className="text-sm text-gray-500">Search one user, then preview or send exactly one test push.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Find a test user</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    placeholder="Search by name, email, username, or college"
                    className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={onlyPushReady}
                    onChange={(event) => setOnlyPushReady(event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Show only users with an active push token
                </label>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Quick pick: push-ready users</p>
                    <p className="text-xs text-gray-500">These users already have an active token, so they are the fastest way to test.</p>
                  </div>
                  {loadingQuickUsers && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                </div>

                {quickUsers.length === 0 ? (
                  <div className="px-4 py-5 text-sm text-gray-500">
                    No push-ready users found yet. Open the Android app on a test account and enable push once.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {quickUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setSelectedUser(user);
                          setRunResult(null);
                        }}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-gray-50',
                          selectedUser?.id === user.id && 'bg-blue-50'
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              Push ready
                            </span>
                            {user.isOnline && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                Online now
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-gray-500">
                            @{user.username} {user.college ? `• ${user.college}` : ''}
                          </p>
                          <p className="mt-1 text-[11px] text-gray-400">
                            Last token sync: {formatDateTime(user.lastPushTokenAt)}
                          </p>
                        </div>
                        {selectedUser?.id === user.id && <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {userSearch.trim().length >= 2 && (
                <div className="rounded-xl border border-gray-200 bg-white">
                  {loadingUsers ? (
                    <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching users...
                    </div>
                  ) : userResults.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gray-500">No users match this search yet.</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {userResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setSelectedUser(user);
                            setRunResult(null);
                          }}
                          className={cn(
                            'flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-gray-50',
                            selectedUser?.id === user.id && 'bg-blue-50'
                          )}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
                              <span className={cn(
                                'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                user.hasActivePushToken
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-red-100 text-red-700'
                              )}>
                                {user.hasActivePushToken ? 'Push ready' : 'No token'}
                              </span>
                              {user.isOnline && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                  Online now
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs text-gray-500">
                              @{user.username} {user.college ? `• ${user.college}` : ''}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-400">
                              Last token sync: {formatDateTime(user.lastPushTokenAt)}
                            </p>
                          </div>
                          {selectedUser?.id === user.id && <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedUser && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{selectedUser.name}</p>
                      <p className="mt-1 text-xs text-gray-600">
                        @{selectedUser.username} • {selectedUser.email}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={cn(
                          'rounded-full px-2 py-1 text-[11px] font-semibold',
                          selectedUser.hasActivePushToken
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        )}>
                          {selectedUser.hasActivePushToken ? 'Active push token' : 'No active push token'}
                        </span>
                        {selectedUser.activePushPlatforms.length > 0 && (
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700">
                            {selectedUser.activePushPlatforms.join(', ')}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-[11px] text-gray-500">
                        Last token sync: {formatDateTime(selectedUser.lastPushTokenAt)}
                      </p>
                      <p className="mt-1 break-all text-[11px] text-gray-500">{selectedUser.id}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        setRunResult(null);
                      }}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Test slot</label>
                <div className="flex flex-wrap gap-2">
                  {status?.configuredSlots.map((slot) => (
                    <button
                      key={slot.key}
                      type="button"
                      onClick={() => setSelectedSlotKey(slot.key)}
                      className={cn(
                        'rounded-full border px-3 py-2 text-xs font-semibold transition',
                        selectedSlotKey === slot.key
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      )}
                    >
                      {formatSlotLabel(slot.hourIst)}
                    </button>
                  ))}
                </div>
                {selectedSlot && (
                  <p className="mt-2 text-xs text-gray-500">
                    This tests as if it were {formatSlotLabel(selectedSlot.hourIst)} IST today, so you do not need to wait for the real clock.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Custom date and time</label>
                    <p className="mt-1 text-xs text-gray-500">
                      Optional. If filled, this overrides the slot buttons above. Useful when today is blocked because the user already grew.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomDateTime('')}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                  >
                    Clear custom time
                  </button>
                </div>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="datetime-local"
                    value={customDateTime}
                    onChange={(event) => setCustomDateTime(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => selectedSlot && setCustomDateTime(buildTomorrowSlotDateTimeLocal(selectedSlot.hourIst))}
                    disabled={!selectedSlot}
                    className="shrink-0 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Use tomorrow&apos;s slot
                  </button>
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  Tip: choosing an earlier hour today will not bypass today&apos;s growth check. Use tomorrow or another day if this user already grew today.
                </p>

                {requestedAtIso && (
                  <div className={cn(
                    'mt-3 rounded-xl border px-3 py-2 text-sm',
                    usingCustomTime ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-gray-200 bg-gray-50 text-gray-700'
                  )}>
                    Effective test time: <span className="font-semibold">{formatDateTime(requestedAtIso)}</span>
                    {usingCustomTime ? ' via custom override' : ' via selected slot'}
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void handleRun('preview')}
                  disabled={!selectedUser || !selectedSlot || !!runningMode}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {runningMode === 'preview' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                  Preview test
                </button>
                <button
                  type="button"
                  onClick={() => void handleRun('send')}
                  disabled={!selectedUser || !selectedSlot || !!runningMode}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {runningMode === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send one test push
                </button>
              </div>

              {runError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {runError}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-900 text-white">
                <Siren className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Latest test result</h3>
                <p className="text-sm text-gray-500">This is the easiest place to confirm whether everything looks correct.</p>
              </div>
            </div>

            {!runResult ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-500">
                Pick a user and run a preview. The detailed health result will appear here.
              </div>
            ) : (
              <div className="space-y-4">
                <div className={cn(
                  'rounded-xl border px-4 py-3',
                  runResult.eligible || runResult.sent
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-amber-200 bg-amber-50'
                )}>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl text-white',
                      runResult.eligible || runResult.sent ? 'bg-emerald-600' : 'bg-amber-500'
                    )}>
                      {runResult.eligible || runResult.sent ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {runResult.sent
                          ? 'Test push sent'
                          : runResult.eligible
                            ? 'Ready to send'
                            : 'Not eligible right now'}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">{getReasonLabel(runResult.reason)}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Smartphone className="h-4 w-4 text-blue-600" />
                      Device token
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {runResult.hasActiveDeviceToken ? 'Present and ready' : 'Missing active token'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Zap className="h-4 w-4 text-blue-600" />
                      Growth today
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {runResult.hasMeaningfulGrowthToday
                        ? `${runResult.meaningfulGrowthCount} meaningful actions already done`
                        : 'No meaningful growth action yet'}
                    </p>
                  </div>
                </div>

                {runResult.reason === 'no_active_device_token' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">How to fix this instantly</p>
                    <p className="mt-2 text-sm text-amber-800">
                      Open the Android app on this account, allow notifications, then turn Push Notifications off and on once in settings.
                      After that, click Preview test again here.
                    </p>
                  </div>
                )}

                {runResult.reason === 'already_grew_today' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">Why this is blocked</p>
                    <p className="mt-2 text-sm text-amber-800">
                      This campaign stops for users who already made meaningful progress on the selected IST day.
                      To test instantly, use tomorrow&apos;s slot with the custom time picker or choose another push-ready user with zero growth today.
                    </p>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Slot</p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">{runResult.slotKey || 'None'}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Existing delivery</p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">{runResult.existingDeliveryStatus || 'None'}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Highest streak</p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">{runResult.highestStreak}</p>
                  </div>
                </div>

                {runResult.copy && (
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notification preview</p>
                    <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-sm font-semibold text-gray-900">{runResult.copy.title}</p>
                      <p className="mt-2 text-sm leading-6 text-gray-600">{runResult.copy.body}</p>
                    </div>
                  </div>
                )}

                {runResult.candidate && (
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Matched user behind the copy</p>
                    <p className="mt-3 text-sm font-semibold text-gray-900">{runResult.candidate.name}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Reason: {runResult.candidate.reason.replace(/_/g, ' ')}
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Requested at</p>
                  <p className="mt-2 text-sm text-gray-700">{formatDateTime(runResult.requestedAt)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
