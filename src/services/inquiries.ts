import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  updateDoc,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Inquiry, ReplyStatus, UserRole } from '@/types';

// ─── Reads (flat collection) ────────────────────────────────────────────────

/** One-shot fetch — all inquiries for a single child (ProfileDetailPage). */
export async function getInquiriesForChild(stateId: string, childId: string): Promise<Inquiry[]> {
  const q = query(
    collection(db, 'states', stateId, 'inquiries'),
    where('childId', '==', childId),
    orderBy('submittedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Inquiry);
}

/**
 * Real-time listener — inquiries visible to the current user.
 * Caseworkers: scoped to their own childIds via caseworkerId.
 * Supervisors / admins: all inquiries in the state.
 */
export function subscribeToInquiries(
  stateId: string,
  role: UserRole,
  userId: string,
  callback: (inquiries: Inquiry[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const baseRef = collection(db, 'states', stateId, 'inquiries');

  const q =
    role === 'caseworker'
      ? query(baseRef, where('caseworkerId', '==', userId), orderBy('submittedAt', 'asc'))
      : query(baseRef, orderBy('submittedAt', 'asc'));

  return onSnapshot(
    q,
    (snap) => { callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Inquiry)); },
    (error) => { onError?.(error); }
  );
}

/**
 * Real-time pending count — drives the nav badge.
 * Silent on error: badge shows 0 rather than crashing the shell.
 */
export function subscribeToPendingCount(
  stateId: string,
  role: UserRole,
  userId: string,
  callback: (count: number) => void
): Unsubscribe {
  const baseRef = collection(db, 'states', stateId, 'inquiries');

  const q =
    role === 'caseworker'
      ? query(baseRef, where('caseworkerId', '==', userId), where('replyStatus', '==', 'pending'))
      : query(baseRef, where('replyStatus', '==', 'pending'));

  return onSnapshot(q, (snap) => { callback(snap.size); }, () => { /* badge stays at 0 on error */ });
}

// ─── Writes (staff only) ────────────────────────────────────────────────────

export async function updateInquiryStatus(
  stateId: string,
  inquiryId: string,
  replyStatus: ReplyStatus,
  notes?: string
): Promise<void> {
  const ref = doc(db, 'states', stateId, 'inquiries', inquiryId);
  const update: Record<string, unknown> = { replyStatus };
  if (notes !== undefined) update.notes = notes;
  await updateDoc(ref, update);
}
