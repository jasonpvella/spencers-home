// Diagnostic: print photoUrls and videoUrl for all children in Test State
// Run with: npx tsx scripts/check-media-urls.ts <path-to-service-account.json>

import * as fs from 'fs';
import * as path from 'path';

const STATE_ID = 'ts';
const keyPath = process.argv[2];
if (!keyPath) {
  console.error('Usage: npx tsx scripts/check-media-urls.ts <path-to-service-account.json>');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(keyPath), 'utf-8'));

import('firebase-admin').then(async ({ default: admin }) => {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const snap = await db.collection(`states/${STATE_ID}/children`).get();

  for (const doc of snap.docs) {
    const data = doc.data();
    console.log(`\n--- ${data.firstName ?? doc.id} (${doc.id}) ---`);
    console.log(`status: ${data.status}`);
    console.log(`photoUrls (${(data.photoUrls ?? []).length}):`);
    for (const url of (data.photoUrls ?? [])) {
      console.log(`  ${url}`);
    }
    console.log(`videoUrl: ${data.videoUrl ?? '(none)'}`);
  }

  process.exit(0);
}).catch((err: unknown) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
