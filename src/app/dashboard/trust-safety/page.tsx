'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  getReports,
  takeReportAction,
  type AdminReport,
  type ReportActionTaken,
} from '@/lib/api/admin';
import { formatRelativeTime } from '@/lib/utils';

const REPORT_ACTIONS: Array<{ value: ReportActionTaken; label: string }> = [
  { value: 'MARK_UNDER_REVIEW', label: 'Under review' },
  { value: 'USER_WARNED', label: 'Warn user' },
  { value: 'CONTENT_REMOVED', label: 'Remove content' },
  { value: 'USER_RESTRICTED', label: 'Restrict user' },
  { value: 'USER_SUSPENDED', label: 'Suspend user' },
  { value: 'USER_BANNED', label: 'Ban user' },
  { value: 'NO_VIOLATION', label: 'No violation' },
  { value: 'DISMISSED_INVALID', label: 'Dismiss' },
];

function getErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { error?: string } } })?.response?.data;
  if (data?.error) return data.error;
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

function statusTone(status: string): string {
  if (status === 'RESOLVED') return 'bg-emerald-500/10 text-emerald-300';
  if (status === 'DISMISSED') return 'bg-red-500/10 text-red-300';
  if (status === 'UNDER_REVIEW') return 'bg-blue-500/10 text-blue-300';
  return 'bg-amber-500/10 text-amber-300';
}

export default function TrustSafetyPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getReports({ status: 'all', limit: 20, sortBy: 'createdAt', sortOrder: 'desc' });
      setReports(response.reports);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const applyReportAction = async (report: AdminReport, action: ReportActionTaken) => {
    const notes = window.prompt('Admin notes');
    if (!notes && !['MARK_UNDER_REVIEW', 'NONE'].includes(action)) return;
    let reason: string | undefined;
    if (['USER_WARNED', 'USER_RESTRICTED', 'USER_SUSPENDED', 'USER_BANNED'].includes(action)) {
      reason = window.prompt('User action reason') || undefined;
      if (!reason) return;
    }
    setBusyId(report.id);
    try {
      await takeReportAction(report.id, action, notes || undefined, reason, { reason });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 text-gray-100">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            Trust & Safety
          </h1>
          <p className="mt-1 text-sm text-gray-400">Report triage and user safety actions.</p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/10 p-2 text-red-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Recent reports</p>
              <p className="text-2xl font-bold text-white">{reports.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Mode</p>
              <p className="text-2xl font-bold text-white">Manual</p>
            </div>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/70">
        <div className="border-b border-gray-800 px-4 py-3">
          <h2 className="font-semibold text-white">Recent Reports</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {loading && reports.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-gray-400">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-gray-400">No recent reports.</div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="grid gap-3 px-4 py-4 hover:bg-gray-800/40 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">{report.reportType}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(report.status)}`}>
                      {report.status.replace('_', ' ')}
                    </span>
                    {report.blockedUserAfterReport && (
                      <span className="rounded-full bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-300">
                        blocked
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-300">{report.reason}</p>
                  {report.description && <p className="mt-1 text-xs text-gray-500">{report.description}</p>}
                  <p className="mt-2 text-xs text-gray-500">
                    Reporter: {report.reporter?.name || report.reporter?.email || report.reporter?.id}
                    {report.reportedUser ? ` - Reported: ${report.reportedUser.name || report.reportedUser.email || report.reportedUser.id}` : ''}
                    {` - ${formatRelativeTime(report.createdAt)}`}
                  </p>
                  {report.evidenceSnapshot && (
                    <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-gray-800 bg-black/40 p-3 text-xs text-gray-100">
                      {JSON.stringify(report.evidenceSnapshot, null, 2)}
                    </pre>
                  )}
                </div>
                <div className="flex items-start gap-2">
                  <select
                    disabled={busyId === report.id}
                    defaultValue=""
                    onChange={(event) => {
                      const action = event.target.value as ReportActionTaken;
                      event.currentTarget.value = '';
                      if (action) applyReportAction(report, action);
                    }}
                    className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="" disabled>
                      Action
                    </option>
                    {REPORT_ACTIONS.map((action) => (
                      <option key={action.value} value={action.value}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
