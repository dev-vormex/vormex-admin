'use client';

import type { ElementType } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Database,
  HardDrive,
  MessageSquare,
  RefreshCw,
  Trash2,
  Users2,
} from 'lucide-react';
import {
  clearAllChats,
  getChatStorageSummary,
  type ChatStorageSummary,
  type ClearChatStorageResponse,
} from '@/lib/api/admin';

const fallbackConfirmationText = 'CLEAR ALL CHATS';

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, unitIndex);
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function StatCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  icon: ElementType;
  tone: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${tone}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function MaintenancePage() {
  const [summary, setSummary] = useState<ChatStorageSummary | null>(null);
  const [confirmationText, setConfirmationText] = useState(fallbackConfirmationText);
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClearChatStorageResponse | null>(null);

  const totalMessages = useMemo(() => {
    if (!summary) return 0;
    return summary.directMessages + summary.groupMessages;
  }, [summary]);
  const detailRows = useMemo<Array<[string, number]>>(() => [
    ['Direct messages', summary?.directMessages || 0],
    ['Group messages', summary?.groupMessages || 0],
    ['Direct reactions', summary?.directReactions || 0],
    ['Group reactions', summary?.groupReactions || 0],
    ['Message notifications', summary?.messageNotifications || 0],
    ['Detached chat reports', summary?.moderationChatReports || 0],
    ['Messages with media links', summary?.mediaMessages || 0],
    ['Chat upload files', summary?.chatUploadFiles || 0],
  ], [summary]);

  const canClear = typedConfirmation.trim() === confirmationText && !clearing && !!summary;

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getChatStorageSummary();
      setSummary(response.summary);
      setConfirmationText(response.confirmationText || fallbackConfirmationText);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load chat storage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  const handleClear = async () => {
    if (!canClear) return;
    const confirmed = window.confirm(
      'Clear every direct chat, group chat, chat upload, and message notification? This cannot be undone.'
    );
    if (!confirmed) return;

    setClearing(true);
    setError(null);
    setResult(null);
    try {
      const response = await clearAllChats(typedConfirmation.trim());
      setResult(response);
      setTypedConfirmation('');
      await loadSummary();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to clear chats.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-gray-500 mt-1">
            Clear direct chats, group chats, reactions, message notifications, and chat uploads.
          </p>
        </div>
        <button
          onClick={loadSummary}
          disabled={loading || clearing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {result.message}. Removed {result.deleted.directMessages.toLocaleString()} direct messages,
          {' '}{result.deleted.groupMessages.toLocaleString()} group messages, and
          {' '}{result.media.deleted.toLocaleString()} chat upload files.
        </div>
      )}

      {loading && !summary ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Messages"
              value={totalMessages.toLocaleString()}
              icon={MessageSquare}
              tone="bg-blue-600"
            />
            <StatCard
              title="Conversations"
              value={(summary?.conversations || 0).toLocaleString()}
              icon={Users2}
              tone="bg-cyan-600"
            />
            <StatCard
              title="Chat Uploads"
              value={(summary?.chatUploadFiles || 0).toLocaleString()}
              icon={HardDrive}
              tone="bg-emerald-600"
            />
            <StatCard
              title="Upload Storage"
              value={formatBytes(summary?.chatUploadBytes || 0)}
              icon={Database}
              tone="bg-indigo-600"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Chat Data To Remove</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {detailRows.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm text-gray-600">{label}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {Number(value).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Clear All Chats</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    This permanently removes direct chats, group messages, reactions, chat upload files, and message notifications.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-lg bg-amber-50 border border-amber-200 p-4">
                <div className="flex gap-3">
                  <Bell className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    Connected devices will receive a clear signal and drop cached chat lists where supported.
                  </p>
                </div>
              </div>

              <label className="block mt-5">
                <span className="text-sm font-medium text-gray-700">
                  Type {confirmationText}
                </span>
                <input
                  value={typedConfirmation}
                  onChange={(event) => setTypedConfirmation(event.target.value)}
                  placeholder={confirmationText}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-red-500 focus:ring-2 focus:ring-red-500"
                />
              </label>

              <button
                onClick={handleClear}
                disabled={!canClear}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {clearing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {clearing ? 'Clearing Chats...' : 'Clear All Chats'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
