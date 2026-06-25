'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import {
  approveIdentityReview,
  getIdentityReviewEvidenceBlob,
  getIdentityReviews,
  rejectIdentityReview,
  type IdentityReview,
  type IdentityVerificationStatus,
} from '@/lib/api/admin';
import { formatRelativeTime } from '@/lib/utils';

const STATUS_OPTIONS: Array<IdentityVerificationStatus | 'all'> = [
  'all',
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'EXPIRED',
];

function getErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { error?: string } } })?.response?.data;
  if (data?.error) return data.error;
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

function statusTone(status: string): string {
  if (status === 'VERIFIED') return 'bg-emerald-500/10 text-emerald-300';
  if (status === 'REJECTED') return 'bg-red-500/10 text-red-300';
  if (status === 'EXPIRED') return 'bg-gray-500/10 text-gray-300';
  return 'bg-amber-500/10 text-amber-300';
}

export default function StudentVerificationPage() {
  const [reviews, setReviews] = useState<IdentityReview[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [status, setStatus] = useState<IdentityVerificationStatus | 'all'>('PENDING');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [proofLoadingId, setProofLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<{
    review: IdentityReview;
    url: string;
    mimeType: string | null;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getIdentityReviews({ status, type: 'ID_DOCUMENT', limit: 100 });
      const term = search.trim().toLowerCase();
      const filtered = term
        ? response.reviews.filter((review) => {
            const user = review.user;
            return [
              user?.name,
              user?.email,
              user?.username,
              review.evidence.fileName,
              review.rejectionReason,
            ].some((value) => value?.toLowerCase().includes(term));
          })
        : response.reviews;
      setReviews(filtered);
      setPendingCount(response.pendingCount);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (proofPreview?.url) URL.revokeObjectURL(proofPreview.url);
    };
  }, [proofPreview?.url]);

  const openProof = async (review: IdentityReview) => {
    setProofLoadingId(review.id);
    setError(null);
    try {
      const blob = await getIdentityReviewEvidenceBlob(review.id);
      if (proofPreview?.url) URL.revokeObjectURL(proofPreview.url);
      setProofPreview({
        review,
        url: URL.createObjectURL(blob),
        mimeType: blob.type || review.evidence.mimeType,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setProofLoadingId(null);
    }
  };

  const closeProof = () => {
    if (proofPreview?.url) URL.revokeObjectURL(proofPreview.url);
    setProofPreview(null);
  };

  const approveReview = async (review: IdentityReview) => {
    const notes = window.prompt('Approval notes', 'Verified by Vormex Trust & Safety');
    if (notes === null) return;
    setBusyId(review.id);
    try {
      await approveIdentityReview(review.id, notes);
      await load();
      closeProof();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const requestResubmit = async (review: IdentityReview) => {
    const reason = window.prompt(
      'Comment shown to the student',
      'Please retake a clearer photo of your current student ID or college proof.'
    );
    if (!reason) return;
    setBusyId(review.id);
    try {
      await rejectIdentityReview(review.id, { rejectionReason: reason, reviewNotes: reason });
      await load();
      closeProof();
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
            <ShieldCheck className="h-6 w-6 text-blue-500" />
            Student Verification
          </h1>
          <p className="mt-1 text-sm text-gray-400">Review student proof uploads and request clean resubmissions.</p>
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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
          <p className="text-sm text-gray-400">Pending requests</p>
          <p className="mt-2 text-3xl font-bold text-white">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
          <p className="text-sm text-gray-400">Visible rows</p>
          <p className="mt-2 text-3xl font-bold text-white">{reviews.length}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
          <p className="text-sm text-gray-400">Evidence policy</p>
          <p className="mt-2 text-sm font-semibold text-emerald-300">Encrypted, deleted after decision</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-gray-800 bg-gray-900/70 p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, username, file, or comment"
            className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2 pl-9 pr-3 text-sm text-gray-100 outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as IdentityVerificationStatus | 'all')}
          className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500"
        >
          {STATUS_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item === 'all' ? 'All statuses' : item}
            </option>
          ))}
        </select>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/70">
        <div className="border-b border-gray-800 px-4 py-3">
          <h2 className="font-semibold text-white">Requests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-950/70">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400">Student</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400">Proof</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400">Submitted</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading && reviews.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Loading requests
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    No student verification requests found.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white">{review.user?.name || 'Unknown student'}</div>
                      <div className="text-xs text-gray-500">{review.user?.email || review.userId}</div>
                      {review.user?.username && <div className="text-xs text-gray-600">@{review.user.username}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span>{review.evidence.fileName || 'Proof uploaded'}</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {review.evidence.mimeType || 'unknown type'}
                        {review.evidence.size ? ` - ${(review.evidence.size / 1024).toFixed(1)} KB` : ''}
                      </div>
                      {review.rejectionReason && (
                        <p className="mt-2 max-w-md text-xs text-red-300">{review.rejectionReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(review.status)}`}>
                        {review.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{formatRelativeTime(review.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={!review.evidence.hasFile || proofLoadingId === review.id}
                          onClick={() => openProof(review)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-800 disabled:opacity-40"
                        >
                          {proofLoadingId === review.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                          View proof
                        </button>
                        <button
                          type="button"
                          disabled={busyId === review.id || review.status !== 'PENDING'}
                          onClick={() => approveReview(review)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busyId === review.id || review.status !== 'PENDING'}
                          onClick={() => requestResubmit(review)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-40"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Request resubmit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {proofPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-950">
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <div>
                <h3 className="font-semibold text-white">Uploaded proof</h3>
                <p className="text-xs text-gray-500">{proofPreview.review.evidence.fileName || proofPreview.review.id}</p>
              </div>
              <button
                type="button"
                onClick={closeProof}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-black p-4">
              {proofPreview.mimeType?.startsWith('image/') ? (
                <img src={proofPreview.url} alt="Student proof" className="mx-auto max-h-[72vh] max-w-full object-contain" />
              ) : proofPreview.mimeType === 'application/pdf' ? (
                <iframe src={proofPreview.url} title="Student proof PDF" className="h-[72vh] w-full rounded-lg bg-white" />
              ) : (
                <div className="text-center text-sm text-gray-300">
                  Preview is not available for this file type.
                  <a href={proofPreview.url} target="_blank" rel="noreferrer" className="ml-2 text-blue-300 underline">
                    Open file
                  </a>
                </div>
              )}
            </div>
            {proofPreview.review.status === 'PENDING' && (
              <div className="flex flex-wrap justify-end gap-2 border-t border-gray-800 px-4 py-3">
                <button
                  type="button"
                  onClick={() => requestResubmit(proofPreview.review)}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
                >
                  <XCircle className="h-4 w-4" />
                  Request resubmit
                </button>
                <button
                  type="button"
                  onClick={() => approveReview(proofPreview.review)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
