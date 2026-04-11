import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  increment,
  updateDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { createInquiryNotification } from './notifications';
import type { Inquiry } from '@/types';

export async function getInquiries(stateId: string, childId: string): Promise<Inquiry[]> {
  const q = query(
    collection(db, 'states', stateId, 'children', childId, 'inquiries'),
    orderBy('submittedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Inquiry);
}

export interface InquiryPayload {
  name: string;
  phone: string;
  email: string;
  inquirerState: string;
  message: string;
}

export interface InquiryContext {
  caseworkerUserId: string;
  childFirstName: string;
}

export async function submitInquiry(
  stateId: string,
  childId: string,
  payload: InquiryPayload,
  context: InquiryContext
): Promise<void> {
  const inquiriesRef = collection(db, 'states', stateId, 'children', childId, 'inquiries');

  await addDoc(inquiriesRef, {
    ...payload,
    submittedAt: serverTimestamp(),
  });

  // Increment inquiryCount on the child profile
  await updateDoc(doc(db, 'states', stateId, 'children', childId), {
    inquiryCount: increment(1),
  });

  // Notify the caseworker who owns this profile
  await createInquiryNotification(
    stateId,
    context.caseworkerUserId,
    childId,
    context.childFirstName,
    payload.name
  );
}
