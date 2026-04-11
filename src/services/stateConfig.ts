import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { writeAuditLog } from './audit';
import type { StateConfig } from '@/types';

export async function getStateConfig(stateId: string): Promise<StateConfig | null> {
  const snap = await getDoc(doc(db, 'states', stateId));
  if (!snap.exists()) return null;
  return snap.data() as StateConfig;
}

export async function saveStateConfig(
  stateId: string,
  config: StateConfig,
  userId: string
): Promise<void> {
  await setDoc(doc(db, 'states', stateId), { ...config, updatedAt: serverTimestamp() }, { merge: true });

  await writeAuditLog({
    stateId,
    eventType: 'state_config_updated',
    targetId: stateId,
    targetType: 'state',
    performedBy: userId,
    details: { consentModel: config.consentModel, consentExpiryDays: config.consentExpiryDays },
  });
}
