# Spencer's Home — Project Memory Journal

---

## Executive Snapshot

**Current Focus:** All of Sprint 1 + substantial Phase 2/3 features built in a single overnight session. Platform is now demo-ready for Nebraska DHHS.

**What's done:**
- React 18 + Vite 5 + TypeScript (strict) + Tailwind CSS 3 ✅
- Firebase v10 connected — project `spencers-home-dev` ✅
- `firebase.json`, `.firebaserc`, `firestore.indexes.json` for deploy + emulators ✅
- Emulator connection in `firebase.ts` via `VITE_USE_EMULATORS=true` ✅
- Data models + all service layer (`children`, `consent`, `storage`, `audit`, `users`, `inquiries`) ✅
- Custom hooks: `useAuth`, `useChildren` (with reload), `useConsent`, ✅
- Zustand auth store ✅
- **Auth flows:** Login + password reset + "forgot password" + self-service registration (pending approval) ✅
- **RequireAuth:** loading state, inactive/pending-approval wall, role gate ✅
- **AppShell:** sticky nav, role badge, sign-out, Users link for admins ✅
- **Pages built:**
  - GalleryPage: video-first ProfileCards, age/gender/video filters, result count ✅
  - DashboardPage: status stats, expiring consent alerts, inquiry count, profile search ✅
  - ProfileFormPage: create + edit, interest tag picker, PII bio warnings, ICWA section ✅
  - ProfileDetailPage: status/consent badges, action buttons, consent record details, inline media, archive ✅
  - ConsentFormPage: canvas draw signature, youth assent + ICWA conditional fields ✅
  - AdminUsersPage: list users by state, approve/deactivate, role change ✅
  - RegisterPage: self-service caseworker account, pending approval flow ✅
- **MediaUpload component:** react-dropzone, per-file progress bar, photo + video ✅
- **InquiryModal:** public gallery CTA, writes to Firestore, increments inquiryCount ✅
- **Toast system:** Radix Toast, success/error/info, wired into all mutations ✅
- **Firestore security rules:** stateId-scoped, role hierarchy, audit append-only, public inquiry creates ✅
- **Storage security rules:** auth-required, MIME guard, 500 MB cap ✅
- TypeScript: 0 errors ✅

**Next session — work items in priority order:**
1. Coordinator/admin: view inquiries on ProfileDetailPage (read from subcollection)
2. State configuration panel (branding, consent model, PII rules) — Phase 2
3. Nebraska-specific consent language (coordinate with DHHS)
4. Firebase emulator: seed script for local dev with test data
5. AdoptUSKids CSV export for published profiles (Phase 3)
6. Lighthouse audit + performance pass (Phase 4 readiness)

---

## Technical Decisions

### Privacy Architecture (2026-04-08)
No child last name, school name, location, or case history stored anywhere in the data model. All Firebase Storage media is private — never public bucket URLs. Signed/token URLs only. This is enforced at the service layer, not just the UI.

### Multi-Tenant by stateId (2026-04-08)
Every Firestore read/write is scoped to `/states/{stateId}/`. The `stateId` on the authenticated user record is the source of truth — never trust client-supplied stateId for writes.

### Audit Log is Write-Only (2026-04-08)
All profile status changes, consent events, media uploads, and user role changes write an immutable entry to `/audit/{logId}`. The app never reads audit logs (platform admin only). `writeAuditLog()` in `services/audit.ts` is the single entry point.

### Consent Gate on Publish (2026-04-08)
`publishProfile()` in `services/children.ts` runs inside a Firestore transaction that checks `consentStatus === 'active'` before updating status to `published`. This cannot be bypassed from the UI.

### Gender Field Added (2026-04-09)
`ChildProfile.gender: Gender` added (`'male' | 'female' | 'nonbinary' | 'undisclosed'`). Rationale: Phase 3 gallery filters include gender; adding now avoids a schema migration later. Gender is stored but shown contextually — `'undisclosed'` is suppressed in the public UI.

### Canvas Signature for Consent (2026-04-09)
`react-signature-canvas` used for consent form. Signature captured as base64 PNG and stored in `ConsentRecord.formData.signatureDataUrl`. This is a caseworker-held audit record, not displayed publicly.

### Consent Language is Placeholder (2026-04-09)
Consent form text is explicitly flagged as placeholder (`consentLanguageVersion: 'placeholder-v1'`). Must be replaced with Nebraska DHHS-approved language before any real child data is entered. Warning banner shown in the UI.

### Fixed Interests List (2026-04-09)
18-item fixed list in `constants.ts`. Chosen for consistency in future gallery filtering. State-specific customization deferred to Phase 2 state config panel.

### Storage Rules — Auth Enforced, stateId at Service Layer (2026-04-09)
Firebase Storage rules cannot do Firestore lookups, so stateId matching is enforced in `storage.ts` (service layer), not in storage rules. Storage rules enforce: authenticated user, MIME type (image/* or video/*), max 500 MB.

### Public Inquiries — No Auth Required (2026-04-09)
Inquiry creates (`states/{stateId}/children/{childId}/inquiries`) are allowed without authentication in Firestore rules. Rationale: families browsing the gallery should be able to submit interest without creating an account. Inquiries are read-only for caseworkers, append-only, never updatable or deletable.

### Caseworker Registration — Pending Approval Flow (2026-04-09)
New users self-register via `/register`. Firebase Auth account is created immediately; Firestore user doc is set with `active: false`. State admin approves via `/admin/users`. RequireAuth shows a pending-approval wall for `active: false` users rather than redirecting to login.

### ReactPlayer v3 Type Workaround (2026-04-09)
react-player v3 ships narrowed types that omit `url` from the public props interface. ProfileCard uses a local `Player` alias typed with the props actually needed. This is isolated to one file and explicitly commented.

---

## Historical Log

### 2026-04-09 — Full overnight build (Sprint 1 complete + Phase 2/3 features)

**Commit 1 — Sprint 1 core loop:**
ProfileFormPage, ConsentFormPage (canvas sig), MediaUpload, ProfileDetailPage, AppShell, all routes, firestore.rules, storage.rules, gender field, useChild reload.

**Commit 2 — Emulator config + PII warnings + gallery filters:**
firebase.json, .firebaserc, firestore.indexes.json, emulator connection in firebase.ts, real-time PII detection in bio editor, GalleryPage filters (age range, gender, video toggle).

**Commit 3 — Toasts + consent expiry alerts + view tracking:**
Radix Toast system, toasts wired into all mutations, useExpiringConsents + dashboard alert strip, recordProfileView (fire-and-forget increment), ProfileCard stateId prop.

**Commit 4 — Auth flows + archive + admin user management:**
LoginPage password reset, RegisterPage (pending approval), RequireAuth inactive wall, ProfileDetailPage archive action, AdminUsersPage (approve/deactivate/role change), services/users.ts.

**Commit 5 — Dashboard search + consent details + gallery inquiry:**
Dashboard profile text search + inquiry count stat, ProfileDetailPage consent record details panel, InquiryModal (public Firestore write, increments inquiryCount), firestore.rules updated for public inquiry creates, ReactPlayer v3 type workaround.

### 2026-04-08 — Project Bootstrap + Firebase Connected
- User provided full PRD (Spencer's Home Digital Permanency Platform v1.0)
- Scaffolded complete project: Vite + React 18 + TypeScript strict + Tailwind + Firebase v10
- Built all data model interfaces, service layer, hooks, pages, and routing
- Added CLAUDE.md, docs/JOURNAL.md, docs/PRD.md, .claude/settings.json
- User created `spencers-home-dev` Firebase project and filled in `.env.local`
- Zero TypeScript errors confirmed
- Commits: `d13907e` (scaffold), `5a914a8` (Claude config + docs)
