// Create a test supervisor account in Test State (ts)
// Run with: npx tsx scripts/create-test-supervisor.ts <path-to-service-account.json>

import * as fs from 'fs';
import * as path from 'path';

const SUPERVISOR_EMAIL = 'supervisor@spencershome.org';
const SUPERVISOR_PASSWORD = 'TestSuper123!';
const SUPERVISOR_NAME = 'Test Supervisor';
const STATE_ID = 'ts';

const keyPath = process.argv[2];
if (!keyPath) {
  console.error('Usage: npx tsx scripts/create-test-supervisor.ts <path-to-service-account.json>');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(keyPath), 'utf-8'));

import('firebase-admin').then(async ({ default: admin }) => {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

  const auth = admin.auth();
  const db = admin.firestore();

  let uid: string;
  try {
    const existing = await auth.getUserByEmail(SUPERVISOR_EMAIL);
    uid = existing.uid;
    console.log(`✓ Auth user already exists — uid: ${uid}`);
  } catch {
    const created = await auth.createUser({
      email: SUPERVISOR_EMAIL,
      password: SUPERVISOR_PASSWORD,
      displayName: SUPERVISOR_NAME,
    });
    uid = created.uid;
    console.log(`✓ Auth user created — uid: ${uid}`);
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.doc(`users/${uid}`).set({
    id: uid,
    email: SUPERVISOR_EMAIL,
    displayName: SUPERVISOR_NAME,
    role: 'supervisor',
    stateId: STATE_ID,
    active: true,
    createdAt: now,
    lastLoginAt: now,
  }, { merge: true });

  console.log(`✓ Firestore user doc written — role: supervisor, stateId: ${STATE_ID}`);
  console.log('\nSupervisor Credentials:');
  console.log(`  Email:    ${SUPERVISOR_EMAIL}`);
  console.log(`  Password: ${SUPERVISOR_PASSWORD}`);
  console.log(`  Role:     supervisor`);
  console.log(`  UID:      ${uid}`);

  process.exit(0);
}).catch((err: unknown) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
