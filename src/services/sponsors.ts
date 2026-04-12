import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Sponsor } from '@/types';

// Public: active sponsors ordered for landing page display
export async function getActiveSponsors(): Promise<Sponsor[]> {
  const q = query(collection(db, 'sponsors'), orderBy('order', 'asc'));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Sponsor))
    .filter((s) => s.active);
}

// Admin: all sponsors regardless of active state
export async function getAllSponsors(): Promise<Sponsor[]> {
  const q = query(collection(db, 'sponsors'), orderBy('order', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sponsor));
}

export async function addSponsor(data: Omit<Sponsor, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'sponsors'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateSponsorActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'sponsors', id), { active });
}

export async function deleteSponsor(id: string): Promise<void> {
  await deleteDoc(doc(db, 'sponsors', id));
}
