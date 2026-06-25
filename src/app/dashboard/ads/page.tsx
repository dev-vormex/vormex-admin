'use client';

import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import {
  Archive,
  BarChart3,
  CheckCircle2,
  Edit3,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Upload,
  Video,
} from 'lucide-react';
import {
  archiveManagedAd,
  createManagedAd,
  getManagedAdAnalytics,
  getManagedAds,
  updateManagedAd,
  type ManagedAdAnalytics,
  type ManagedAdCampaign,
  type ManagedAdCtaKind,
  type ManagedAdInput,
  type ManagedAdPlacementName,
  type ManagedAdStatus,
} from '@/lib/api/admin';

type AdsFilter = 'all' | ManagedAdStatus;
type PlacementFilter = 'all' | ManagedAdPlacementName;
type EditorStep = 'basics' | 'creative' | 'advanced';

type AdDraft = {
  name: string;
  sponsorName: string;
  status: ManagedAdStatus;
  placements: ManagedAdPlacementName[];
  priority: string;
  frequencyCapPerDay: string;
  startsAt: string;
  endsAt: string;
  ctaText: string;
  ctaKind: ManagedAdCtaKind;
  ctaUrl: string;
  feedTitle: string;
  feedBody: string;
  reelCaption: string;
  targeting: string;
};

type AdFiles = {
  feedImage: File | null;
  reelsVideo: File | null;
  reelsThumbnail: File | null;
};

const emptyDraft: AdDraft = {
  name: '',
  sponsorName: '',
  status: 'draft',
  placements: ['feed'],
  priority: '0',
  frequencyCapPerDay: '3',
  startsAt: '',
  endsAt: '',
  ctaText: 'Learn more',
  ctaKind: 'external_url',
  ctaUrl: '',
  feedTitle: '',
  feedBody: '',
  reelCaption: '',
  targeting: '{\n  "include": {},\n  "exclude": {}\n}',
};

const targetingChips = [
  { label: 'College', key: 'colleges', value: ['Example University'] },
  { label: 'Premium', key: 'premiumStates', value: ['premium', 'creator_pro'] },
  { label: 'City', key: 'cities', value: ['Bengaluru'] },
  { label: 'Skills', key: 'skills', value: ['React', 'Kotlin'] },
  { label: 'Open to work', key: 'openToOpportunities', value: true },
];

const editorSteps: Array<{ key: EditorStep; label: string }> = [
  { key: 'basics', label: 'Basics' },
  { key: 'creative', label: 'Creative' },
  { key: 'advanced', label: 'Advanced' },
];

function toDateTimeLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function adToDraft(ad: ManagedAdCampaign): AdDraft {
  return {
    name: ad.name || '',
    sponsorName: ad.sponsorName || '',
    status: ad.status,
    placements: ad.placements.length ? ad.placements : ['feed'],
    priority: String(ad.priority ?? 0),
    frequencyCapPerDay: String(ad.frequencyCapPerDay ?? 3),
    startsAt: toDateTimeLocal(ad.startsAt),
    endsAt: toDateTimeLocal(ad.endsAt),
    ctaText: ad.ctaText || 'Learn more',
    ctaKind: ad.ctaKind || 'external_url',
    ctaUrl: ad.ctaUrl || '',
    feedTitle: ad.feedTitle || '',
    feedBody: ad.feedBody || '',
    reelCaption: ad.reelCaption || '',
    targeting: JSON.stringify(ad.targeting || { include: {}, exclude: {} }, null, 2),
  };
}

function dateToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseTargeting(value: string): Record<string, unknown> | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = JSON.parse(trimmed);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
}

function parseTargetingForSave(value: string): Record<string, unknown> | null {
  try {
    return parseTargeting(value);
  } catch {
    throw new Error('Targeting JSON is not valid.');
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value || 0);
}

function statusTone(status: ManagedAdStatus): string {
  if (status === 'active') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
  if (status === 'paused') return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
  if (status === 'archived') return 'bg-gray-500/10 text-gray-400 border-gray-700';
  return 'bg-sky-500/10 text-sky-300 border-sky-500/30';
}

function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: unknown; message?: unknown } } }).response;
    const serverMessage = response?.data?.error || response?.data?.message;
    if (typeof serverMessage === 'string' && serverMessage.trim()) {
      return serverMessage;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function AdsDashboardPage() {
  const [ads, setAds] = useState<ManagedAdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdsFilter>('all');
  const [placementFilter, setPlacementFilter] = useState<PlacementFilter>('all');
  const [editingAd, setEditingAd] = useState<ManagedAdCampaign | null>(null);
  const [draft, setDraft] = useState<AdDraft>({ ...emptyDraft });
  const [files, setFiles] = useState<AdFiles>({ feedImage: null, reelsVideo: null, reelsThumbnail: null });
  const [analytics, setAnalytics] = useState<ManagedAdAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [editorStep, setEditorStep] = useState<EditorStep>('basics');

  const loadAds = useCallback(async (options: { silent?: boolean } = {}) => {
    const silent = options.silent === true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const response = await getManagedAds({
        page: 1,
        limit: 50,
        status: statusFilter,
        placement: placementFilter,
        search: search || undefined,
      });
      setAds(response.ads);
    } catch (loadError) {
      if (!silent) {
        setError(errorMessage(loadError, 'Failed to load ads.'));
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [placementFilter, search, statusFilter]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const totals = useMemo(() => {
    const impressions = ads.reduce((sum, ad) => sum + ad.impressionsCount, 0);
    const clicks = ads.reduce((sum, ad) => sum + ad.clicksCount, 0);
    return {
      active: ads.filter((ad) => ad.status === 'active').length,
      impressions,
      clicks,
      ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00',
    };
  }, [ads]);

  const selectedHasReelsVideo = Boolean(editingAd?.reelsVideoUrl || editingAd?.reelsHlsUrl || files.reelsVideo);
  const selectedHasFeedImage = Boolean(editingAd?.feedImageUrl || files.feedImage);

  const loadAnalyticsForAd = useCallback(async (adId: string) => {
    setAnalyticsLoading(true);
    try {
      setAnalytics(await getManagedAdAnalytics(adId));
    } catch {
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const selectAd = (ad: ManagedAdCampaign) => {
    setEditingAd(ad);
    setDraft(adToDraft(ad));
    setFiles({ feedImage: null, reelsVideo: null, reelsThumbnail: null });
    setAnalytics(null);
    setEditorStep('basics');
    void loadAnalyticsForAd(ad.id);
  };

  const startNewAd = () => {
    setEditingAd(null);
    setDraft({ ...emptyDraft });
    setFiles({ feedImage: null, reelsVideo: null, reelsThumbnail: null });
    setAnalytics(null);
    setEditorStep('basics');
  };

  const togglePlacement = (placement: ManagedAdPlacementName) => {
    setDraft((current) => {
      const hasPlacement = current.placements.includes(placement);
      const nextPlacements = hasPlacement
        ? current.placements.filter((item) => item !== placement)
        : [...current.placements, placement];
      return { ...current, placements: nextPlacements };
    });
  };

  const insertTargetingChip = (key: string, value: unknown) => {
    setDraft((current) => {
      let parsed: Record<string, unknown> = { include: {}, exclude: {} };
      try {
        parsed = parseTargeting(current.targeting) || parsed;
      } catch {
        parsed = { include: {}, exclude: {} };
      }
      return {
        ...current,
        targeting: JSON.stringify(
          {
            ...parsed,
            include: {
              ...((parsed.include as Record<string, unknown> | undefined) || {}),
              [key]: value,
            },
          },
          null,
          2
        ),
      };
    });
  };

  const buildInput = (): ManagedAdInput => ({
    name: draft.name.trim(),
    sponsorName: draft.sponsorName.trim(),
    status: draft.status,
    placements: draft.placements,
    priority: Number(draft.priority || 0),
    frequencyCapPerDay: Number(draft.frequencyCapPerDay || 3),
    startsAt: dateToIso(draft.startsAt),
    endsAt: dateToIso(draft.endsAt),
    ctaText: draft.ctaText.trim() || null,
    ctaKind: draft.ctaKind,
    ctaUrl: draft.ctaUrl.trim() || null,
    feedTitle: draft.feedTitle.trim() || null,
    feedBody: draft.feedBody.trim() || null,
    reelCaption: draft.reelCaption.trim() || null,
    targeting: parseTargetingForSave(draft.targeting),
  });

  const saveAd = async () => {
    setSaving(true);
    setError(null);
    try {
      if (draft.status === 'active') {
        if (draft.placements.length === 0) {
          throw new Error('Active campaigns need at least one placement.');
        }
        if (
          draft.placements.includes('feed') &&
          !draft.feedTitle.trim() &&
          !draft.feedBody.trim() &&
          !selectedHasFeedImage
        ) {
          setEditorStep('creative');
          throw new Error('Active feed campaigns need a title, body, or image.');
        }
        if (draft.placements.includes('reels') && !selectedHasReelsVideo) {
          setEditorStep('creative');
          throw new Error('Active reels campaigns need a video. Save as draft until the video is uploaded.');
        }
      }
      const input = buildInput();
      const response = editingAd
        ? await updateManagedAd(editingAd.id, input, files)
        : await createManagedAd(input, files);
      const savedAd = response.ad;
      setEditingAd(savedAd);
      setDraft(adToDraft(savedAd));
      setFiles({ feedImage: null, reelsVideo: null, reelsThumbnail: null });
      setAnalytics(null);
      setAnalyticsLoading(false);
      setAds((currentAds) => {
        const withoutSaved = currentAds.filter((ad) => ad.id !== savedAd.id);
        return [savedAd, ...withoutSaved];
      });
      void loadAds({ silent: true });
      void loadAnalyticsForAd(savedAd.id);
    } catch (saveError) {
      setError(errorMessage(saveError, 'Failed to save ad.'));
    } finally {
      setSaving(false);
    }
  };

  const quickStatus = async (ad: ManagedAdCampaign, status: ManagedAdStatus) => {
    setError(null);
    try {
      await updateManagedAd(ad.id, { status });
      await loadAds();
    } catch (statusError) {
      setError(errorMessage(statusError, 'Failed to update status.'));
    }
  };

  const archiveAd = async (ad: ManagedAdCampaign) => {
    setError(null);
    try {
      await archiveManagedAd(ad.id);
      if (editingAd?.id === ad.id) startNewAd();
      await loadAds();
    } catch (archiveError) {
      setError(errorMessage(archiveError, 'Failed to archive ad.'));
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Megaphone className="h-7 w-7 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Ads</h1>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
            <MetricPill label="Active" value={formatNumber(totals.active)} />
            <MetricPill label="Impressions" value={formatNumber(totals.impressions)} />
            <MetricPill label="Clicks" value={formatNumber(totals.clicks)} />
            <MetricPill label="CTR" value={`${totals.ctr}%`} />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadAds()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={startNewAd}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-xl border border-gray-800 bg-gray-900/70">
          <div className="border-b border-gray-800 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Campaigns</h2>
              <span className="text-xs text-gray-500">{ads.length} total</span>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search"
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as AdsFilter)}
                  className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                >
                  <option value="all">All status</option>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </select>
                <select
                  value={placementFilter}
                  onChange={(event) => setPlacementFilter(event.target.value as PlacementFilter)}
                  className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                >
                  <option value="all">All slots</option>
                  <option value="feed">Feed</option>
                  <option value="reels">Reels</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex h-60 items-center justify-center text-gray-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading
            </div>
          ) : (
            <div className="max-h-[680px] overflow-y-auto p-2">
              {ads.map((ad) => (
                <button
                  key={ad.id}
                  onClick={() => selectAd(ad)}
                  className={`mb-2 w-full rounded-lg border p-3 text-left transition ${
                    editingAd?.id === ad.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-800 bg-gray-950/40 hover:border-gray-700 hover:bg-gray-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{ad.name}</p>
                      <p className="mt-1 truncate text-xs text-gray-500">{ad.sponsorName}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${statusTone(ad.status)}`}>
                      {ad.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>{ad.placements.join(' + ') || 'No placement'}</span>
                    <span>{formatNumber(ad.impressionsCount)} views</span>
                  </div>
                </button>
              ))}
              {ads.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-800 p-8 text-center text-sm text-gray-500">
                  No campaigns yet.
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-800 bg-gray-900/70">
          <div className="border-b border-gray-800 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-white">
                    {editingAd ? editingAd.name : 'New campaign'}
                  </h2>
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${statusTone(draft.status)}`}>
                    {draft.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Set up the campaign, add creative, then activate when it is ready.
                </p>
              </div>
              <div className="flex gap-2">
                {editingAd && (
                  <>
                    {editingAd.status === 'active' ? (
                      <IconButton label="Pause" onClick={() => quickStatus(editingAd, 'paused')} icon={PauseCircle} />
                    ) : (
                      <IconButton label="Activate" onClick={() => quickStatus(editingAd, 'active')} icon={PlayCircle} />
                    )}
                    <IconButton label="Archive" onClick={() => archiveAd(editingAd)} icon={Archive} danger />
                  </>
                )}
                <button
                  onClick={saveAd}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {draft.status === 'draft' ? 'Save draft' : 'Save'}
                </button>
              </div>
            </div>

            <div className="mt-5 inline-flex rounded-lg border border-gray-800 bg-gray-950 p-1">
              {editorSteps.map((step) => (
                <button
                  key={step.key}
                  onClick={() => setEditorStep(step.key)}
                  className={`rounded-md px-4 py-2 text-sm ${
                    editorStep === step.key
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {step.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            {editorStep === 'basics' && (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-5">
                  <CardTitle title="Campaign details" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput label="Campaign name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
                    <TextInput label="Sponsor" value={draft.sponsorName} onChange={(sponsorName) => setDraft({ ...draft, sponsorName })} />
                    <Field label="Status">
                      <select
                        value={draft.status}
                        onChange={(event) => setDraft({ ...draft, status: event.target.value as ManagedAdStatus })}
                        className="input"
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="archived">Archived</option>
                      </select>
                    </Field>
                    <TextInput label="Priority" type="number" value={draft.priority} onChange={(priority) => setDraft({ ...draft, priority })} />
                  </div>

                  <Field label="Where should it appear?">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <PlacementButton
                        active={draft.placements.includes('feed')}
                        title="Feed"
                        description="Inline card between posts"
                        icon={ImageIcon}
                        onClick={() => togglePlacement('feed')}
                      />
                      <PlacementButton
                        active={draft.placements.includes('reels')}
                        title="Reels"
                        description="Full-screen page between reels"
                        icon={Video}
                        onClick={() => togglePlacement('reels')}
                      />
                    </div>
                  </Field>

                  <CardTitle title="CTA and schedule" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput label="CTA text" value={draft.ctaText} onChange={(ctaText) => setDraft({ ...draft, ctaText })} />
                    <Field label="CTA kind">
                      <select
                        value={draft.ctaKind}
                        onChange={(event) => setDraft({ ...draft, ctaKind: event.target.value as ManagedAdCtaKind })}
                        className="input"
                      >
                        <option value="external_url">External URL</option>
                        <option value="vormex_deeplink">Vormex link</option>
                      </select>
                    </Field>
                    <div className="md:col-span-2">
                      <TextInput label="CTA URL" value={draft.ctaUrl} onChange={(ctaUrl) => setDraft({ ...draft, ctaUrl })} />
                    </div>
                    <TextInput label="Starts" type="datetime-local" value={draft.startsAt} onChange={(startsAt) => setDraft({ ...draft, startsAt })} />
                    <TextInput label="Ends" type="datetime-local" value={draft.endsAt} onChange={(endsAt) => setDraft({ ...draft, endsAt })} />
                    <TextInput
                      label="Frequency cap per day"
                      type="number"
                      value={draft.frequencyCapPerDay}
                      onChange={(frequencyCapPerDay) => setDraft({ ...draft, frequencyCapPerDay })}
                    />
                  </div>
                </div>

                <SummaryPanel
                  draft={draft}
                  editingAd={editingAd}
                  analytics={analytics}
                  analyticsLoading={analyticsLoading}
                />
              </div>
            )}

            {editorStep === 'creative' && (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-5">
                  {draft.placements.includes('feed') && (
                    <section className="rounded-lg border border-gray-800 bg-gray-950/50 p-4">
                      <CardTitle title="Feed card" />
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <TextInput label="Feed title" value={draft.feedTitle} onChange={(feedTitle) => setDraft({ ...draft, feedTitle })} />
                        <FileInput label="Feed image" accept="image/*" onChange={(feedImage) => setFiles({ ...files, feedImage })} />
                        <div className="md:col-span-2">
                          <TextArea label="Feed body" value={draft.feedBody} onChange={(feedBody) => setDraft({ ...draft, feedBody })} rows={4} />
                        </div>
                      </div>
                    </section>
                  )}

                  {draft.placements.includes('reels') && (
                    <section className="rounded-lg border border-gray-800 bg-gray-950/50 p-4">
                      <CardTitle title="Reels page" />
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <TextArea label="Caption" value={draft.reelCaption} onChange={(reelCaption) => setDraft({ ...draft, reelCaption })} rows={4} />
                        </div>
                        <FileInput label="Reels video" accept="video/*" onChange={(reelsVideo) => setFiles({ ...files, reelsVideo })} />
                        <FileInput label="Thumbnail" accept="image/*" onChange={(reelsThumbnail) => setFiles({ ...files, reelsThumbnail })} />
                      </div>
                      {draft.status === 'active' && !selectedHasReelsVideo && (
                        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                          Active reels campaigns need a video. Save as draft until the video is uploaded.
                        </p>
                      )}
                    </section>
                  )}

                  {!draft.placements.length && (
                    <div className="rounded-lg border border-dashed border-gray-800 p-10 text-center text-sm text-gray-500">
                      Choose Feed or Reels in Basics to add creative.
                    </div>
                  )}
                </div>

                <PreviewPanel draft={draft} hasFeedImage={selectedHasFeedImage} />
              </div>
            )}

            {editorStep === 'advanced' && (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <section className="rounded-lg border border-gray-800 bg-gray-950/50 p-4">
                  <CardTitle title="Targeting" />
                  <p className="mt-1 text-sm text-gray-500">
                    Leave empty to show this campaign to every eligible authenticated user.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {targetingChips.map((chip) => (
                      <button
                        key={chip.label}
                        onClick={() => insertTargetingChip(chip.key, chip.value)}
                        className="rounded-full border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={draft.targeting}
                    onChange={(event) => setDraft({ ...draft, targeting: event.target.value })}
                    rows={12}
                    spellCheck={false}
                    className="mt-4 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-3 font-mono text-xs text-gray-100 outline-none focus:border-blue-500"
                  />
                </section>

                <section className="rounded-lg border border-gray-800 bg-gray-950/50 p-4">
                  <CardTitle title="Analytics" />
                  {editingAd ? (
                    analyticsLoading ? (
                      <div className="mt-4 flex items-center text-sm text-gray-400">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading
                      </div>
                    ) : analytics ? (
                      <div className="mt-4 space-y-3">
                        <Metric label="Impressions" value={formatNumber(analytics.campaign.impressionsCount)} />
                        <Metric label="Clicks" value={formatNumber(analytics.campaign.clicksCount)} />
                        <div className="space-y-2 pt-2">
                          {analytics.breakdown.map((row) => (
                            <div key={`${row.eventType}-${row.placement}`} className="flex justify-between rounded-lg bg-gray-900 px-3 py-2 text-sm text-gray-300">
                              <span>{row.placement} {row.eventType}</span>
                              <span>{formatNumber(row._count._all)}</span>
                            </div>
                          ))}
                          {analytics.breakdown.length === 0 && <p className="text-sm text-gray-500">No events yet.</p>}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-gray-500">Analytics unavailable.</p>
                    )
                  ) : (
                    <p className="mt-4 text-sm text-gray-500">Save the campaign to see analytics.</p>
                  )}
                </section>
              </div>
            )}
          </div>
        </section>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(55 65 81);
          background: rgb(3 7 18);
          padding: 0.5rem 0.75rem;
          color: white;
          font-size: 0.875rem;
          outline: none;
        }

        .input:focus {
          border-color: rgb(59 130 246);
        }
      `}</style>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-gray-800 bg-gray-900 px-3 py-1">
      <span className="text-gray-500">{label}</span>
      <span className="ml-2 font-semibold text-gray-200">{value}</span>
    </span>
  );
}

function SummaryPanel({
  draft,
  editingAd,
  analytics,
  analyticsLoading,
}: {
  draft: AdDraft;
  editingAd: ManagedAdCampaign | null;
  analytics: ManagedAdAnalytics | null;
  analyticsLoading: boolean;
}) {
  return (
    <aside className="rounded-lg border border-gray-800 bg-gray-950/50 p-4">
      <CardTitle title="At a glance" />
      <div className="mt-4 space-y-4">
        <Metric label="Status" value={draft.status} />
        <Metric label="Placements" value={draft.placements.join(' + ') || 'None'} />
        <Metric label="Priority" value={draft.priority || '0'} />
        <Metric label="Daily cap" value={draft.frequencyCapPerDay || '3'} />
        {editingAd && (
          <>
            <div className="border-t border-gray-800 pt-4" />
            {analyticsLoading ? (
              <div className="flex items-center text-sm text-gray-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading stats
              </div>
            ) : (
              <>
                <Metric label="Impressions" value={formatNumber(analytics?.campaign.impressionsCount || editingAd.impressionsCount)} />
                <Metric label="Clicks" value={formatNumber(analytics?.campaign.clicksCount || editingAd.clicksCount)} />
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function PreviewPanel({ draft, hasFeedImage }: { draft: AdDraft; hasFeedImage: boolean }) {
  return (
    <aside className="rounded-lg border border-gray-800 bg-gray-950/50 p-4">
      <CardTitle title="Preview" />
      <div className="mt-4 rounded-lg border border-gray-800 bg-gray-900 p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">
          Sponsored by {draft.sponsorName || 'Sponsor'}
        </p>
        {draft.placements.includes('feed') && (
          <>
            <div className="mt-3 flex h-28 items-center justify-center rounded-lg bg-gray-800 text-xs text-gray-500">
              {hasFeedImage ? 'Feed image selected' : 'Feed image'}
            </div>
            <h3 className="mt-3 text-lg font-semibold text-white">{draft.feedTitle || draft.name || 'Feed title'}</h3>
            <p className="mt-1 text-sm text-gray-400">{draft.feedBody || 'Feed body preview appears here.'}</p>
          </>
        )}
        {draft.placements.includes('reels') && (
          <div className="mt-3 rounded-lg bg-black p-4">
            <div className="flex h-52 items-end rounded-lg border border-gray-800 bg-gray-900 p-3">
              <div>
                <p className="text-xs text-gray-400">{draft.sponsorName || 'Sponsor'}</p>
                <p className="mt-1 text-lg font-semibold text-white">{draft.reelCaption || 'Reels caption'}</p>
              </div>
            </div>
          </div>
        )}
        <button className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
          {draft.ctaText || 'Learn more'}
        </button>
      </div>
    </aside>
  );
}

function PlacementButton({
  active,
  title,
  description,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition ${
        active ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800 bg-gray-950/50 hover:border-gray-700'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={active ? 'h-5 w-5 text-blue-300' : 'h-5 w-5 text-gray-500'} />
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
      </div>
    </button>
  );
}

function CardTitle({ title }: { title: string }) {
  return <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">{title}</h3>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  icon: Icon,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  icon: ComponentType<{ className?: string }>;
  danger?: boolean;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`rounded-lg border p-2 ${
        danger
          ? 'border-rose-500/30 text-rose-300 hover:bg-rose-500/10'
          : 'border-gray-700 text-gray-300 hover:bg-gray-800'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-gray-400">{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <Field label={label}>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input"
      />
    </Field>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <Field label={label}>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="input"
      />
    </Field>
  );
}

function FileInput({
  label,
  accept,
  onChange,
}: {
  label: string;
  accept: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="file"
        accept={accept}
        onChange={(event) => onChange(event.target.files?.[0] || null)}
        className="w-full rounded-lg border border-dashed border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-gray-800 file:px-3 file:py-1.5 file:text-sm file:text-gray-100"
      />
    </Field>
  );
}
