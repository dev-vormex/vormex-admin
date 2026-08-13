'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Crown,
  IndianRupee,
  Loader2,
  MessageSquare,
  Receipt,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  UserCheck,
  Wand2,
  X,
} from 'lucide-react';
import {
  cancelPremiumAdminUser,
  getPremiumAdminEvents,
  getPremiumAdminOverview,
  getPremiumAdminUserDetail,
  getPremiumAdminUsers,
  sendPremiumAdminUserMessage,
  updatePremiumAdminSettings,
  updatePremiumAdminUser,
  type AgentAvailabilityMode,
  type PremiumAdminEvent,
  type PremiumAdminOverview,
  type PremiumAdminUser,
  type PremiumAdminUserDetail,
} from '@/lib/api/admin';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';

type UserFilter = 'all' | 'premium' | 'overrides';
type EventFilter = 'all' | 'payments' | 'clicked' | 'failed' | 'success';

type UserDraft = {
  premiumPriceOverride: string;
  agentEnabled: boolean;
  agentBlocked: boolean;
  profileCustomizationGranted: boolean;
  profileCustomizationBlocked: boolean;
};

type UserCardPosition = {
  x: number;
  y: number;
};

function getDefaultUserCardPosition(): UserCardPosition {
  if (typeof window === 'undefined') {
    return { x: 24, y: 108 };
  }

  return {
    x: Math.max(24, window.innerWidth - 460),
    y: 108,
  };
}

const statCards: Array<{
  key: keyof PremiumAdminOverview['stats'];
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}> = [
  { key: 'activePremiumUsers', label: 'Premium users', icon: Crown, tone: 'text-amber-300' },
  { key: 'paidPremiumUsers', label: 'Paid subscriptions', icon: CreditCard, tone: 'text-emerald-300' },
  { key: 'paymentCount', label: 'Payments captured', icon: Receipt, tone: 'text-cyan-300' },
  { key: 'clickCount', label: 'Get Premium clicks', icon: UserCheck, tone: 'text-sky-300' },
  { key: 'failureCount', label: 'Checkout failures', icon: AlertCircle, tone: 'text-rose-300' },
];

export default function PremiumDashboardPage() {
  const [overview, setOverview] = useState<PremiumAdminOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [settingsDraft, setSettingsDraft] = useState({
    premiumPriceRupees: '199',
    premiumCurrency: 'INR',
    agentAvailabilityMode: 'all' as AgentAvailabilityMode,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const [users, setUsers] = useState<PremiumAdminUser[]>([]);
  const [userDrafts, setUserDrafts] = useState<Record<string, UserDraft>>({});
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<PremiumAdminUserDetail | null>(null);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  const [selectedUserError, setSelectedUserError] = useState<string | null>(null);
  const [adminMessageDraft, setAdminMessageDraft] = useState('');
  const [sendingAdminMessage, setSendingAdminMessage] = useState(false);
  const [userCardPosition, setUserCardPosition] = useState<UserCardPosition>(() =>
    getDefaultUserCardPosition()
  );
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const userCardRef = useRef<HTMLDivElement | null>(null);

  const [events, setEvents] = useState<PremiumAdminEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventSearch, setEventSearch] = useState('');
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const data = await getPremiumAdminOverview();
      setOverview(data);
      setSettingsDraft({
        premiumPriceRupees: String((data.settings.premiumDefaultAmountMinor || 0) / 100),
        premiumCurrency: data.settings.premiumCurrency,
        agentAvailabilityMode: data.settings.agentAvailabilityMode,
      });
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Failed to load premium overview');
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const response = await getPremiumAdminUsers({
        page: 1,
        limit: 12,
        search: userSearch || undefined,
        filter: userFilter,
      });
      setUsers(response.users);
      setUserDrafts((previous) => {
        const next = { ...previous };
        response.users.forEach((user) => {
          next[user.id] = {
            premiumPriceOverride:
              user.premiumPriceOverrideMinor != null
                ? String(user.premiumPriceOverrideMinor / 100)
                : '',
            agentEnabled: user.agentEnabled,
            agentBlocked: user.agentBlocked,
            profileCustomizationGranted: user.profileCustomizationGranted,
            profileCustomizationBlocked: user.profileCustomizationBlocked,
          };
        });
        return next;
      });
    } catch (error) {
      console.error('Failed to load premium users', error);
    } finally {
      setUsersLoading(false);
    }
  }, [userFilter, userSearch]);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const response = await getPremiumAdminEvents({
        page: 1,
        limit: 12,
        search: eventSearch || undefined,
        filter: eventFilter,
      });
      setEvents(response.events);
    } catch (error) {
      console.error('Failed to load premium events', error);
    } finally {
      setEventsLoading(false);
    }
  }, [eventFilter, eventSearch]);

  const loadUserDetail = useCallback(async (userId: string) => {
    setSelectedUserLoading(true);
    setSelectedUserError(null);
    try {
      const response = await getPremiumAdminUserDetail(userId);
      setSelectedUserDetail(response);
      setUserDrafts((current) => ({
        ...current,
        [userId]: {
          premiumPriceOverride:
            response.user.premiumPriceOverrideMinor != null
              ? String(response.user.premiumPriceOverrideMinor / 100)
              : '',
          agentEnabled: response.user.agentEnabled,
          agentBlocked: response.user.agentBlocked,
          profileCustomizationGranted: response.user.profileCustomizationGranted,
          profileCustomizationBlocked: response.user.profileCustomizationBlocked,
        },
      }));
    } catch (error) {
      setSelectedUserDetail(null);
      setSelectedUserError(
        error instanceof Error ? error.message : 'Failed to load user detail'
      );
    } finally {
      setSelectedUserLoading(false);
    }
  }, []);

  const openUserCard = useCallback(
    async (userId: string) => {
      setSelectedUserId(userId);
      setAdminMessageDraft('');
      await loadUserDetail(userId);
    },
    [loadUserDetail]
  );

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadEvents();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadEvents]);

  useEffect(() => {
    if (!dragOffset) return;

    const handlePointerMove = (event: PointerEvent) => {
      const cardWidth = userCardRef.current?.offsetWidth ?? 420;
      const maxX = Math.max(16, window.innerWidth - cardWidth - 16);
      const maxY = Math.max(16, window.innerHeight - 140);

      setUserCardPosition({
        x: Math.min(Math.max(16, event.clientX - dragOffset.x), maxX),
        y: Math.min(Math.max(16, event.clientY - dragOffset.y), maxY),
      });
    };

    const handlePointerUp = () => {
      setDragOffset(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragOffset]);

  const refreshAll = async () => {
    await Promise.all([
      loadOverview(),
      loadUsers(),
      loadEvents(),
      selectedUserId ? loadUserDetail(selectedUserId) : Promise.resolve(),
    ]);
  };

  const applySavedUserAccessToUi = useCallback(
    (
      userId: string,
      saved: {
        premiumPriceOverrideMinor: number | null;
        premiumDisplayAmount: string;
        agentEnabled: boolean;
        agentBlocked: boolean;
        canUseAgent: boolean;
        profileCustomizationGranted: boolean;
        profileCustomizationBlocked: boolean;
        canAccessProfileCustomization: boolean;
      }
    ) => {
      setUsers((current) =>
        current.map((item) =>
          item.id === userId
            ? {
                ...item,
                premiumPriceOverrideMinor: saved.premiumPriceOverrideMinor,
                premiumDisplayAmount: saved.premiumDisplayAmount,
                agentEnabled: saved.agentEnabled,
                agentBlocked: saved.agentBlocked,
                canUseAgent: saved.canUseAgent,
                profileCustomizationGranted: saved.profileCustomizationGranted,
                profileCustomizationBlocked: saved.profileCustomizationBlocked,
                canAccessProfileCustomization: saved.canAccessProfileCustomization,
              }
            : item
        )
      );

      setUserDrafts((current) => ({
        ...current,
        [userId]: {
          premiumPriceOverride:
            saved.premiumPriceOverrideMinor != null
              ? String(saved.premiumPriceOverrideMinor / 100)
              : '',
          agentEnabled: saved.agentEnabled,
          agentBlocked: saved.agentBlocked,
          profileCustomizationGranted: saved.profileCustomizationGranted,
          profileCustomizationBlocked: saved.profileCustomizationBlocked,
        },
      }));

      setSelectedUserDetail((current) =>
        current?.user.id === userId
          ? {
              user: {
                ...current.user,
                premiumPriceOverrideMinor: saved.premiumPriceOverrideMinor,
                premiumDisplayAmount: saved.premiumDisplayAmount,
                agentEnabled: saved.agentEnabled,
                agentBlocked: saved.agentBlocked,
                canUseAgent: saved.canUseAgent,
                profileCustomizationGranted: saved.profileCustomizationGranted,
                profileCustomizationBlocked: saved.profileCustomizationBlocked,
                canAccessProfileCustomization: saved.canAccessProfileCustomization,
              },
            }
          : current
      );
    },
    []
  );

  const applyCancelledUserPremiumToUi = useCallback(
    (
      userId: string,
      cancelled: {
        isPremium: boolean;
        premiumStatus: string;
        premiumEndsAt: string | null;
        premiumDaysRemaining: number;
        canUseAgent: boolean;
        canAccessProfileCustomization: boolean;
      }
    ) => {
      setUsers((current) =>
        current.map((item) =>
          item.id === userId
            ? {
                ...item,
                isPremium: cancelled.isPremium,
                premiumStatus: cancelled.premiumStatus,
                premiumEndsAt: cancelled.premiumEndsAt,
                premiumDaysRemaining: cancelled.premiumDaysRemaining,
                canUseAgent: cancelled.canUseAgent,
                canAccessProfileCustomization: cancelled.canAccessProfileCustomization,
                canCancelPremium: false,
                agentEnabled: false,
                agentBlocked: true,
                profileCustomizationGranted: false,
                profileCustomizationBlocked: true,
                premiumPriceOverrideMinor: null,
              }
            : item
        )
      );

      setUserDrafts((current) => ({
        ...current,
        [userId]: {
          premiumPriceOverride: '',
          agentEnabled: false,
          agentBlocked: true,
          profileCustomizationGranted: false,
          profileCustomizationBlocked: true,
        },
      }));

      setSelectedUserDetail((current) =>
        current?.user.id === userId
          ? {
              user: {
                ...current.user,
                isPremium: cancelled.isPremium,
                premiumStatus: cancelled.premiumStatus,
                premiumEndsAt: cancelled.premiumEndsAt,
                premiumDaysRemaining: cancelled.premiumDaysRemaining,
                canUseAgent: cancelled.canUseAgent,
                canAccessProfileCustomization: cancelled.canAccessProfileCustomization,
                canCancelPremium: false,
                agentEnabled: false,
                agentBlocked: true,
                profileCustomizationGranted: false,
                profileCustomizationBlocked: true,
                premiumPriceOverrideMinor: null,
              },
            }
          : current
      );
    },
    []
  );

  const handleSaveSettings = async () => {
    const premiumPriceRupees = Number(settingsDraft.premiumPriceRupees);
    if (!Number.isFinite(premiumPriceRupees) || premiumPriceRupees <= 0) {
      window.alert('Enter a valid premium price.');
      return;
    }

    setSavingSettings(true);
    try {
      await updatePremiumAdminSettings({
        premiumDefaultAmountMinor: Math.round(premiumPriceRupees * 100),
        premiumCurrency: settingsDraft.premiumCurrency.toUpperCase(),
        agentAvailabilityMode: settingsDraft.agentAvailabilityMode,
      });
      await loadOverview();
      await loadUsers();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to save premium settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveUser = async (user: Pick<PremiumAdminUser, 'id'>) => {
    const draft = userDrafts[user.id];
    if (!draft) return;

    setSavingUserId(user.id);
    try {
      const overrideValue =
        draft.premiumPriceOverride.trim() === ''
          ? null
          : Math.round(Number(draft.premiumPriceOverride) * 100);

      const response = await updatePremiumAdminUser(user.id, {
        premiumPriceOverrideMinor:
          overrideValue != null && Number.isFinite(overrideValue) && overrideValue > 0
            ? overrideValue
            : null,
        agentEnabled: draft.agentEnabled,
        agentBlocked: draft.agentBlocked,
        profileCustomizationGranted: draft.profileCustomizationGranted,
        profileCustomizationBlocked: draft.profileCustomizationBlocked,
      });

      applySavedUserAccessToUi(user.id, response.user);

      await Promise.all([
        loadOverview(),
        loadUsers(),
        selectedUserId === user.id ? loadUserDetail(user.id) : Promise.resolve(),
      ]);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to update user access');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleCancelUserPremium = async (
    user: Pick<PremiumAdminUser, 'id' | 'name' | 'email'>
  ) => {
    const confirmed = window.confirm(
      `Cancel premium for ${user.name || user.email} right now? This removes access immediately and the user must pay again to unlock premium.`
    );
    if (!confirmed) return;

    setSavingUserId(user.id);
    try {
      const response = await cancelPremiumAdminUser(user.id);
      applyCancelledUserPremiumToUi(user.id, response.user);
      await Promise.all([
        loadOverview(),
        loadUsers(),
        loadEvents(),
        selectedUserId === user.id ? loadUserDetail(user.id) : Promise.resolve(),
      ]);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to cancel premium access');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleCardHeaderPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (event.button !== 0) return;

    const rect = userCardRef.current?.getBoundingClientRect();
    if (!rect) return;

    event.preventDefault();
    setDragOffset({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const handleSendAdminMessage = async () => {
    if (!selectedUserId || !adminMessageDraft.trim()) return;

    setSendingAdminMessage(true);
    try {
      await sendPremiumAdminUserMessage(selectedUserId, adminMessageDraft.trim());
      setAdminMessageDraft('');
      window.alert('Admin message sent successfully.');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to send admin message');
    } finally {
      setSendingAdminMessage(false);
    }
  };

  const eventTone = useMemo(
    () => ({
      success: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20',
      failure: 'bg-rose-500/10 text-rose-300 border-rose-400/20',
      info: 'bg-slate-500/10 text-slate-200 border-slate-400/20',
    }),
    []
  );

  const selectedUserDraft = selectedUserId ? userDrafts[selectedUserId] : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Premium Controls</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage pricing, rollout access, and premium checkout activity from one place.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshAll}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {overviewError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {overviewError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => (
          <div
            key={card.key}
            className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">{card.label}</p>
              <card.icon className={`h-5 w-5 ${card.tone}`} />
            </div>
            <p className="mt-4 text-3xl font-semibold text-white">
              {overviewLoading || !overview ? '...' : overview.stats[card.key]}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-emerald-400/20 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.16),_transparent_40%),linear-gradient(160deg,#0b1218,#06080d)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
              <IndianRupee className="h-4 w-4" />
              Razorpay revenue
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Money actually collected</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-300">
              Totals come from verified checkout payments only, so test grants and failed attempts
              never inflate them.
            </p>
          </div>
          {overview?.revenue.lastPayment && (
            <div className="rounded-2xl border border-emerald-400/20 bg-black/30 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/70">Last payment</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {overview.revenue.lastPayment.displayAmount || 'No amount'}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {overview.revenue.lastPayment.user.name || overview.revenue.lastPayment.user.email}
              </p>
              <p className="text-xs text-gray-500">
                {formatRelativeTime(overview.revenue.lastPayment.createdAt)}
              </p>
              {overview.revenue.lastPayment.paymentId && (
                <p className="mt-1 font-mono text-[11px] text-gray-500">
                  {overview.revenue.lastPayment.paymentId}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-800 bg-black/20 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Total collected</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {overviewLoading || !overview ? '...' : overview.revenue.totalDisplay}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {overview ? `${overview.stats.paymentCount} payment(s)` : ''}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-black/20 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">This month</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {overviewLoading || !overview ? '...' : overview.revenue.thisMonthDisplay}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {overview ? `${overview.stats.paymentCountThisMonth} payment(s)` : ''}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-black/20 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Active plan value</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {overviewLoading || !overview ? '...' : overview.revenue.activeRecurringDisplay}
            </p>
            <p className="mt-1 text-xs text-gray-500">Sum of live paid subscriptions</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
        <section className="rounded-3xl border border-amber-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_35%),linear-gradient(160deg,#10131b,#06080d)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/80">
                Vormex Premium
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Tune the main premium offer
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-gray-300">
                Set one default price for everyone, then use per-user overrides when you want to
                offer a lower amount to selected people. AI Agent rollout is controlled here too.
              </p>
            </div>
            {overview && (
              <div className="rounded-2xl border border-amber-400/20 bg-black/20 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-amber-200/70">Live price</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {overview.settings.premiumDisplayAmount}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-200">Default price</span>
              <div className="flex items-center rounded-2xl border border-gray-800 bg-black/20 px-4">
                <span className="text-sm text-gray-400">INR</span>
                <input
                  value={settingsDraft.premiumPriceRupees}
                  onChange={(e) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      premiumPriceRupees: e.target.value,
                    }))
                  }
                  className="w-full bg-transparent px-3 py-3 text-white outline-none"
                  placeholder="199"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">Enter the amount in rupees.</p>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-200">AI Agent rollout</span>
              <select
                value={settingsDraft.agentAvailabilityMode}
                onChange={(e) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    agentAvailabilityMode: e.target.value as AgentAvailabilityMode,
                  }))
                }
                className="w-full rounded-2xl border border-gray-800 bg-black/20 px-4 py-3 text-white outline-none"
              >
                <option value="all">Show to all users</option>
                <option value="selected">Show only to selected users</option>
                <option value="disabled">Hide for everyone</option>
              </select>
              <p className="mt-2 text-xs text-gray-500">
                Premium users unlock AI Agent automatically unless rollout is disabled. Selected
                mode also uses the per-user toggle below for extra access.
              </p>
            </label>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl border border-gray-800 bg-black/20 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">Default currency</p>
              <p className="text-xs text-gray-500">Kept in sync with the checkout response.</p>
            </div>
            <input
              value={settingsDraft.premiumCurrency}
              onChange={(e) =>
                setSettingsDraft((current) => ({
                  ...current,
                  premiumCurrency: e.target.value.toUpperCase(),
                }))
              }
              className="w-24 rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-center text-sm text-white outline-none"
            />
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Save premium settings
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-800 bg-gray-950 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Per-user access and price overrides</h2>
              <p className="mt-1 text-sm text-gray-400">
                Give selected users a lower price, AI Agent access, or profile customization access.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users..."
                  className="rounded-2xl border border-gray-800 bg-gray-900 py-2 pl-9 pr-3 text-sm text-white outline-none"
                />
              </div>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value as UserFilter)}
                className="rounded-2xl border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="all">All users</option>
                <option value="premium">Premium users</option>
                <option value="overrides">Users with overrides</option>
              </select>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {usersLoading ? (
              <div className="flex items-center justify-center py-14 text-gray-400">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-800 px-4 py-10 text-center text-sm text-gray-500">
                No users matched this filter.
              </div>
            ) : (
              users.map((user) => {
                const draft = userDrafts[user.id];
                return (
                  <div
                    key={user.id}
                    className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <button
                        type="button"
                        onClick={() => openUserCard(user.id)}
                        className="flex items-center gap-3 rounded-2xl text-left transition hover:bg-white/5 xl:flex-1 xl:pr-4"
                      >
                        {user.profileImage ? (
                          <img
                            src={user.profileImage}
                            alt={user.name}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/20 text-sm font-semibold text-amber-200">
                            {user.name?.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-white">{user.name}</p>
                            {user.isPremium && (
                              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                                Premium active
                              </span>
                            )}
                            {user.canUseAgent && (
                              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-300">
                                AI Agent visible
                              </span>
                            )}
                            {user.agentBlocked && (
                              <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2 py-0.5 text-xs text-rose-300">
                                Agent blocked
                              </span>
                            )}
                            {user.canAccessProfileCustomization && (
                              <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-300">
                                Customization access
                              </span>
                            )}
                            {user.profileCustomizationBlocked && (
                              <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2 py-0.5 text-xs text-rose-300">
                                Premium look blocked
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{user.email}</p>
                          <p className="text-xs text-gray-500">
                            @{user.username || 'no-username'} · joined {formatRelativeTime(user.createdAt)}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Status: {user.premiumStatus}
                            {user.premiumEndsAt ? ` · ends ${formatDateTime(user.premiumEndsAt)}` : ''}
                            {user.premiumDaysRemaining > 0
                              ? ` · ${user.premiumDaysRemaining} day${user.premiumDaysRemaining === 1 ? '' : 's'} left`
                              : ''}
                          </p>
                          {user.isPremium && (
                            <p className="mt-1 text-xs text-gray-500">
                              Paid: {user.premiumPaidAmountDisplay || 'no charge recorded'}
                              {user.premiumProvider ? ` · ${user.premiumProvider}` : ''}
                              {user.premiumBillingCycle ? ` · ${user.premiumBillingCycle}` : ''}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-500">
                            Agent prompts this cycle: {user.creditsUsed}
                          </p>
                        </div>
                      </button>

                      <div className="grid gap-3 md:grid-cols-3 xl:min-w-[540px]">
                        <label className="block">
                          <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-gray-500">
                            Custom price
                          </span>
                          <input
                            value={draft?.premiumPriceOverride || ''}
                            onChange={(e) =>
                              setUserDrafts((current) => ({
                                ...current,
                                [user.id]: {
                                  ...(current[user.id] || {
                                    premiumPriceOverride: '',
                                    agentEnabled: user.agentEnabled,
                                    agentBlocked: user.agentBlocked,
                                    profileCustomizationGranted:
                                      user.profileCustomizationGranted,
                                    profileCustomizationBlocked:
                                      user.profileCustomizationBlocked,
                                  }),
                                  premiumPriceOverride: e.target.value,
                                },
                              }))
                            }
                            placeholder="Use default"
                            className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white outline-none"
                          />
                          <p className="mt-1 text-xs text-gray-500">{user.premiumDisplayAmount}</p>
                        </label>

                        <label className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950 px-3 py-3">
                          <div>
                            <p className="text-sm font-medium text-white">AI Agent access</p>
                            <p className="text-xs text-gray-500">
                              Turn this off to remove agent access for this user right away.
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={draft ? !draft.agentBlocked : user.canUseAgent}
                            onChange={(e) =>
                              setUserDrafts((current) => ({
                                ...current,
                                [user.id]: {
                                  ...(current[user.id] || {
                                    premiumPriceOverride: '',
                                    agentEnabled: false,
                                    agentBlocked: user.agentBlocked,
                                    profileCustomizationGranted:
                                      user.profileCustomizationGranted,
                                    profileCustomizationBlocked:
                                      user.profileCustomizationBlocked,
                                  }),
                                  agentEnabled: e.target.checked,
                                  agentBlocked: !e.target.checked,
                                },
                              }))
                            }
                            className="h-4 w-4 accent-cyan-400"
                          />
                        </label>

                        <label className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950 px-3 py-3">
                          <div>
                            <p className="text-sm font-medium text-white">Profile customization</p>
                            <p className="text-xs text-gray-500">
                              Turn this off to hide premium look access for this user.
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={
                              draft
                                ? !draft.profileCustomizationBlocked
                                : user.canAccessProfileCustomization
                            }
                            onChange={(e) =>
                              setUserDrafts((current) => ({
                                ...current,
                                [user.id]: {
                                  ...(current[user.id] || {
                                    premiumPriceOverride: '',
                                    agentEnabled: user.agentEnabled,
                                    agentBlocked: user.agentBlocked,
                                    profileCustomizationGranted: false,
                                    profileCustomizationBlocked:
                                      user.profileCustomizationBlocked,
                                  }),
                                  profileCustomizationGranted: e.target.checked,
                                  profileCustomizationBlocked: !e.target.checked,
                                },
                              }))
                            }
                            className="h-4 w-4 accent-violet-400"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => openUserCard(user.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-950 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-900"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Open user card
                      </button>
                      {user.canCancelPremium && (
                        <button
                          type="button"
                          onClick={() => handleCancelUserPremium(user)}
                          disabled={savingUserId === user.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingUserId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          Cancel premium now
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSaveUser(user)}
                        disabled={savingUserId === user.id}
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingUserId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Save user access
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-gray-800 bg-gray-950 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Premium activity</h2>
            <p className="mt-1 text-sm text-gray-400">
              Track who clicked Get Premium, where failures happened, and who completed checkout.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="Search activity..."
                className="rounded-2xl border border-gray-800 bg-gray-900 py-2 pl-9 pr-3 text-sm text-white outline-none"
              />
            </div>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value as EventFilter)}
              className="rounded-2xl border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="all">All activity</option>
              <option value="payments">Payments only</option>
              <option value="clicked">Clicked Get Premium</option>
              <option value="failed">Failed events</option>
              <option value="success">Successful events</option>
            </select>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {eventsLoading ? (
            <div className="flex items-center justify-center py-14 text-gray-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading activity...
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-800 px-4 py-10 text-center text-sm text-gray-500">
              No premium activity matched this filter.
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-3 rounded-2xl border border-gray-800 bg-gray-900/60 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                        eventTone[event.outcome as keyof typeof eventTone] || eventTone.info
                      }`}
                    >
                      {event.eventType.replace(/_/g, ' ')}
                    </span>
                    <p className="text-sm font-medium text-white">
                      {event.user.name || event.user.email}
                    </p>
                    <p className="text-xs text-gray-500">@{event.user.username || 'no-username'}</p>
                  </div>
                  <p className="mt-2 text-sm text-gray-300">
                    {event.message || 'No message recorded'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDateTime(event.createdAt)} · {formatRelativeTime(event.createdAt)}
                  </p>
                  {(event.payment.paymentId || event.payment.orderId) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                      {event.payment.provider && (
                        <span className="rounded-full border border-gray-700 bg-gray-950 px-2 py-0.5">
                          {event.payment.provider}
                        </span>
                      )}
                      {event.payment.plan && (
                        <span className="rounded-full border border-gray-700 bg-gray-950 px-2 py-0.5">
                          {event.payment.plan}
                          {event.payment.billingCycle ? ` · ${event.payment.billingCycle}` : ''}
                        </span>
                      )}
                      {event.payment.paymentMethod && (
                        <span className="rounded-full border border-gray-700 bg-gray-950 px-2 py-0.5">
                          {event.payment.paymentMethod}
                        </span>
                      )}
                      {event.payment.source && (
                        <span className="rounded-full border border-gray-700 bg-gray-950 px-2 py-0.5">
                          via {event.payment.source}
                        </span>
                      )}
                      {event.payment.paymentId && (
                        <span className="font-mono">{event.payment.paymentId}</span>
                      )}
                      {event.payment.orderId && (
                        <span className="font-mono text-gray-500">{event.payment.orderId}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-300">
                  {event.displayAmount || 'No amount'}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {selectedUserId && (
        <div
          ref={userCardRef}
          className="fixed z-50 w-[420px] max-w-[calc(100vw-2rem)] rounded-3xl border border-amber-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_35%),linear-gradient(180deg,#161a22,#090b10)] p-5 shadow-2xl shadow-black/50"
          style={{
            left: userCardPosition.x,
            top: userCardPosition.y,
          }}
        >
          <div
            onPointerDown={handleCardHeaderPointerDown}
            className="flex cursor-move items-start justify-between gap-3"
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300/80">
                User Control Card
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Drag this card anywhere on screen.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedUserId(null);
                setSelectedUserDetail(null);
                setSelectedUserError(null);
                setAdminMessageDraft('');
              }}
              className="rounded-xl border border-gray-700 bg-gray-900 p-2 text-gray-300 hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {selectedUserLoading ? (
            <div className="flex items-center justify-center py-14 text-gray-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading user card...
            </div>
          ) : selectedUserError ? (
            <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {selectedUserError}
            </div>
          ) : selectedUserDetail ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-gray-800 bg-black/20 p-4">
                <div className="flex items-start gap-3">
                  {selectedUserDetail.user.profileImage ? (
                    <img
                      src={selectedUserDetail.user.profileImage}
                      alt={selectedUserDetail.user.name}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/20 text-sm font-semibold text-amber-200">
                      {selectedUserDetail.user.name?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-white">
                        {selectedUserDetail.user.name}
                      </p>
                      {selectedUserDetail.user.isPremium && (
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                          Premium active
                        </span>
                      )}
                      {selectedUserDetail.user.agentBlocked && (
                        <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-300">
                          Agent blocked
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-gray-400">
                      {selectedUserDetail.user.email}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      @{selectedUserDetail.user.username || 'no-username'}
                      {selectedUserDetail.user.college
                        ? ` · ${selectedUserDetail.user.college}`
                        : ''}
                      {selectedUserDetail.user.branch
                        ? ` · ${selectedUserDetail.user.branch}`
                        : ''}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Joined {formatRelativeTime(selectedUserDetail.user.createdAt)}
                      {selectedUserDetail.user.lastActiveAt
                        ? ` · active ${formatRelativeTime(selectedUserDetail.user.lastActiveAt)}`
                        : ''}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-gray-700 bg-gray-900 px-2.5 py-1 text-[11px] text-gray-300">
                    Status: {selectedUserDetail.user.premiumStatus}
                  </span>
                  <span className="rounded-full border border-gray-700 bg-gray-900 px-2.5 py-1 text-[11px] text-gray-300">
                    Price: {selectedUserDetail.user.premiumDisplayAmount}
                  </span>
                  {selectedUserDetail.user.premiumDaysRemaining > 0 && (
                    <span className="rounded-full border border-gray-700 bg-gray-900 px-2.5 py-1 text-[11px] text-gray-300">
                      {selectedUserDetail.user.premiumDaysRemaining} days left
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-800 bg-gray-950 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                    Agent cycle
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">
                    {selectedUserDetail.user.usage.creditsUsedCurrentCycle}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-gray-950 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                    Agent all time
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">
                    {selectedUserDetail.user.usage.agentMessagesAllTime}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-gray-950 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                    Chats sent
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">
                    {selectedUserDetail.user.usage.chatMessagesSent}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-gray-950 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                    Premium events
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">
                    {selectedUserDetail.user.usage.premiumEventsCount}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-400/20 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <CreditCard className="h-4 w-4 text-emerald-300" />
                    Billing and payments
                  </h3>
                  <span className="rounded-full border border-gray-700 bg-gray-950 px-2.5 py-1 text-[11px] text-gray-300">
                    {selectedUserDetail.user.billing.provider}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-gray-800 bg-gray-950 px-3 py-2">
                    <p className="uppercase tracking-[0.16em] text-gray-500">Paid plan</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {selectedUserDetail.user.billing.plan}
                      {selectedUserDetail.user.billing.billingCycle
                        ? ` · ${selectedUserDetail.user.billing.billingCycle}`
                        : ''}
                    </p>
                    <p className="mt-1 text-gray-500">
                      {selectedUserDetail.user.billing.amountDisplay || 'No charge recorded'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-800 bg-gray-950 px-3 py-2">
                    <p className="uppercase tracking-[0.16em] text-gray-500">Lifetime value</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {selectedUserDetail.user.billing.lifetimeValueDisplay}
                    </p>
                    <p className="mt-1 text-gray-500">
                      {selectedUserDetail.user.billing.paymentCount} payment(s)
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {selectedUserDetail.user.billing.payments.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-gray-800 px-3 py-4 text-center text-xs text-gray-500">
                      No captured payments yet.
                    </p>
                  ) : (
                    selectedUserDetail.user.billing.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-white">
                            {payment.displayAmount || 'No amount'}
                          </span>
                          <span className="text-gray-500">
                            {formatRelativeTime(payment.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-gray-400">
                          {[payment.provider, payment.plan, payment.billingCycle, payment.paymentMethod]
                            .filter(Boolean)
                            .join(' · ') || 'No payment details'}
                        </p>
                        {payment.paymentId && (
                          <p className="mt-1 font-mono text-[11px] text-gray-500">
                            {payment.paymentId}
                          </p>
                        )}
                        {payment.orderId && (
                          <p className="font-mono text-[11px] text-gray-600">{payment.orderId}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-gray-950 px-3 py-3 text-xs text-gray-400">
                <p>
                  Last agent activity:{' '}
                  {selectedUserDetail.user.usage.lastAgentMessageAt
                    ? formatRelativeTime(selectedUserDetail.user.usage.lastAgentMessageAt)
                    : 'No agent usage yet'}
                </p>
                <p className="mt-1">
                  Last premium event:{' '}
                  {selectedUserDetail.user.usage.lastPremiumEvent
                    ? `${selectedUserDetail.user.usage.lastPremiumEvent.eventType.replace(/_/g, ' ')} · ${formatRelativeTime(
                        selectedUserDetail.user.usage.lastPremiumEvent.createdAt
                      )}`
                    : 'No premium event yet'}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Access controls</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Stop agent use, hide premium look, or set a special price for this user.
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Posts {selectedUserDetail.user.postsCount} · Connections{' '}
                    {selectedUserDetail.user.connectionsCount}
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-gray-500">
                      Custom price
                    </span>
                    <input
                      value={selectedUserDraft?.premiumPriceOverride || ''}
                      onChange={(event) =>
                        setUserDrafts((current) => ({
                          ...current,
                          [selectedUserId]: {
                            ...(current[selectedUserId] || {
                              premiumPriceOverride: '',
                              agentEnabled: selectedUserDetail.user.agentEnabled,
                              agentBlocked: selectedUserDetail.user.agentBlocked,
                              profileCustomizationGranted:
                                selectedUserDetail.user.profileCustomizationGranted,
                              profileCustomizationBlocked:
                                selectedUserDetail.user.profileCustomizationBlocked,
                            }),
                            premiumPriceOverride: event.target.value,
                          },
                        }))
                      }
                      placeholder="Use default"
                      className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white outline-none"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950 px-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-white">Allow AI Agent</p>
                        <p className="text-xs text-gray-500">
                          Extra access when rollout uses selected users.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedUserDraft?.agentEnabled || false}
                        onChange={(event) =>
                          setUserDrafts((current) => ({
                            ...current,
                            [selectedUserId]: {
                              ...(current[selectedUserId] || {
                                premiumPriceOverride: '',
                                agentEnabled: false,
                                agentBlocked: selectedUserDetail.user.agentBlocked,
                                profileCustomizationGranted:
                                  selectedUserDetail.user.profileCustomizationGranted,
                                profileCustomizationBlocked:
                                  selectedUserDetail.user.profileCustomizationBlocked,
                              }),
                              agentEnabled: event.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 accent-cyan-400"
                      />
                    </label>

                    <label className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950 px-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-white">Block AI Agent</p>
                        <p className="text-xs text-gray-500">
                          Force-hide agent for this user.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedUserDraft?.agentBlocked || false}
                        onChange={(event) =>
                          setUserDrafts((current) => ({
                            ...current,
                            [selectedUserId]: {
                              ...(current[selectedUserId] || {
                                premiumPriceOverride: '',
                                agentEnabled: selectedUserDetail.user.agentEnabled,
                                agentBlocked: false,
                                profileCustomizationGranted:
                                  selectedUserDetail.user.profileCustomizationGranted,
                                profileCustomizationBlocked:
                                  selectedUserDetail.user.profileCustomizationBlocked,
                              }),
                              agentBlocked: event.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 accent-rose-400"
                      />
                    </label>

                    <label className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950 px-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-white">Grant premium look</p>
                        <p className="text-xs text-gray-500">
                          Allow profile customization without premium.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedUserDraft?.profileCustomizationGranted || false}
                        onChange={(event) =>
                          setUserDrafts((current) => ({
                            ...current,
                            [selectedUserId]: {
                              ...(current[selectedUserId] || {
                                premiumPriceOverride: '',
                                agentEnabled: selectedUserDetail.user.agentEnabled,
                                agentBlocked: selectedUserDetail.user.agentBlocked,
                                profileCustomizationGranted: false,
                                profileCustomizationBlocked:
                                  selectedUserDetail.user.profileCustomizationBlocked,
                              }),
                              profileCustomizationGranted: event.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 accent-violet-400"
                      />
                    </label>

                    <label className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950 px-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-white">Block premium look</p>
                        <p className="text-xs text-gray-500">
                          Remove customization access until payment returns.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedUserDraft?.profileCustomizationBlocked || false}
                        onChange={(event) =>
                          setUserDrafts((current) => ({
                            ...current,
                            [selectedUserId]: {
                              ...(current[selectedUserId] || {
                                premiumPriceOverride: '',
                                agentEnabled: selectedUserDetail.user.agentEnabled,
                                agentBlocked: selectedUserDetail.user.agentBlocked,
                                profileCustomizationGranted:
                                  selectedUserDetail.user.profileCustomizationGranted,
                                profileCustomizationBlocked: false,
                              }),
                              profileCustomizationBlocked: event.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 accent-rose-400"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-black/20 p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-amber-300" />
                  <h3 className="text-sm font-semibold text-white">Send message to user</h3>
                </div>
                <textarea
                  value={adminMessageDraft}
                  onChange={(event) => setAdminMessageDraft(event.target.value)}
                  placeholder="Write a direct admin message..."
                  rows={4}
                  className="mt-3 w-full resize-none rounded-2xl border border-gray-800 bg-gray-950 px-3 py-3 text-sm text-white outline-none"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    The message is sent into the user&apos;s chat flow.
                  </p>
                  <button
                    type="button"
                    onClick={handleSendAdminMessage}
                    disabled={sendingAdminMessage || !adminMessageDraft.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sendingAdminMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send message
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                {selectedUserDetail.user.canCancelPremium && (
                  <button
                    type="button"
                    onClick={() => handleCancelUserPremium(selectedUserDetail.user)}
                    disabled={savingUserId === selectedUserId}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingUserId === selectedUserId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    Cancel premium now
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSaveUser(selectedUserDetail.user)}
                  disabled={savingUserId === selectedUserId}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingUserId === selectedUserId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Save user access
                </button>
              </div>

              <p className="text-xs leading-5 text-gray-500">
                If admin cancels premium here, the user loses premium access immediately and must
                buy again with money to unlock premium again.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
