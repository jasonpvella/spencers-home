import { useState, useEffect, useMemo } from 'react';
import { useCurrentUser } from '@/hooks/useAuth';
import { useInquiries } from '@/hooks/useInquiries';
import { updateInquiryStatus } from '@/services/inquiries';
import { listUsersByState } from '@/services/users';
import { useToast } from '@/components/shared/Toaster';
import { REPLY_STATUS_LABELS } from '@/types';
import type { Inquiry, ReplyStatus, User } from '@/types';
function timeAgo(inquiry: Inquiry): string {
  if (!inquiry.submittedAt) return '—';
  const date = inquiry.submittedAt.toDate?.() ?? new Date(inquiry.submittedAt as unknown as string);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}


export default function InquiriesPage() {
  const user = useCurrentUser();
  const stateId = user?.stateId ?? '';
  const role = user?.role ?? '';
  const userId = user?.id ?? '';

  const { inquiries, loading, error } = useInquiries(stateId, role, userId);
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!stateId) return;
    listUsersByState(stateId).then(setUsers).catch(() => undefined);
  }, [stateId]);

  const userMap = useMemo(() => {
    const m: Record<string, User> = {};
    users.forEach((u) => { m[u.id] = u; });
    return m;
  }, [users]);

  const repeatEmails = useMemo(() => {
    const counts: Record<string, number> = {};
    inquiries.forEach((inq) => {
      counts[inq.email] = (counts[inq.email] ?? 0) + 1;
    });
    return new Set(Object.keys(counts).filter((e) => counts[e] > 1));
  }, [inquiries]);

  async function handleStatusChange(inquiry: Inquiry, replyStatus: ReplyStatus) {
    setSavingId(inquiry.id);
    try {
      await updateInquiryStatus(stateId, inquiry.id, replyStatus);
      toast({ type: 'success', message: 'Status updated.' });
    } catch {
      toast({ type: 'error', message: 'Failed to update status.' });
    } finally {
      setSavingId(null);
    }
  }

  async function handleNotesSave(inquiry: Inquiry) {
    if (editingId !== inquiry.id) return;
    setSavingId(inquiry.id);
    try {
      await updateInquiryStatus(stateId, inquiry.id, inquiry.replyStatus, notesDraft);
      setEditingId(null);
      toast({ type: 'success', message: 'Note saved.' });
    } catch {
      toast({ type: 'error', message: 'Failed to save note.' });
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-gray-400">Loading inquiries…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-sm text-red-500">Failed to load inquiries. Please refresh.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Inquiries</h1>

      {inquiries.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No inquiries yet.
        </div>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inq) => {
            const caseworker = userMap[inq.caseworkerId];
            const isRepeat = repeatEmails.has(inq.email);
            const isEditing = editingId === inq.id;
            const isSaving = savingId === inq.id;

            return (
              <div key={inq.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{inq.childFirstName}</span>
                    <span className="text-gray-400 text-sm">·</span>
                    <span className="text-sm text-gray-600">{inq.name}</span>
                    {isRepeat && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        Repeat inquirer
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{timeAgo(inq)}</span>
                </div>

                <div className="text-sm text-gray-600 mb-3 space-y-0.5">
                  <p>
                    <span className="text-gray-400">Email: </span>
                    <a href={`mailto:${inq.email}`} className="text-blue-600 hover:underline">
                      {inq.email}
                    </a>
                  </p>
                  {inq.phone && (
                    <p>
                      <span className="text-gray-400">Phone: </span>{inq.phone}
                    </p>
                  )}
                  {caseworker && (
                    <p>
                      <span className="text-gray-400">Caseworker: </span>
                      {caseworker.displayName}
                      {caseworker.email && (
                        <> · <a href={`mailto:${caseworker.email}`} className="text-blue-600 hover:underline">{caseworker.email}</a></>
                      )}
                    </p>
                  )}
                </div>

                {inq.message && (
                  <p className="text-sm text-gray-700 bg-gray-50 rounded p-3 mb-3 whitespace-pre-wrap">
                    {inq.message}
                  </p>
                )}

                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={inq.replyStatus}
                      disabled={isSaving}
                      onChange={(e) => handleStatusChange(inq, e.target.value as ReplyStatus)}
                      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {(Object.keys(REPLY_STATUS_LABELS) as ReplyStatus[]).map((s) => (
                        <option key={s} value={s}>{REPLY_STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          placeholder="Add a note…"
                          className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          onKeyDown={(e) => { if (e.key === 'Enter') handleNotesSave(inq); if (e.key === 'Escape') setEditingId(null); }}
                        />
                        <button
                          onClick={() => handleNotesSave(inq)}
                          disabled={isSaving}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(inq.id); setNotesDraft(inq.notes ?? ''); }}
                        className="text-xs text-gray-400 hover:text-blue-600"
                      >
                        {inq.notes ? `Note: ${inq.notes}` : '+ Add note'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
