import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  arrayUnion,
  increment,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  runTransaction,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { writeAuditLog } from './audit';
import type { ChildProfile, ProfileStatus } from '@/types';

function childrenRef(stateId: string) {
  return collection(db, 'states', stateId, 'children');
}

export async function getChild(stateId: string, childId: string): Promise<ChildProfile | null> {
  const snap = await getDoc(doc(db, 'states', stateId, 'children', childId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ChildProfile;
}

export async function listChildren(stateId: string): Promise<ChildProfile[]> {
  const snap = await getDocs(childrenRef(stateId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChildProfile);
}

export async function listPublishedChildren(stateId: string): Promise<ChildProfile[]> {
  const q = query(childrenRef(stateId), where('status', '==', 'published'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChildProfile);
}

export async function createChild(
  stateId: string,
  data: Omit<ChildProfile, 'id' | 'stateId' | 'createdAt' | 'lastUpdatedAt' | 'viewCount' | 'saveCount' | 'inquiryCount'>,
  createdBy: string
): Promise<string> {
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
  const ref = await addDoc(childrenRef(stateId), {
    ...clean,
    stateId,
    createdBy,
    viewCount: 0,
    saveCount: 0,
    inquiryCount: 0,
    createdAt: serverTimestamp(),
    lastUpdatedAt: serverTimestamp(),
  });
  await writeAuditLog({
    stateId,
    eventType: 'profile_status_change',
    targetId: ref.id,
    targetType: 'child',
    performedBy: createdBy,
    details: { action: 'created', status: data.status },
  });
  return ref.id;
}

export async function updateChild(
  stateId: string,
  childId: string,
  data: Partial<Omit<ChildProfile, 'id' | 'stateId' | 'createdAt' | 'createdBy'>>,
  updatedBy: string
): Promise<void> {
  await updateDoc(doc(db, 'states', stateId, 'children', childId), {
    ...data,
    lastUpdatedAt: serverTimestamp(),
  });
  if (data.status) {
    await writeAuditLog({
      stateId,
      eventType: 'profile_status_change',
      targetId: childId,
      targetType: 'child',
      performedBy: updatedBy,
      details: { status: data.status },
    });
  }
}

// ── Real-time subscriptions ───────────────────────────────────────────────────

export function subscribeToChildren(
  stateId: string,
  onChange: (children: ChildProfile[]) => void,
  onError: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    childrenRef(stateId),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChildProfile)),
    onError
  );
}

export function subscribeToPublishedChildren(
  stateId: string,
  onChange: (children: ChildProfile[]) => void,
  onError: (e: Error) => void
): Unsubscribe {
  const q = query(childrenRef(stateId), where('status', '==', 'published'));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChildProfile)),
    onError
  );
}

export function subscribeToChild(
  stateId: string,
  childId: string,
  onChange: (child: ChildProfile | null) => void,
  onError: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'states', stateId, 'children', childId),
    (snap) => onChange(snap.exists() ? ({ id: snap.id, ...snap.data() } as ChildProfile) : null),
    onError
  );
}

// Safe photo append — uses arrayUnion so concurrent uploads can't overwrite each other
export async function addPhotoUrl(
  stateId: string,
  childId: string,
  url: string,
  updatedBy: string
): Promise<void> {
  await updateDoc(doc(db, 'states', stateId, 'children', childId), {
    photoUrls: arrayUnion(url),
    lastUpdatedAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────

export async function recordProfileView(stateId: string, childId: string): Promise<void> {
  await updateDoc(doc(db, 'states', stateId, 'children', childId), {
    viewCount: increment(1),
  });
}

export async function publishProfile(
  childId: string,
  stateId: string,
  publishedBy: string
): Promise<void> {
  const childRef = doc(db, 'states', stateId, 'children', childId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(childRef);
    if (!snap.exists()) throw new Error('Child profile not found');

    const profile = snap.data() as Omit<ChildProfile, 'id'>;

    if (profile.consentStatus !== 'active') {
      throw new Error('Cannot publish: active consent required');
    }

    tx.update(childRef, {
      status: 'published' as ProfileStatus,
      publishedAt: serverTimestamp(),
      lastUpdatedAt: serverTimestamp(),
    });
  });

  await writeAuditLog({
    stateId,
    eventType: 'profile_status_change',
    targetId: childId,
    targetType: 'child',
    performedBy: publishedBy,
    details: { status: 'published' },
  });
}
