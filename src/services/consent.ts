import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  runTransaction,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { writeAuditLog } from './audit';
import type { ConsentRecord, ConsentAuthority } from '@/types';

function consentsRef(stateId: string) {
  return collection(db, 'states', stateId, 'consents');
}

export async function getConsent(stateId: string, consentId: string): Promise<ConsentRecord | null> {
  const snap = await getDoc(doc(db, 'states', stateId, 'consents', consentId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ConsentRecord;
}

export async function createConsent(params: {
  stateId: string;
  childId: string;
  signedBy: string;
  signerRole: ConsentAuthority;
  expiryDays: number;
  formData: Record<string, unknown>;
  youthAssentObtained?: boolean;
  icwaTribalNotified?: boolean;
}): Promise<string> {
  const {
    stateId,
    childId,
    signedBy,
    signerRole,
    expiryDays,
    formData,
    youthAssentObtained,
    icwaTribalNotified,
  } = params;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

  const childRef = doc(db, 'states', stateId, 'children', childId);
  let consentId = '';

  await runTransaction(db, async (tx) => {
    const childSnap = await tx.get(childRef);
    if (!childSnap.exists()) throw new Error('Child profile not found');

    const consentRef = doc(consentsRef(stateId));
    consentId = consentRef.id;

    tx.set(consentRef, {
      stateId,
      childId,
      signedBy,
      signerRole,
      signedAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
      formData,
      youthAssentObtained: youthAssentObtained ?? false,
      icwaTribalNotified: icwaTribalNotified ?? false,
      auditTrail: [],
    });

    tx.update(childRef, {
      consentId: consentRef.id,
      consentStatus: 'active',
      lastUpdatedAt: serverTimestamp(),
    });
  });

  await writeAuditLog({
    stateId,
    eventType: 'consent_signed',
    targetId: childId,
    targetType: 'consent',
    performedBy: signedBy,
    details: { consentId, signerRole, expiresAt: expiresAt.toISOString() },
  });

  return consentId;
}

export async function listExpiringConsents(
  stateId: string,
  withinDays: number
): Promise<ConsentRecord[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

  const q = query(
    consentsRef(stateId),
    where('expiresAt', '<=', Timestamp.fromDate(cutoff)),
    where('expiresAt', '>=', Timestamp.fromDate(now))
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ConsentRecord);
}

export async function markConsentExpired(
  stateId: string,
  consentId: string,
  childId: string
): Promise<void> {
  await Promise.all([
    updateDoc(doc(db, 'states', stateId, 'consents', consentId), {
      status: 'expired',
    }),
    updateDoc(doc(db, 'states', stateId, 'children', childId), {
      consentStatus: 'expired',
      lastUpdatedAt: serverTimestamp(),
    }),
  ]);

  await writeAuditLog({
    stateId,
    eventType: 'consent_expired',
    targetId: childId,
    targetType: 'consent',
    performedBy: 'system',
    details: { consentId },
  });
}
