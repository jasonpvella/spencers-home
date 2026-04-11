// Bootstrap platform_admin user + Test State config in live Firebase
// Run with: npx tsx scripts/bootstrap-admin.ts <path-to-service-account.json>
//
// How to get the service account key:
//   Firebase Console → spencers-home-dev → Project Settings → Service Accounts
//   → Generate new private key → download JSON → pass path as argument

import * as fs from 'fs';
import * as path from 'path';

// ─── Config ─────────────────────────────────────────────────────────────────

const PLATFORM_ADMIN_EMAIL = 'jason@spencershome.org';
const PLATFORM_ADMIN_PASSWORD = 'ChangeMe123!';
const PLATFORM_ADMIN_NAME = 'Jason Vella';

const TEST_STATE_ID = 'ts';
const TEST_STATE_NAME = 'Test State';

// ─── Load service account ────────────────────────────────────────────────────

const keyPath = process.argv[2];
if (!keyPath) {
  console.error('Usage: npx tsx scripts/bootstrap-admin.ts <path-to-service-account.json>');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(keyPath), 'utf-8'));
const projectId: string = serviceAccount.project_id;

// ─── Firebase Admin (dynamic import after we have the key) ──────────────────

import('firebase-admin').then(async ({ default: admin }) => {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const auth = admin.auth();
  const db = admin.firestore();

  console.log('========================================');
  console.log("Spencer's Home — Admin Bootstrap");
  console.log('========================================\n');
  console.log(`Project: ${projectId}`);
  console.log(`Platform admin: ${PLATFORM_ADMIN_EMAIL}`);
  console.log(`Test state: ${TEST_STATE_ID}\n`);

  // ── 1. Create or fetch platform_admin auth user ──────────────────────────

  let uid: string;
  try {
    const existing = await auth.getUserByEmail(PLATFORM_ADMIN_EMAIL);
    uid = existing.uid;
    console.log(`✓ Auth user already exists — uid: ${uid}`);
  } catch {
    const created = await auth.createUser({
      email: PLATFORM_ADMIN_EMAIL,
      password: PLATFORM_ADMIN_PASSWORD,
      displayName: PLATFORM_ADMIN_NAME,
    });
    uid = created.uid;
    console.log(`✓ Auth user created — uid: ${uid}`);
  }

  // ── 2. Write platform_admin Firestore user doc ───────────────────────────

  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.doc(`users/${uid}`).set({
    id: uid,
    email: PLATFORM_ADMIN_EMAIL,
    displayName: PLATFORM_ADMIN_NAME,
    role: 'platform_admin',
    active: true,
    createdAt: now,
    lastLoginAt: now,
  }, { merge: true });

  console.log(`✓ Firestore user doc written — role: platform_admin`);

  // ── 3. Create Test State config at states/ts ─────────────────────────────

  await db.doc(`states/${TEST_STATE_ID}`).set({
    stateId: TEST_STATE_ID,
    stateName: TEST_STATE_NAME,
    agencyName: 'Spencer\'s Home Test Agency',
    consentModel: 'supervisor',
    consentExpiryDays: 365,
    requireYouthAssentAge: 12,
    icwaEnabled: true,
    galleryTiers: {
      public: { showFullName: false, showAge: true, showBio: true, showVideo: true, showPhotos: true },
      registered: { showFullName: false, showAge: true, showBio: true, showVideo: true, showPhotos: true },
      agency: { showFullName: true, showAge: true, showBio: true, showVideo: true, showPhotos: true },
    },
    branding: {
      primaryColor: '#f59e0b',
    },
    piiRules: {
      firstNameOnly: true,
      noSchoolNames: true,
      noLocationIdentifiers: true,
      additionalRules: [],
    },
  }, { merge: true });

  console.log(`✓ Test State config written — states/${TEST_STATE_ID}`);

  console.log('\n========================================');
  console.log('Bootstrap complete!');
  console.log('========================================\n');
  console.log('Platform Admin Credentials:');
  console.log(`  Email:    ${PLATFORM_ADMIN_EMAIL}`);
  console.log(`  Password: ${PLATFORM_ADMIN_PASSWORD}`);
  console.log(`  Role:     platform_admin`);
  console.log(`  UID:      ${uid}`);
  console.log('\n⚠️  Change the password after first login.');
  console.log(`\nTest State: states/${TEST_STATE_ID} (${TEST_STATE_NAME})`);

  process.exit(0);
}).catch((err: unknown) => {
  console.error('❌ Bootstrap failed:', err);
  process.exit(1);
});
