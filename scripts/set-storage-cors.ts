// Configure CORS on the Firebase Storage bucket so browsers can load
// images and video from the public gallery without being blocked.
// Run with: npx tsx scripts/set-storage-cors.ts <path-to-service-account.json>

import * as fs from 'fs';
import * as path from 'path';

const keyPath = process.argv[2];
if (!keyPath) {
  console.error('Usage: npx tsx scripts/set-storage-cors.ts <path-to-service-account.json>');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(keyPath), 'utf-8'));

import('firebase-admin').then(async ({ default: admin }) => {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: serviceAccount.project_id + '.firebasestorage.app',
  });

  const bucket = admin.storage().bucket();

  await bucket.setCorsConfiguration([
    {
      origin: ['*'],
      method: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
      responseHeader: [
        'Content-Type',
        'Content-Range',
        'Accept-Ranges',
        'Authorization',
        'X-Goog-Upload-Protocol',
        'X-Goog-Upload-Command',
        'X-Goog-Upload-Offset',
        'X-Goog-Upload-File-Name',
        'X-Firebase-Storage-Version',
      ],
      maxAgeSeconds: 3600,
    },
  ]);

  console.log(`✓ CORS configured on bucket: ${bucket.name}`);
  console.log('  origin: *');
  console.log('  methods: GET, HEAD');
  process.exit(0);
}).catch((err: unknown) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
