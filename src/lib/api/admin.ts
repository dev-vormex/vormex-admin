import apiClient from './client';

// ============================================
// AUTH & 2FA
// ============================================

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  profileImage: string | null;
  role: string;
}

export interface VerifyAdminResponse {
  isAdmin: boolean;
  user: AdminUser;
  twoFactorEnabled: boolean;
  requiresTwoFactor: boolean;
}

export async function verifyAdminAccess(): Promise<VerifyAdminResponse> {
  return apiClient.get('/admin/verify');
}

export async function setup2FA(): Promise<{ secret: string; qrCode: string }> {
  return apiClient.post('/admin/2fa/setup');
}

export async function verify2FA(token: string): Promise<{ success: boolean; message: string }> {
  return apiClient.post('/admin/2fa/verify', { token });
}

export async function validateTwoFactor(token: string): Promise<{ success: boolean; verified: boolean }> {
  return apiClient.post('/admin/2fa/validate', { token });
}

// ============================================
// DASHBOARD
// ============================================

export interface DashboardStats {
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
}

export interface RecentSignup {
  id: string;
  name: string;
  email: string;
  username: string;
  profileImage: string | null;
  createdAt: string;
  isVerified: boolean;
  college: string | null;
}

export interface DashboardResponse {
  stats: DashboardStats;
  recentSignups: RecentSignup[];
}

export async function getDashboardStats(): Promise<DashboardResponse> {
  return apiClient.get('/admin/dashboard/stats');
}

export async function getUserGrowthData(days: number = 30): Promise<{ data: { date: string; count: number }[] }> {
  return apiClient.get(`/admin/dashboard/user-growth?days=${days}`);
}

// ============================================
// PREMIUM
// ============================================

export type AgentAvailabilityMode = 'all' | 'selected' | 'disabled';

export interface PremiumAdminOverview {
  settings: {
    premiumDefaultAmountMinor: number;
    premiumCurrency: string;
    agentAvailabilityMode: AgentAvailabilityMode;
    premiumDisplayAmount: string;
  };
  stats: {
    activePremiumUsers: number;
    paidPremiumUsers: number;
    customPriceUsers: number;
    agentSelectedUsers: number;
    profileCustomizationGrantedUsers: number;
    clickCount: number;
    failureCount: number;
    successCount: number;
    paymentCount: number;
    paymentCountThisMonth: number;
  };
  revenue: {
    currency: string;
    totalMinor: number;
    totalDisplay: string;
    thisMonthMinor: number;
    thisMonthDisplay: string;
    activeRecurringMinor: number;
    activeRecurringDisplay: string;
    lastPayment: (PremiumPaymentRef & {
      createdAt: string;
      amountMinor: number | null;
      currency: string | null;
      displayAmount: string | null;
      user: { id: string; name: string; email: string };
    }) | null;
  };
}

/** Razorpay/Google Play references lifted out of a premium event's metadata JSON. */
export interface PremiumPaymentRef {
  provider: string | null;
  orderId: string | null;
  paymentId: string | null;
  plan: string | null;
  billingCycle: string | null;
  paymentMethod: string | null;
  source: string | null;
}

export interface PremiumAdminUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  profileImage: string | null;
  createdAt: string;
  isPremium: boolean;
  premiumStatus: string;
  premiumPlan: string;
  premiumProvider: string | null;
  premiumBillingCycle: string | null;
  premiumPaidAmountDisplay: string | null;
  premiumStartedAt: string | null;
  premiumEndsAt: string | null;
  premiumDaysRemaining: number;
  premiumPriceOverrideMinor: number | null;
  premiumDisplayAmount: string;
  agentEnabled: boolean;
  agentBlocked: boolean;
  canUseAgent: boolean;
  creditsUsed: number;
  profileCustomizationGranted: boolean;
  profileCustomizationBlocked: boolean;
  canAccessProfileCustomization: boolean;
  canCancelPremium: boolean;
}

export interface PremiumAdminUserDetail {
  user: {
    id: string;
    name: string;
    email: string;
    username: string | null;
    profileImage: string | null;
    createdAt: string;
    lastActiveAt: string | null;
    isOnline: boolean;
    college: string | null;
    branch: string | null;
    postsCount: number;
    connectionsCount: number;
    isPremium: boolean;
    premiumStatus: string;
    premiumStartedAt: string | null;
    premiumEndsAt: string | null;
    premiumDaysRemaining: number;
    premiumPriceOverrideMinor: number | null;
    premiumDisplayAmount: string;
    agentEnabled: boolean;
    agentBlocked: boolean;
    canUseAgent: boolean;
    profileCustomizationGranted: boolean;
    profileCustomizationBlocked: boolean;
    canAccessProfileCustomization: boolean;
    canCancelPremium: boolean;
    billing: {
      plan: string;
      provider: string;
      billingCycle: string | null;
      amountMinor: number | null;
      currency: string;
      amountDisplay: string | null;
      autoPayEnabled: boolean;
      currentPeriodStart: string | null;
      currentPeriodEnd: string | null;
      lastProviderSyncAt: string | null;
      googlePlayProductId: string | null;
      paymentCount: number;
      lifetimeValueMinor: number;
      lifetimeValueDisplay: string;
      payments: Array<
        PremiumPaymentRef & {
          id: string;
          createdAt: string;
          amountMinor: number | null;
          currency: string | null;
          displayAmount: string | null;
        }
      >;
    };
    usage: {
      creditsUsedCurrentCycle: number;
      agentMessagesAllTime: number;
      chatMessagesSent: number;
      conversationsCount: number;
      premiumEventsCount: number;
      lastAgentMessageAt: string | null;
      lastPremiumEvent: {
        createdAt: string;
        eventType: string;
        outcome: string;
        message: string | null;
      } | null;
    };
  };
}

export interface PremiumAdminUsersResponse {
  users: PremiumAdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PremiumAdminEvent {
  id: string;
  eventType: string;
  outcome: string;
  message: string | null;
  amountMinor: number | null;
  currency: string | null;
  displayAmount: string | null;
  createdAt: string;
  payment: PremiumPaymentRef;
  user: {
    id: string;
    name: string;
    email: string;
    username: string | null;
  };
}

export interface PremiumAdminEventsResponse {
  events: PremiumAdminEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getPremiumAdminOverview(): Promise<PremiumAdminOverview> {
  return apiClient.get('/admin/premium/overview');
}

export async function updatePremiumAdminSettings(input: {
  premiumDefaultAmountMinor: number;
  premiumCurrency: string;
  agentAvailabilityMode: AgentAvailabilityMode;
}): Promise<{ message: string; settings: PremiumAdminOverview['settings'] }> {
  return apiClient.put('/admin/premium/settings', input);
}

export async function getPremiumAdminUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
  filter?: 'all' | 'premium' | 'overrides';
} = {}): Promise<PremiumAdminUsersResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.search) query.set('search', params.search);
  if (params.filter) query.set('filter', params.filter);
  return apiClient.get(`/admin/premium/users?${query.toString()}`);
}

export async function updatePremiumAdminUser(
  userId: string,
  input: {
    premiumPriceOverrideMinor?: number | null;
    agentEnabled?: boolean;
    agentBlocked?: boolean;
    profileCustomizationGranted?: boolean;
    profileCustomizationBlocked?: boolean;
  }
): Promise<{
  message: string;
  user: {
    id: string;
    premiumPriceOverrideMinor: number | null;
    agentEnabled: boolean;
    agentBlocked: boolean;
    profileCustomizationGranted: boolean;
    profileCustomizationBlocked: boolean;
    canUseAgent: boolean;
    canAccessProfileCustomization: boolean;
    premiumDisplayAmount: string;
  };
}> {
  return apiClient.patch(`/admin/premium/users/${userId}`, input);
}

export async function getPremiumAdminUserDetail(
  userId: string
): Promise<PremiumAdminUserDetail> {
  return apiClient.get(`/admin/premium/users/${userId}`);
}

export async function cancelPremiumAdminUser(
  userId: string
): Promise<{
  message: string;
  user: {
    id: string;
    isPremium: boolean;
    premiumStatus: string;
    premiumEndsAt: string | null;
    premiumDaysRemaining: number;
    canUseAgent: boolean;
    canAccessProfileCustomization: boolean;
  };
}> {
  return apiClient.post(`/admin/premium/users/${userId}/cancel`);
}

export async function sendPremiumAdminUserMessage(
  userId: string,
  message: string
): Promise<{
  message: string;
  conversationId: string;
  directMessage: {
    id: string;
    conversationId: string;
    content: string;
    createdAt: string;
  };
}> {
  return apiClient.post(`/admin/premium/users/${userId}/message`, { message });
}

export async function getPremiumAdminEvents(params: {
  page?: number;
  limit?: number;
  search?: string;
  filter?: 'all' | 'clicked' | 'failed' | 'success' | 'payments';
} = {}): Promise<PremiumAdminEventsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.search) query.set('search', params.search);
  if (params.filter) query.set('filter', params.filter);
  return apiClient.get(`/admin/premium/events?${query.toString()}`);
}

// ============================================
// NOTIFICATIONS
// ============================================

export type AdminNotificationAudience = 'all' | 'filtered' | 'specific';

export interface NotificationAudienceFiltersResponse {
  colleges: string[];
  skills: string[];
}

export interface SendAdminNotificationInput {
  audience: AdminNotificationAudience;
  title: string;
  body: string;
  search?: string;
  colleges?: string[];
  skills?: string[];
  userIds?: string[];
}

export interface SendAdminNotificationResponse {
  message: string;
  recipientsCount: number;
  pushSuccessCount: number;
  recipientsPreview: Array<{
    id: string;
    name: string;
    username: string;
  }>;
}

export async function getNotificationAudienceFilters(): Promise<NotificationAudienceFiltersResponse> {
  return apiClient.get('/admin/notifications/filters');
}

export async function sendAdminNotification(input: SendAdminNotificationInput): Promise<SendAdminNotificationResponse> {
  return apiClient.post('/admin/notifications/send', input);
}

export interface ReengagementConfiguredSlot {
  hourIst: number;
  key: string;
  tone: string;
}

export interface ReengagementDeliveryBreakdownRow {
  slotKey: string;
  status: string;
  _count: {
    _all: number;
  };
}

export interface ReengagementRecentDelivery {
  userId: string;
  campaignDateKey: string;
  slotKey: string;
  campaignType: string;
  status: string;
  title: string;
  reason: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface ReengagementStatusResponse {
  enabled: boolean;
  redisConfigured: boolean;
  fcmConfigured: boolean;
  now: string;
  currentIstHour: number;
  currentSlotKey: string | null;
  currentSlotDateKey: string | null;
  configuredSlots: ReengagementConfiguredSlot[];
  deliveryBreakdown: ReengagementDeliveryBreakdownRow[];
  recentDeliveries: ReengagementRecentDelivery[];
  note: string;
}

export interface ReengagementCandidatePreview {
  id: string;
  isRecentlyActive: boolean;
  name: string;
  primaryGoal: string | null;
  reason: string;
  sameCollege: boolean;
  sameGoal: boolean;
}

export interface ReengagementCopyPreview {
  title: string;
  body: string;
  campaignType: 'match' | 'growth' | 'streak';
  data: Record<string, string>;
}

export interface ReengagementGrowthSnapshot {
  acceptedConnections: number;
  directMessages: number;
  groupMessages: number;
  postComments: number;
  postsCreated: number;
  reelComments: number;
  reelsCreated: number;
}

export interface ReengagementDryRunUser {
  college: string | null;
  createdAt: string | null;
  id: string;
  isBanned: boolean;
  isOnline: boolean;
  lastActiveAt: string | null;
  name: string | null;
  primaryGoal: string | null;
}

export interface ReengagementDryRunResponse {
  candidate: ReengagementCandidatePreview | null;
  copy: ReengagementCopyPreview | null;
  currentIstHour: number;
  eligible: boolean;
  enabled: boolean;
  existingDeliveryStatus: string | null;
  growthSnapshot: ReengagementGrowthSnapshot;
  hasActiveDeviceToken: boolean;
  hasMeaningfulGrowthToday: boolean;
  highestStreak: number;
  meaningfulGrowthCount: number;
  reason: string;
  sendAttempted: boolean;
  sent: boolean;
  slotDateKey: string | null;
  slotKey: string | null;
  user: ReengagementDryRunUser | null;
  mode: 'preview' | 'send';
  requestedAt: string;
}

export async function getReengagementNotificationStatus(now?: string): Promise<ReengagementStatusResponse> {
  const query = new URLSearchParams();
  if (now) query.set('now', now);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get(`/admin/notifications/reengagement/status${suffix}`);
}

export async function runReengagementNotificationDryRun(input: {
  userId: string;
  send?: boolean;
  now?: string;
}): Promise<ReengagementDryRunResponse> {
  return apiClient.post('/admin/notifications/reengagement/dry-run', input);
}

// ============================================
// CHAT STORAGE
// ============================================

export interface ChatStorageSummary {
  conversations: number;
  directMessages: number;
  groupMessages: number;
  directReactions: number;
  groupReactions: number;
  messageNotifications: number;
  moderationChatReports: number;
  mediaMessages: number;
  chatUploadFiles: number;
  chatUploadBytes: number;
}

export interface ChatStorageSummaryResponse {
  confirmationText: string;
  summary: ChatStorageSummary;
}

export interface ClearChatStorageResponse {
  message: string;
  deleted: {
    conversations: number;
    directMessages: number;
    groupMessages: number;
    directReactions: number;
    groupReactions: number;
    messageNotifications: number;
    moderationReportsDetached: number;
    outboxEvents: number;
  };
  media: {
    filesFound: number;
    bytesFromRows: number;
    deleted: number;
    failed: number;
  };
}

export async function getChatStorageSummary(): Promise<ChatStorageSummaryResponse> {
  return apiClient.get('/admin/chats/storage');
}

export async function clearAllChats(confirmText: string): Promise<ClearChatStorageResponse> {
  return apiClient.post('/admin/chats/clear', { confirmText });
}

// ============================================
// USERS
// ============================================

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  username: string;
  profileImage: string | null;
  college: string | null;
  branch: string | null;
  graduationYear: number | null;
  isVerified: boolean;
  identityTrustLevel?: string;
  isBanned: boolean;
  bannedReason: string | null;
  safetyRestrictedUntil?: string | null;
  safetySuspendedUntil?: string | null;
  isAdmin: boolean;
  role: string;
  reelsAccess: boolean;
  profileTheme: 'default' | 'game_retro';
  createdAt: string;
  lastActiveAt: string | null;
  isOnline: boolean;
  authProvider: string;
  hasActivePushToken: boolean;
  activePushPlatforms: string[];
  lastPushTokenAt: string | null;
  skills: string[];
  _count: {
    posts: number;
    connectionsSent: number;
    connectionsReceived: number;
  };
}

export interface UsersResponse {
  users: AdminUserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'verified' | 'unverified' | 'banned';
  excludeBanned?: boolean;
  hasActivePushToken?: boolean;
  colleges?: string[];
  skills?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function getUsers(params: GetUsersParams = {}): Promise<UsersResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.excludeBanned) query.set('excludeBanned', 'true');
  if (typeof params.hasActivePushToken === 'boolean') {
    query.set('hasActivePushToken', String(params.hasActivePushToken));
  }
  params.colleges?.forEach((college) => query.append('college', college));
  params.skills?.forEach((skill) => query.append('skill', skill));
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  return apiClient.get(`/admin/users?${query.toString()}`);
}

export async function getUserById(id: string): Promise<{ user: any }> {
  return apiClient.get(`/admin/users/${id}`);
}

export async function updateUser(id: string, data: Partial<AdminUserListItem>): Promise<{ user: any; message: string }> {
  return apiClient.put(`/admin/users/${id}`, data);
}

export async function banUser(id: string, reason?: string): Promise<{ message: string }> {
  return apiClient.post(`/admin/users/${id}/ban`, { reason });
}

export async function unbanUser(id: string): Promise<{ message: string }> {
  return apiClient.post(`/admin/users/${id}/unban`);
}

export async function verifyUser(id: string): Promise<{ message: string }> {
  return apiClient.post(`/admin/users/${id}/verify`);
}

export async function warnUser(id: string, reason: string, note?: string): Promise<{ message: string }> {
  return apiClient.post(`/admin/users/${id}/warn`, { reason, note });
}

export async function restrictUser(
  id: string,
  input: { reason: string; days?: number; until?: string }
): Promise<{ message: string; restrictedUntil: string }> {
  return apiClient.post(`/admin/users/${id}/restrict`, input);
}

export async function suspendUser(
  id: string,
  input: { reason: string; days?: number; until?: string }
): Promise<{ message: string; suspendedUntil: string }> {
  return apiClient.post(`/admin/users/${id}/suspend`, input);
}

export async function clearUserSafetyRestriction(id: string, reason?: string): Promise<{ message: string }> {
  return apiClient.post(`/admin/users/${id}/clear-safety-restrictions`, { reason });
}

export async function deleteUser(id: string): Promise<{ message: string }> {
  return apiClient.delete(`/admin/users/${id}`);
}

// ============================================
// POSTS
// ============================================

export interface AdminPost {
  id: string;
  type: string;
  content: string | null;
  articleTitle: string | null;
  mediaUrls: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string;
    profileImage: string | null;
  };
}

export interface PostsResponse {
  posts: AdminPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getPosts(params: { page?: number; limit?: number; type?: string; search?: string } = {}): Promise<PostsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.type) query.set('type', params.type);
  if (params.search) query.set('search', params.search);
  return apiClient.get(`/admin/posts?${query.toString()}`);
}

export async function deletePost(id: string): Promise<{ message: string }> {
  return apiClient.delete(`/admin/posts/${id}`);
}

// ============================================
// REELS
// ============================================

export interface AdminReel {
  id: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  isAd: boolean;
  sponsorName: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  isActive: boolean;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savesCount: number;
  viewsCount: number;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string;
    profileImage: string | null;
  };
}

export interface ReelsResponse {
  reels: AdminReel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getReels(params: { page?: number; limit?: number; type?: string; search?: string } = {}): Promise<ReelsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.type) query.set('type', params.type);
  if (params.search) query.set('search', params.search);
  return apiClient.get(`/admin/reels?${query.toString()}`);
}

export async function deleteReel(id: string): Promise<{ message: string }> {
  return apiClient.delete(`/admin/reels/${id}`);
}

export async function getReelsAccessSettings(): Promise<{ enabled: boolean; totalUsers: number; enabledUsers: number }> {
  return apiClient.get('/admin/reels/access');
}

export async function setReelsAccessForAll(enabled: boolean, applyToExisting: boolean = true): Promise<{ message: string; enabled: boolean; applyToExisting: boolean }> {
  return apiClient.post('/admin/reels/access/all', { enabled, applyToExisting });
}

export async function setUserReelsAccess(userId: string, enabled: boolean): Promise<{ message: string; user: { id: string; reelsAccess: boolean } }> {
  return apiClient.patch(`/admin/users/${userId}/reels-access`, { enabled });
}

// ============================================
// MANAGED ADS
// ============================================

export type ManagedAdStatus = 'draft' | 'active' | 'paused' | 'archived';
export type ManagedAdPlacementName = 'feed' | 'reels' | 'sidebar';
export type ManagedAdCtaKind = 'external_url' | 'vormex_deeplink';

export interface ManagedAdCampaign {
  id: string;
  name: string;
  sponsorName: string;
  status: ManagedAdStatus;
  placements: ManagedAdPlacementName[];
  priority: number;
  startsAt: string | null;
  endsAt: string | null;
  frequencyCapPerDay: number;
  ctaText: string | null;
  ctaKind: ManagedAdCtaKind | null;
  ctaUrl: string | null;
  feedTitle: string | null;
  feedBody: string | null;
  feedImageUrl: string | null;
  reelCaption: string | null;
  reelsVideoUrl: string | null;
  reelsHlsUrl: string | null;
  reelsThumbnailUrl: string | null;
  targeting: Record<string, unknown> | null;
  impressionsCount: number;
  clicksCount: number;
  createdByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
  createdByAdmin?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

export interface ManagedAdsResponse {
  ads: ManagedAdCampaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ManagedAdInput {
  name?: string;
  sponsorName?: string;
  status?: ManagedAdStatus;
  placements?: ManagedAdPlacementName[];
  priority?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  frequencyCapPerDay?: number;
  ctaText?: string | null;
  ctaKind?: ManagedAdCtaKind | null;
  ctaUrl?: string | null;
  feedTitle?: string | null;
  feedBody?: string | null;
  feedImageUrl?: string | null;
  reelCaption?: string | null;
  reelsVideoUrl?: string | null;
  reelsHlsUrl?: string | null;
  reelsThumbnailUrl?: string | null;
  targeting?: Record<string, unknown> | null;
}

export interface ManagedAdFiles {
  feedImage?: File | null;
  reelsVideo?: File | null;
  reelsThumbnail?: File | null;
}

export interface ManagedAdAnalytics {
  campaign: ManagedAdCampaign;
  breakdown: Array<{
    eventType: 'impression' | 'click';
    placement: ManagedAdPlacementName;
    _count: { _all: number };
  }>;
  recentEvents: Array<{
    id: string;
    eventType: 'impression' | 'click';
    placement: ManagedAdPlacementName;
    slotKey: string | null;
    sessionId: string | null;
    createdAt: string;
    user?: { id: string; name: string | null; username: string | null } | null;
  }>;
}

function managedAdFormData(data: ManagedAdInput, files: ManagedAdFiles = {}): FormData {
  const formData = new FormData();
  formData.append('data', JSON.stringify(data));
  if (files.feedImage) formData.append('feedImage', files.feedImage);
  if (files.reelsVideo) formData.append('reelsVideo', files.reelsVideo);
  if (files.reelsThumbnail) formData.append('reelsThumbnail', files.reelsThumbnail);
  return formData;
}

export async function getManagedAds(params: {
  page?: number;
  limit?: number;
  status?: ManagedAdStatus | 'all';
  placement?: ManagedAdPlacementName | 'all';
  search?: string;
} = {}): Promise<ManagedAdsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);
  if (params.placement) query.set('placement', params.placement);
  if (params.search) query.set('search', params.search);
  const suffix = query.toString();
  return apiClient.get(`/admin/ads${suffix ? `?${suffix}` : ''}`);
}

export async function getManagedAd(id: string): Promise<{ ad: ManagedAdCampaign }> {
  return apiClient.get(`/admin/ads/${id}`);
}

export async function createManagedAd(data: ManagedAdInput, files?: ManagedAdFiles): Promise<{ ad: ManagedAdCampaign }> {
  return apiClient.post('/admin/ads', managedAdFormData(data, files), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function updateManagedAd(
  id: string,
  data: ManagedAdInput,
  files?: ManagedAdFiles
): Promise<{ ad: ManagedAdCampaign }> {
  return apiClient.patch(`/admin/ads/${id}`, managedAdFormData(data, files), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function archiveManagedAd(id: string): Promise<{ message: string }> {
  return apiClient.delete(`/admin/ads/${id}`);
}

export async function getManagedAdAnalytics(id: string): Promise<ManagedAdAnalytics> {
  return apiClient.get(`/admin/ads/${id}/analytics`);
}

// ============================================
// GROUPS
// ============================================

export interface AdminGroup {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  privacy: string;
  coverImage: string | null;
  iconImage?: string | null;
  imageUrl?: string | null;
  memberCount?: number;
  createdAt: string;
  updatedAt?: string;
  createdBy: {
    id: string;
    name: string;
    username: string | null;
  };
  _count: {
    members: number;
    posts: number;
    messages?: number;
  };
}

export interface GroupsResponse {
  groups: AdminGroup[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminGroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: string;
  joinedAt: string;
  isCreator: boolean;
  user: {
    id: string;
    name: string;
    username: string | null;
    email: string | null;
    profileImage: string | null;
    headline: string | null;
    isBanned: boolean;
  };
}

export interface AdminGroupMembersResponse {
  group: AdminGroup;
  members: AdminGroupMember[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ClearAdminGroupChatResponse {
  message: string;
  group: {
    id: string;
    name: string;
  };
  deleted: {
    groupMessages: number;
    groupReactions: number;
  };
  media: {
    filesFound: number;
    bytesFromRows: number;
    deleted: number;
    failed: number;
  };
}

export async function getGroups(params: { page?: number; limit?: number; search?: string } = {}): Promise<GroupsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.search) query.set('search', params.search);
  return apiClient.get(`/admin/groups?${query.toString()}`);
}

export async function deleteGroup(id: string): Promise<{ message: string }> {
  return apiClient.delete(`/admin/groups/${id}`);
}

export async function getAdminGroupMembers(
  id: string,
  params: { page?: number; limit?: number; search?: string; role?: string } = {}
): Promise<AdminGroupMembersResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.search) query.set('search', params.search);
  if (params.role && params.role !== 'all') query.set('role', params.role);
  return apiClient.get(`/admin/groups/${id}/members?${query.toString()}`);
}

export async function updateAdminGroupMemberRole(
  groupId: string,
  userId: string,
  role: string
): Promise<{ message: string; member: AdminGroupMember }> {
  return apiClient.patch(`/admin/groups/${groupId}/members/${userId}`, { role });
}

export async function removeAdminGroupMember(
  groupId: string,
  userId: string
): Promise<{ message: string; memberCount: number }> {
  return apiClient.delete(`/admin/groups/${groupId}/members/${userId}`);
}

export async function clearAdminGroupChat(
  groupId: string,
  confirmText: string
): Promise<ClearAdminGroupChatResponse> {
  return apiClient.post(`/admin/groups/${groupId}/clear-chat`, { confirmText });
}

// ============================================
// JOBS & COMPANIES
// ============================================

export async function getJobs(params: { page?: number; limit?: number } = {}): Promise<any> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  return apiClient.get(`/admin/jobs?${query.toString()}`);
}

export async function getCompanies(params: { page?: number; limit?: number } = {}): Promise<any> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  return apiClient.get(`/admin/companies?${query.toString()}`);
}

// ============================================
// AUDIT LOGS
// ============================================

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  admin: {
    id: string;
    name: string;
    email: string;
    profileImage: string | null;
  };
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getAuditLogs(params: { page?: number; limit?: number; action?: string; entityType?: string } = {}): Promise<AuditLogsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.action) query.set('action', params.action);
  if (params.entityType) query.set('entityType', params.entityType);
  return apiClient.get(`/admin/audit-logs?${query.toString()}`);
}

// ============================================
// TRUST & SAFETY
// ============================================

export type IdentityVerificationType = 'PHONE' | 'STUDENT_EMAIL' | 'ID_DOCUMENT';
export type IdentityVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

export interface IdentityReview {
  id: string;
  userId: string;
  type: IdentityVerificationType;
  status: IdentityVerificationStatus;
  valueMasked: string | null;
  evidence: {
    hasFile: boolean;
    fileName: string | null;
    mimeType: string | null;
    size: number | null;
    deletedAt: string | null;
  };
  reviewNotes: string | null;
  rejectionReason: string | null;
  requestedAt: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    profileImage: string | null;
    identityTrustLevel: string;
    emailVerified: boolean;
    phoneMasked: string | null;
    phoneVerifiedAt: string | null;
  } | null;
  reviewer: {
    id: string;
    name: string;
    username: string;
    email: string;
  } | null;
}

export interface IdentityReviewsResponse {
  reviews: IdentityReview[];
  pendingCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getIdentityReviews(params: {
  page?: number;
  limit?: number;
  status?: IdentityVerificationStatus | 'all';
  type?: IdentityVerificationType | 'all';
} = {}): Promise<IdentityReviewsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.status) query.set('status', params.status);
  if (params.type) query.set('type', params.type);
  return apiClient.get(`/admin/identity-reviews?${query.toString()}`);
}

export async function getIdentityReviewById(id: string): Promise<{ review: IdentityReview }> {
  return apiClient.get(`/admin/identity-reviews/${id}`);
}

export async function getIdentityReviewEvidenceBlob(id: string): Promise<Blob> {
  return apiClient.get(`/admin/identity-reviews/${id}/evidence`, { responseType: 'blob' });
}

export async function approveIdentityReview(
  id: string,
  reviewNotes?: string
): Promise<{ message: string; review: IdentityReview }> {
  return apiClient.post(`/admin/identity-reviews/${id}/approve`, { reviewNotes });
}

export async function rejectIdentityReview(
  id: string,
  input: { rejectionReason: string; reviewNotes?: string }
): Promise<{ message: string; review: IdentityReview }> {
  return apiClient.post(`/admin/identity-reviews/${id}/reject`, input);
}

// ============================================
// REPORTS
// ============================================

export type ReportType = 'POST' | 'CHAT' | 'USER' | 'COMMENT' | 'GROUP';
export type ReportStatus = 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
export type ReportActionTaken = 
  | 'NONE' 
  | 'MARK_UNDER_REVIEW'
  | 'WARNING_ISSUED' 
  | 'USER_WARNED'
  | 'USER_RESTRICTED'
  | 'CONTENT_REMOVED' 
  | 'USER_BANNED' 
  | 'USER_SUSPENDED' 
  | 'NO_VIOLATION'
  | 'DISMISSED_INVALID' 
  | 'DISMISSED_DUPLICATE';

export interface ReportUser {
  id: string;
  name: string;
  username: string;
  profileImage: string | null;
  email?: string;
  isBanned?: boolean;
  bannedReason?: string | null;
  identityTrustLevel?: string;
  safetyRestrictedUntil?: string | null;
  safetySuspendedUntil?: string | null;
}

export interface AdminReport {
  id: string;
  reportType: ReportType;
  reason: string;
  description: string | null;
  status: ReportStatus;
  priority: number;
  actionTaken: ReportActionTaken;
  adminNotes: string | null;
  banReason?: string | null;
  evidenceSnapshot?: any;
  reporterPriorReports?: number;
  reportedUserPriorReports?: number;
  blockedUserAfterReport?: boolean;
  deviceScopedBlock?: boolean;
  deviceScopeCount?: number;
  deviceLinkedAccountCount?: number;
  chatMessages: any[] | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reporter: ReportUser;
  reportedUser: ReportUser | null;
  post: {
    id: string;
    content: string;
    type: string;
    mediaUrls: string[];
    createdAt: string;
    author: ReportUser;
  } | null;
  comment: {
    id: string;
    content: string;
    createdAt: string;
    author: ReportUser;
  } | null;
  conversation: {
    id: string;
    participant1: ReportUser;
    participant2: ReportUser;
  } | null;
  group: {
    id: string;
    name: string;
    slug: string;
    coverImage: string | null;
  } | null;
  reviewedBy: {
    id: string;
    name: string;
    profileImage: string | null;
  } | null;
}

export interface ReportsResponse {
  reports: AdminReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statusCounts: {
    PENDING: number;
    UNDER_REVIEW: number;
    RESOLVED: number;
    DISMISSED: number;
  };
}

export interface ReportStats {
  total: number;
  pending: number;
  underReview: number;
  resolved: number;
}

export interface GetReportsParams {
  page?: number;
  limit?: number;
  status?: ReportStatus | 'all';
  type?: ReportType | 'all';
  priority?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function getReports(params: GetReportsParams = {}): Promise<ReportsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.status) query.set('status', params.status);
  if (params.type) query.set('type', params.type);
  if (params.priority !== undefined) query.set('priority', params.priority.toString());
  if (params.search) query.set('search', params.search);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  return apiClient.get(`/admin/reports?${query.toString()}`);
}

export async function getReportById(id: string): Promise<{ report: AdminReport; previousReports: any[] }> {
  return apiClient.get(`/admin/reports/${id}`);
}

export async function updateReportStatus(id: string, status: ReportStatus): Promise<{ message: string; report: AdminReport }> {
  return apiClient.patch(`/admin/reports/${id}/status`, { status });
}

export async function updateReportPriority(id: string, priority: number): Promise<{ message: string; report: AdminReport }> {
  return apiClient.patch(`/admin/reports/${id}/priority`, { priority });
}

export async function takeReportAction(
  id: string, 
  action: ReportActionTaken, 
  adminNotes?: string,
  banReason?: string,
  extra?: { reason?: string; days?: number; until?: string }
): Promise<{ message: string; report: AdminReport; actionResults: any }> {
  return apiClient.post(`/admin/reports/${id}/action`, { action, adminNotes, banReason, ...extra });
}

export async function getReportStats(): Promise<ReportStats> {
  return apiClient.get('/admin/reports/stats');
}
