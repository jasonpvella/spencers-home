import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { AuditEventType } from '@/types';

export async function writeAuditLog(params: {
  stateId: string;
  eventType: AuditEventType;
  targetId: string;
  targetType: 'child' | 'consent' | 'user' | 'media';
  performedBy: string;
  details: Record<string, unknown>;
}): Promise<void> {
  await addDoc(collection(db, 'audit'), {
    ...params,
    performedAt: serverTimestamp(),
  });
}
