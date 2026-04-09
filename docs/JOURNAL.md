# Spencer's Home — Project Memory Journal

---

## Executive Snapshot

**Current Focus:** Sprint 1 core loop is feature-complete. Caseworker can now: create a profile → upload photos/video → capture canvas-signed consent → publish to gallery. All routes live, TypeScript clean, security rules deployed.

**What's done:**
- React 18 + Vite 5 + TypeScript (strict) + Tailwind CSS 3 ✅
- Firebase v10 connected — project `spencers-home-dev` ✅
- Data models: `ChildProfile` (+ `gender` field), `ConsentRecord`, `StateConfig`, `User`, `AuditLog` ✅
- Service layer: `children.ts`, `consent.ts`, `storage.ts`, `audit.ts` ✅
- Custom hooks: `useAuth`, `useChildren` (incl. `reload` on `useChild`) ✅
- Zustand auth store ✅
- AppShell nav (sticky, role label, sign-out) ✅
- Pages: Login, Dashboard, Gallery, ProfileFormPage, ProfileDetailPage, ConsentFormPage ✅
- MediaUpload component (react-dropzone, per-file progress bar, photo + video) ✅
- Routes wired: `/profile/new`, `/profile/:id`, `/profile/:id/edit`, `/profile/:id/consent` ✅
- Firestore security rules (`firestore.rules`) — stateId-scoped, role-gated, audit append-only ✅
- Storage security rules (`storage.rules`) — auth-required, MIME + size guarded ✅
- TypeScript: 0 errors ✅

**Next session — work items in priority order:**
1. Firebase emulator setup (local dev without hitting live project)
2. `firebase.json` + `.firebaserc` for deploy pipeline
3. Phase 2 start: state config panel, consent expiry alerts, forbidden PII field validation in bio editor
4. Gallery filter/search (age, gender, video available) — Phase 3 but low-effort win
5. Nebraska-specific consent language (coordinate with DHHS — consent form is placeholder)

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

---

## Historical Log

### 2026-04-09 — Sprint 1 Core Loop Complete (overnight build)
- Added `gender: Gender` field to `ChildProfile` type
- Added `DEFAULT_CONSENT_EXPIRY_DAYS`, `INTERESTS_LIST`, `GENDER_OPTIONS` to constants
- Installed `react-signature-canvas` + `@types/react-signature-canvas`
- Added `reload()` to `useChild` hook (matches pattern from `useAllChildren`)
- **AppShell** (`components/shared/AppShell.tsx`): sticky nav, role badge, sign-out
- **ProfileFormPage** (`pages/ProfileFormPage.tsx`): create + edit modes, all fields, interest tag picker, ICWA conditional section, react-hook-form + zod validation
- **MediaUpload** (`components/profile/MediaUpload.tsx`): react-dropzone for photos + video, progress bar, replaces video on re-upload
- **ProfileDetailPage** (`pages/ProfileDetailPage.tsx`): full profile view, status + consent badges, ICWA warning, publish/review/consent action buttons, inline media upload
- **ConsentFormPage** (`pages/ConsentFormPage.tsx`): canvas draw signature, youth assent + ICWA tribal notification conditional fields, placeholder consent language with visible warning, 1-year expiry
- **App.tsx**: all routes wired, `AuthShell` wrapper combines RequireAuth + AppShell
- **firestore.rules**: stateId-scoped reads/writes, role hierarchy, audit append-only, no hard deletes
- **storage.rules**: auth required, MIME guard, 500 MB cap, deny-all fallback
- TypeScript: 0 errors confirmed

### 2026-04-08 — Project Bootstrap + Firebase Connected
- User provided full PRD (Spencer's Home Digital Permanency Platform v1.0)
- Scaffolded complete project: Vite + React 18 + TypeScript strict + Tailwind + Firebase v10
- Built all data model interfaces, service layer, hooks, pages, and routing
- Added CLAUDE.md, docs/JOURNAL.md, docs/PRD.md, .claude/settings.json — matching Fundrasing_Campaign project setup pattern (Save Project protocol + model selection rules)
- User created `spencers-home-dev` Firebase project and filled in `.env.local`
- `ReactPlayer` import changed from `/lazy` to direct import
- Zero TypeScript errors confirmed
- Commits: `d13907e` (scaffold), `5a914a8` (Claude config + docs)
