import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { useAuthStore } from '@/store/authStore';
import { provisionSsoUser, SSO_PENDING_KEY } from '@/services/sso';
import type { User } from '@/types';

export function useAuthListener() {
  const { setUser, setFirebaseUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser({ uid: fbUser.uid, email: fbUser.email });
        try {
          const snap = await getDoc(doc(db, 'users', fbUser.uid));
          if (snap.exists()) {
            setUser({ id: snap.id, ...snap.data() } as User);
          } else {
            // No Firestore user doc — check if this is a returning SSO redirect
            const pending = sessionStorage.getItem(SSO_PENDING_KEY);
            if (pending) {
              sessionStorage.removeItem(SSO_PENDING_KEY);
              const { stateId } = JSON.parse(pending) as { stateId: string };
              await provisionSsoUser(fbUser, stateId);
              const provisioned = await getDoc(doc(db, 'users', fbUser.uid));
              setUser(provisioned.exists() ? ({ id: provisioned.id, ...provisioned.data() } as User) : null);
            } else {
              setUser(null);
            }
          }
        } catch {
          setUser(null);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [setUser, setFirebaseUser, setLoading]);
}

export function useCurrentUser() {
  return useAuthStore((s) => s.user);
}

export function useIsLoading() {
  return useAuthStore((s) => s.loading);
}
