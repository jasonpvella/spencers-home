// One-time migration: backfill ownedBy = createdBy on all child profiles that
// were created before the ownedBy field was introduced.
//
// Safe to run multiple times — skips any doc that already has ownedBy set.
//
// Run with:
//   npx tsx scripts/migrate-owned-by.ts <path-to-service-account.json>
//
// Get the service account key:
//   Firebase Console → spencers-home-dev → Project Settings → Service Accounts
//   → Generate new private key → download JSON → pass path as argument

import * as fs from 'fs';

const serviceAccountPath = process.argv[2];
if (!serviceAccountPath) {
  console.error('Usage: npx tsx scripts/migrate-owned-by.ts <path-to-service-account.json>');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

import('firebase-admin').then(async ({ default: admin }) => {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const db = admin.firestore();

  await migrate(db);
}).catch((err) => {
  console.error('Failed to initialise firebase-admin:', err);
  process.exit(1);
});

async function migrate(db: import('firebase-admin').firestore.Firestore) {
  const statesSnap = await db.collection('states').get();
  console.log(`Found ${statesSnap.size} state(s).`);

  let totalChecked = 0;
  let totalUpdated = 0;

  for (const stateDoc of statesSnap.docs) {
    const stateId = stateDoc.id;
    const childrenSnap = await db.collection('states').doc(stateId).collection('children').get();
    console.log(`  ${stateId}: ${childrenSnap.size} children`);

    let batch = db.batch();
    let batchCount = 0;

    for (const childDoc of childrenSnap.docs) {
      totalChecked++;
      const data = childDoc.data();

      // Skip docs that already have ownedBy set.
      if (data.ownedBy) continue;

      // createdBy must exist — it was required from day one.
      if (!data.createdBy) {
        console.warn(`    SKIP ${childDoc.id} — no createdBy field`);
        continue;
      }

      batch.update(childDoc.ref, { ownedBy: data.createdBy });
      batchCount++;
      totalUpdated++;

      // Firestore batch limit is 500 writes — commit and start a new batch.
      if (batchCount === 500) {
        await batch.commit();
        console.log(`    Committed batch of 500`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      console.log(`    Committed batch of ${batchCount}`);
    }
  }

  console.log(`\nDone. Checked ${totalChecked} profiles, updated ${totalUpdated}.`);
}

