'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getReportById,
  getReports,
  getReportStats,
  takeReportAction,
  updateReportStatus,
  type AdminReport,
  type ReportActionTaken,
  type ReportStatus,
} from '@/lib/api/admin';
import { formatRelativeTime } from '@/lib/utils';
import { Eye, Flag, RefreshCw, Search } from 'lucide-react';

const STATUS_OPTIONS: (ReportStatus | 'all')[] = [
  'all',
  'PENDING',
  'UNDER_REVIEW',
  'RESOLVED',
  'DISMISSED',
];

const ACTION_OPTIONS: Array<{ value: ReportActionTaken; label: string }> = [
  { value: 'MARK_UNDER_REVIEW', label: 'Under review' },
  { value: 'USER_WARNED', label: 'Warn' },
  { value: 'CONTENT_REMOVED', label: 'Remove content' },
  { value: 'USER_RESTRICTED', label: 'Restrict' },
  { value: 'USER_SUSPENDED', label: 'Suspend' },
  { value: 'USER_BANNED', label: 'Ban' },
  { value: 'NO_VIOLATION', label: 'No violation' },
  { value: 'DISMISSED_INVALID', label: 'Dismiss' },
];

export default function ReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, underReview: 0, resolved: 0 });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, s] = await Promise.all([
        getReports({
          page,
          limit: 20,
          status: statusFilter,
          search: debouncedSearch || undefined,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }),
        getReportStats(),
      ]);
      setReports(res.reports);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
      setStats(s);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (id: string, status: ReportStatus) => {
    setUpdatingId(id);
    try {
      await updateReportStatus(id, status);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const loadReportDetail = async (id: string) => {
    setUpdatingId(id);
    try {
      const response = await getReportById(id);
      setSelectedReport(response.report);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReportAction = async (report: AdminReport, action: ReportActionTaken) => {
    const adminNotes = window.prompt('Admin notes');
    if (!adminNotes && !['MARK_UNDER_REVIEW', 'NONE'].includes(action)) return;
    let reason: string | undefined;
    if (['USER_WARNED', 'USER_RESTRICTED', 'USER_SUSPENDED', 'USER_BANNED'].includes(action)) {
      reason = window.prompt('User action reason') || undefined;
      if (!reason) return;
    }
    setUpdatingId(report.id);
    try {
      const response = await takeReportAction(report.id, action, adminNotes || undefined, reason, { reason });
      setSelectedReport(response.report);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 text-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-gray-400 mt-1">
            User reports from chat, posts, and profiles ({total.toLocaleString()} total)
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
          <p className="text-sm text-gray-400">Total</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
          <p className="text-sm text-gray-400">Pending</p>
          <p className="text-2xl font-bold text-amber-300">{stats.pending}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
          <p className="text-sm text-gray-400">Under review</p>
          <p className="text-2xl font-bold text-blue-300">{stats.underReview}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
          <p className="text-sm text-gray-400">Resolved</p>
          <p className="text-2xl font-bold text-emerald-300">{stats.resolved}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search reason, description, reporter…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2 pl-10 pr-4 text-sm text-gray-100 outline-none placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ReportStatus | 'all');
              setPage(1);
            }}
            className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All statuses' : s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/70 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-950/70">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400">
                  Reason
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400">
                  Reporter
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400">
                  When
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading && reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <Flag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No reports match your filters.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm font-medium text-white">{r.reportType}</td>
                    <td className="max-w-xs px-4 py-3 text-sm text-gray-200">
                      <div className="truncate" title={r.reason}>
                        {r.reason}
                      </div>
                      {r.description && (
                        <div className="truncate text-xs text-gray-500" title={r.description}>
                          {r.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {r.reporter?.name || r.reporter?.username || r.reporter?.id || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={r.status}
                        disabled={updatingId === r.id}
                        onChange={(e) => handleStatusChange(r.id, e.target.value as ReportStatus)}
                        className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-sm text-gray-100 outline-none focus:border-blue-500 disabled:opacity-50"
                      >
                        {(['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'] as const).map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-400">
                      {formatRelativeTime(r.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => loadReportDetail(r.id)}
                          className="rounded-lg border border-gray-700 p-2 text-gray-300 hover:bg-gray-800"
                          aria-label="Open report"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <select
                          defaultValue=""
                          disabled={updatingId === r.id}
                          onChange={(e) => {
                            const action = e.target.value as ReportActionTaken;
                            e.currentTarget.value = '';
                            if (action) handleReportAction(r, action);
                          }}
                          className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-sm text-gray-100 outline-none focus:border-blue-500 disabled:opacity-50"
                        >
                          <option value="" disabled>
                            Action
                          </option>
                          {ACTION_OPTIONS.map((action) => (
                            <option key={action.value} value={action.value}>
                              {action.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-800 px-4 py-3">
            <p className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-gray-700 px-3 py-1 text-sm text-gray-200 hover:bg-gray-800 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-gray-700 px-3 py-1 text-sm text-gray-200 hover:bg-gray-800 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedReport && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {selectedReport.reportType} report
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                {selectedReport.reason} - {selectedReport.status.replace(/_/g, ' ')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedReport(null)}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-800"
            >
              Close
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
              <p className="text-xs text-gray-400">Reporter prior reports</p>
              <p className="text-xl font-semibold text-white">{selectedReport.reporterPriorReports ?? 0}</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
              <p className="text-xs text-gray-400">Reported user prior reports</p>
              <p className="text-xl font-semibold text-white">{selectedReport.reportedUserPriorReports ?? 0}</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
              <p className="text-xs text-gray-400">Report and block</p>
              <p className="text-xl font-semibold text-white">{selectedReport.blockedUserAfterReport ? 'Yes' : 'No'}</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
              <p className="text-xs text-gray-400">Linked device scope</p>
              <p className="text-xl font-semibold text-white">
                {selectedReport.deviceScopedBlock ? `${selectedReport.deviceLinkedAccountCount ?? 0} accounts` : 'None'}
              </p>
            </div>
          </div>
          {selectedReport.evidenceSnapshot && (
            <pre className="mt-4 max-h-80 overflow-auto rounded-lg border border-gray-800 bg-black/40 p-4 text-xs text-gray-100">
              {JSON.stringify(selectedReport.evidenceSnapshot, null, 2)}
            </pre>
          )}
        </div>
      )}

      <p className="px-1 text-xs text-gray-500">
        Admin API:{' '}
        <code className="rounded border border-gray-800 bg-gray-900 px-1 text-gray-300">
          {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}
        </code>
        — must match the same backend URL your mobile app uses (so reports land in this database).
        If the admin site is on another domain (e.g. Vercel), set{' '}
        <code className="rounded border border-gray-800 bg-gray-900 px-1 text-gray-300">CORS_EXTRA_ORIGINS</code> on the API server to that admin URL.
      </p>
    </div>
  );
}
