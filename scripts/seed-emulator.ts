// Run with: npx tsx scripts/seed-emulator.ts
// Requires: npm install -D tsx
// Make sure emulators are running: firebase emulators:start

const PROJECT_ID = 'spencers-home-dev';
const FIRESTORE_URL = 'http://localhost:8080';
const AUTH_URL = 'http://localhost:9099';
const STATE_ID = 'NE';

// ─── Firestore REST Value Serialization ─────────────────────────────────────

function serializeValue(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') return { integerValue: String(value) };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(serializeValue) } };
  }
  if (typeof value === 'object') {
    return { mapValue: { fields: serializeFields(value as Record<string, unknown>) } };
  }
  return { nullValue: null };
}

function serializeFields(obj: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    fields[key] = serializeValue(value);
  }
  return fields;
}

// ─── Firestore Write Helper ──────────────────────────────────────────────────

async function writeDocument(
  docPath: string,
  data: Record<string, unknown>
): Promise<void> {
  const url = `${FIRESTORE_URL}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}`;
  const body = {
    fields: serializeFields(data),
  };

  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to write document ${docPath}: ${response.status} ${error}`);
  }
}

async function deleteDocument(docPath: string): Promise<void> {
  const url = `${FIRESTORE_URL}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}`;

  const response = await fetch(url, {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Failed to delete document ${docPath}: ${response.status} ${error}`);
  }
}

// ─── Auth Emulator Helpers ────────────────────────────────────────────────────

interface AuthSignUpResponse {
  localId: string;
  idToken: string;
  email: string;
  displayName?: string;
}

async function createAuthUser(
  email: string,
  password: string,
  displayName: string
): Promise<string> {
  const url = `${AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      displayName,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create auth user ${email}: ${response.status} ${error}`);
  }

  const data = (await response.json()) as AuthSignUpResponse;
  return data.localId;
}

// ─── Clear Existing Data ─────────────────────────────────────────────────────

async function clearStateData(): Promise<void> {
  console.log(`Clearing existing ${STATE_ID} state data...`);

  try {
    // Delete state doc (this will cascade in Firestore)
    await deleteDocument(`states/${STATE_ID}`);
  } catch (err) {
    // Ignore errors for non-existent state
    console.log('  (no existing state data to clear)');
  }
}

// ─── Seed Functions ──────────────────────────────────────────────────────────

async function seedStateConfig(): Promise<void> {
  console.log('Seeding state config...');

  const now = new Date();

  const stateConfig = {
    stateId: STATE_ID,
    stateName: 'Nebraska',
    agencyName: 'Nebraska DHHS',
    consentModel: 'supervisor',
    consentExpiryDays: 365,
    requireYouthAssentAge: 12,
    icwaEnabled: true,
    galleryTiers: {
      public: {
        showFullName: false,
        showAge: true,
        showBio: true,
        showVideo: true,
        showPhotos: true,
      },
      registered: {
        showFullName: false,
        showAge: true,
        showBio: true,
        showVideo: true,
        showPhotos: true,
      },
      agency: {
        showFullName: true,
        showAge: true,
        showBio: true,
        showVideo: true,
        showPhotos: true,
      },
    },
    branding: {
      primaryColor: '#1d4ed8',
    },
    piiRules: {
      firstNameOnly: true,
      noSchoolNames: true,
      noLocationIdentifiers: true,
      additionalRules: [],
    },
  };

  await writeDocument(`states/${STATE_ID}`, stateConfig);
  console.log('  ✓ State config created');
}

async function seedUsers(): Promise<{ caseworker: string; supervisor: string; admin: string }> {
  console.log('Creating auth users...');

  const caseworkerUid = await createAuthUser(
    'caseworker@test.com',
    'TestPass123!',
    'Sarah Chen'
  );
  console.log('  ✓ caseworker@test.com created');

  const supervisorUid = await createAuthUser('supervisor@test.com', 'TestPass123!', 'Marcus Webb');
  console.log('  ✓ supervisor@test.com created');

  const adminUid = await createAuthUser('admin@test.com', 'TestPass123!', 'Dana Reyes');
  console.log('  ✓ admin@test.com created');

  console.log('Creating Firestore user documents...');
  const now = new Date();

  await writeDocument(`users/${caseworkerUid}`, {
    id: caseworkerUid,
    email: 'caseworker@test.com',
    displayName: 'Sarah Chen',
    role: 'caseworker',
    stateId: STATE_ID,
    active: true,
    createdAt: now,
    lastLoginAt: now,
  });

  await writeDocument(`users/${supervisorUid}`, {
    id: supervisorUid,
    email: 'supervisor@test.com',
    displayName: 'Marcus Webb',
    role: 'supervisor',
    stateId: STATE_ID,
    active: true,
    createdAt: now,
    lastLoginAt: now,
  });

  await writeDocument(`users/${adminUid}`, {
    id: adminUid,
    email: 'admin@test.com',
    displayName: 'Dana Reyes',
    role: 'state_admin',
    stateId: STATE_ID,
    active: true,
    createdAt: now,
    lastLoginAt: now,
  });

  console.log('  ✓ User documents created');

  return {
    caseworker: caseworkerUid,
    supervisor: supervisorUid,
    admin: adminUid,
  };
}

async function seedChildren(caseworkerUid: string, supervisorUid: string): Promise<void> {
  console.log('Creating child profiles...');

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Child 1: Marcus
  await writeDocument(`states/${STATE_ID}/children/child-001`, {
    id: 'child-001',
    stateId: STATE_ID,
    firstName: 'Marcus',
    ageAtListing: 9,
    gender: 'male',
    bio: "Marcus loves building with Legos and anything that has to do with dinosaurs. He's a creative kid who can spend hours making up stories.",
    interests: ['Legos', 'Science', 'Drawing'],
    photoUrls: [],
    status: 'draft',
    icwaFlag: false,
    consentStatus: 'not_obtained',
    createdBy: caseworkerUid,
    createdAt: now,
    lastUpdatedAt: now,
    viewCount: 0,
    saveCount: 0,
    inquiryCount: 0,
  });

  // Child 2: Destiny
  await writeDocument(`states/${STATE_ID}/children/child-002`, {
    id: 'child-002',
    stateId: STATE_ID,
    firstName: 'Destiny',
    ageAtListing: 14,
    gender: 'female',
    bio: "Destiny is a talented singer who performs in her school choir. She's looking for a family that loves music and outdoor adventures.",
    interests: ['Singing', 'Music', 'Outdoors'],
    photoUrls: [],
    status: 'pending_review',
    icwaFlag: false,
    consentStatus: 'not_obtained',
    createdBy: caseworkerUid,
    createdAt: now,
    lastUpdatedAt: now,
    viewCount: 3,
    saveCount: 0,
    inquiryCount: 0,
  });

  // Child 3: Jordan
  await writeDocument(`states/${STATE_ID}/children/child-003`, {
    id: 'child-003',
    stateId: STATE_ID,
    firstName: 'Jordan',
    ageAtListing: 7,
    gender: 'nonbinary',
    bio: "Jordan is an energetic kid who loves animals and dreams of having a dog. They enjoy cooking simple recipes and watching nature documentaries.",
    interests: ['Animals', 'Cooking', 'Movies'],
    photoUrls: [],
    status: 'consent_obtained',
    icwaFlag: true,
    icwaNotes: 'Enrolled member — Omaha Tribe. Tribal notification completed 2024-12-01.',
    consentId: 'consent-001',
    consentStatus: 'active',
    createdBy: caseworkerUid,
    createdAt: now,
    lastUpdatedAt: now,
    viewCount: 12,
    saveCount: 1,
    inquiryCount: 0,
  });

  // Child 4: Aaliyah
  await writeDocument(`states/${STATE_ID}/children/child-004`, {
    id: 'child-004',
    stateId: STATE_ID,
    firstName: 'Aaliyah',
    ageAtListing: 11,
    gender: 'female',
    bio: "Aaliyah is a bright, curious girl who loves reading fantasy novels and drawing her own characters. She has a big heart and a great sense of humor.",
    interests: ['Reading', 'Art', 'Theater'],
    photoUrls: [],
    status: 'published',
    icwaFlag: false,
    consentId: 'consent-002',
    consentStatus: 'active',
    publishedAt: now,
    createdBy: caseworkerUid,
    createdAt: now,
    lastUpdatedAt: now,
    viewCount: 47,
    saveCount: 3,
    inquiryCount: 2,
  });

  console.log('  ✓ 4 child profiles created');
}

async function seedConsents(supervisorUid: string): Promise<void> {
  console.log('Creating consent records...');

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const threeSixtyFiveDaysFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const threeThirtySixFiveDaysFromNow = new Date(now.getTime() + 335 * 24 * 60 * 60 * 1000);
  const threeHundredFiftyOneDaysFromNow = new Date(now.getTime() + 351 * 24 * 60 * 60 * 1000);

  // Consent 1: Jordan (child-003)
  await writeDocument(`states/${STATE_ID}/consents/consent-001`, {
    id: 'consent-001',
    stateId: STATE_ID,
    childId: 'child-003',
    signedBy: supervisorUid,
    signerRole: 'supervisor',
    signedAt: thirtyDaysAgo,
    expiresAt: threeHundredFiftyOneDaysFromNow,
    youthAssentObtained: false,
    icwaTribalNotified: true,
    formData: {
      signerName: 'Marcus Webb',
      consentLanguageVersion: 'ne-draft-v1',
    },
    auditTrail: [
      {
        action: 'consent_signed',
        performedBy: supervisorUid,
        performedAt: thirtyDaysAgo,
        details: {
          signerRole: 'supervisor',
        },
      },
    ],
  });

  // Consent 2: Aaliyah (child-004)
  await writeDocument(`states/${STATE_ID}/consents/consent-002`, {
    id: 'consent-002',
    stateId: STATE_ID,
    childId: 'child-004',
    signedBy: supervisorUid,
    signerRole: 'supervisor',
    signedAt: fourteenDaysAgo,
    expiresAt: threeHundredFiftyOneDaysFromNow,
    youthAssentObtained: false,
    icwaTribalNotified: false,
    formData: {
      signerName: 'Marcus Webb',
      consentLanguageVersion: 'ne-draft-v1',
    },
    auditTrail: [
      {
        action: 'consent_signed',
        performedBy: supervisorUid,
        performedAt: fourteenDaysAgo,
        details: {
          signerRole: 'supervisor',
        },
      },
    ],
  });

  console.log('  ✓ 2 consent records created');
}

async function seedInquiries(caseworkerUid: string): Promise<void> {
  console.log('Creating inquiries...');

  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  // Flat collection: states/{stateId}/inquiries
  await writeDocument(`states/${STATE_ID}/inquiries/inquiry-001`, {
    id: 'inquiry-001',
    stateId: STATE_ID,
    childId: 'child-004',
    childFirstName: 'Aaliyah',
    caseworkerId: caseworkerUid,
    name: 'The Johnson Family',
    phone: '402-555-0101',
    email: 'johnson.family@email.com',
    inquirerState: 'Nebraska',
    message:
      "We've been approved adoptive parents for two years and Aaliyah's profile really spoke to us. We'd love to learn more about her interests and how a meeting might work.",
    submittedAt: fiveDaysAgo,
    replyStatus: 'pending',
  });

  await writeDocument(`states/${STATE_ID}/inquiries/inquiry-002`, {
    id: 'inquiry-002',
    stateId: STATE_ID,
    childId: 'child-004',
    childFirstName: 'Aaliyah',
    caseworkerId: caseworkerUid,
    name: 'Rachel Tran',
    phone: '402-555-0202',
    email: 'rachel.tran@gmail.com',
    inquirerState: 'Iowa',
    message:
      "Hi — I'm a single parent with an 8-year-old son. Aaliyah sounds like she'd be a wonderful addition to our family. Can you share more about next steps?",
    submittedAt: twoDaysAgo,
    replyStatus: 'replied_following_up',
    notes: 'Called on Wednesday, left voicemail. Will try again Friday.',
  });

  console.log('  ✓ 2 inquiries created (flat collection)');
}

// ─── Main Seed Function ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    console.log('========================================');
    console.log('Spencer\'s Home — Firebase Emulator Seed');
    console.log('========================================\n');

    console.log(`Project ID: ${PROJECT_ID}`);
    console.log(`State ID: ${STATE_ID}`);
    console.log(`Firestore URL: ${FIRESTORE_URL}`);
    console.log(`Auth URL: ${AUTH_URL}\n`);

    await clearStateData();
    await seedStateConfig();
    const users = await seedUsers();
    await seedChildren(users.caseworker, users.supervisor);
    await seedConsents(users.supervisor);
    await seedInquiries(users.caseworker);

    console.log('\n========================================');
    console.log('Seed completed successfully!');
    console.log('========================================\n');

    console.log('Test Credentials:');
    console.log('  Caseworker:');
    console.log('    Email: caseworker@test.com');
    console.log('    Password: TestPass123!');
    console.log('    Role: caseworker');
    console.log('');
    console.log('  Supervisor:');
    console.log('    Email: supervisor@test.com');
    console.log('    Password: TestPass123!');
    console.log('    Role: supervisor');
    console.log('');
    console.log('  State Admin:');
    console.log('    Email: admin@test.com');
    console.log('    Password: TestPass123!');
    console.log('    Role: state_admin');
    console.log('');
    console.log('Data Created:');
    console.log('  • State config for Nebraska (NE)');
    console.log('  • 3 auth users + Firestore user documents');
    console.log('  • 4 child profiles (Marcus, Destiny, Jordan, Aaliyah)');
    console.log('  • 2 consent records (for Jordan and Aaliyah)');
    console.log('  • 2 inquiries (for Aaliyah)\n');
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

main();
