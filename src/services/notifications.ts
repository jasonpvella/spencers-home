import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Notification } from '@/types';

export function subscribeToNotifications(
  stateId: string,
  userId: string,
  onUpdate: (notifications: Notification[]) => void
): () => void {
  const q = query(
    collection(db, 'states', stateId, 'notifications'),
    where('userId', '==', userId),
    where('read', '==', false),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification));
  });
}

export async function createInquiryNotification(
  stateId: string,
  caseworkerUserId: string,
  childId: string,
  childFirstName: string,
  inquirerName: string
): Promise<void> {
  await addDoc(collection(db, 'states', stateId, 'notifications'), {
    userId: caseworkerUserId,
    stateId,
    childId,
    childFirstName,
    inquirerName,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export async function markNotificationRead(stateId: string, notifId: string): Promise<void> {
  await updateDoc(doc(db, 'states', stateId, 'notifications', notifId), { read: true });
}
