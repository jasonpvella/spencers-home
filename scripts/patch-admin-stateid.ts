// One-time patch: adds stateId to the platform_admin user doc
// Run with: npx tsx scripts/patch-admin-stateid.ts <path-to-service-account.json>

import * as fs from 'fs';
import * as path from 'path';

const PLATFORM_ADMIN_UID = 'EoCy0vcpn8RIucC5bsRuOOhn3ak2';
const STATE_ID = 'ts';

const keyPath = process.argv[2];
if (!keyPath) {
  console.error('Usage: npx tsx scripts/patch-admin-stateid.ts <path-to-service-account.json>');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(keyPath), 'utf-8'));

import('firebase-admin').then(async ({ default: admin }) => {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

  await admin.firestore().doc(`users/${PLATFORM_ADMIN_UID}`).update({ stateId: STATE_ID });

  console.log(`✓ Set stateId: "${STATE_ID}" on users/${PLATFORM_ADMIN_UID}`);
  process.exit(0);
}).catch((err: unknown) => {
  console.error('❌ Patch failed:', err);
  process.exit(1);
});
