import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  SAMLAuthProvider,
  OAuthProvider,
  signInWithRedirect,
  type User as FirebaseUser,
} from 'firebase/auth';
import { db, auth } from '@/config/firebase';
import { writeAuditLog } from './audit';
import type { SsoProvider } from '@/types';

// Stored in sessionStorage before redirect so we can provision the user on return
export const SSO_PENDING_KEY = 'sso_pending';

export async function getSsoProvider(stateId: string): Promise<SsoProvider | null> {
  const snap = await getDoc(doc(db, 'ssoProviders', stateId));
  if (!snap.exists()) return null;
  return snap.data() as SsoProvider;
}

export async function saveSsoProvider(
  stateId: string,
  config: Omit<SsoProvider, 'stateId' | 'updatedAt'>,
  userId: string
): Promise<void> {
  await setDoc(
    doc(db, 'ssoProviders', stateId),
    { ...config, stateId, updatedAt: serverTimestamp() },
    { merge: true }
  );
  await writeAuditLog({
    stateId,
    eventType: 'state_config_updated',
    targetId: stateId,
    targetType: 'state',
    performedBy: userId,
    details: {
      ssoUpdate: {
        enabled: config.enabled,
        providerType: config.providerType,
        providerId: config.providerId,
      },
    },
  });
}

export async function initiateSsoSignIn(provider: SsoProvider): Promise<void> {
  sessionStorage.setItem(SSO_PENDING_KEY, JSON.stringify({ stateId: provider.stateId }));
  const firebaseProvider =
    provider.providerType === 'saml'
      ? new SAMLAuthProvider(provider.providerId)
      : new OAuthProvider(provider.providerId);
  await signInWithRedirect(auth, firebaseProvider);
}

// Called by useAuthListener when Firebase Auth has a user but no Firestore doc exists.
// Creates the doc with role 'caseworker' and active: false (pending state admin approval).
export async function provisionSsoUser(fbUser: FirebaseUser, stateId: string): Promise<void> {
  const userRef = doc(db, 'users', fbUser.uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) return;

  await setDoc(userRef, {
    email: fbUser.email ?? '',
    displayName: fbUser.displayName ?? fbUser.email ?? '',
    role: 'caseworker',
    stateId,
    active: false,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  });

  await writeAuditLog({
    stateId,
    eventType: 'user_sso_login',
    targetId: fbUser.uid,
    targetType: 'user',
    performedBy: fbUser.uid,
    details: { firstLogin: true },
  });
}
