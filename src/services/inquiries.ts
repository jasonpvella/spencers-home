import {
  collection,
  addDoc,
  serverTimestamp,
  increment,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface InquiryPayload {
  name: string;
  email: string;
  message: string;
}

export async function submitInquiry(
  stateId: string,
  childId: string,
  payload: InquiryPayload
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
}
