import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { writeAuditLog } from './audit';
import type { User, UserRole } from '@/types';

export async function listUsersByState(stateId: string): Promise<User[]> {
  const q = query(collection(db, 'users'), where('stateId', '==', stateId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as User);
}

export async function setUserActive(
  userId: string,
  active: boolean,
  performedBy: string,
  stateId: string
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    active,
    lastLoginAt: serverTimestamp(),
  });
  await writeAuditLog({
    stateId,
    eventType: 'user_role_change',
    targetId: userId,
    targetType: 'user',
    performedBy,
    details: { change: active ? 'activated' : 'deactivated' },
  });
}

export async function setUserRole(
  userId: string,
  role: UserRole,
  performedBy: string,
  stateId: string
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { role });
  await writeAuditLog({
    stateId,
    eventType: 'user_role_change',
    targetId: userId,
    targetType: 'user',
    performedBy,
    details: { role },
  });
}
