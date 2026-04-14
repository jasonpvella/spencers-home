# Spencer's Home — Project Memory Journal

---

## Executive Snapshot

**Current Focus:** Error boundary + `window.onerror` diagnostic scaffolding added. Mobile Chrome white screen resolved (stale cache — cleared history fixed it). App is stable on both Chrome and Edge mobile.

**What's done:**
- React 18 + Vite 5 + TypeScript (strict) + Tailwind CSS 3 ✅
- Firebase v10 connected — project `spencers-home-dev` ✅
- `firebase.json`, `.firebaserc`, `firestore.indexes.json` for deploy + emulators ✅
- Emulator connection in `firebase.ts` via `VITE_USE_EMULATORS=true` ✅
- Data models + all service layer (`children`, `consent`, `storage`, `audit`, `users`, `inquiries`, `stateConfig`, `notifications`, `favorites`, `sso`) ✅
- Custom hooks: `useAuth`, `useChildren` (with reload), `useConsent`, `useNotifications`, `useFavorites`, `useIsFavorite`, `useFavoriteToggle` ✅
- Zustand auth store ✅
- **Auth flows:** Login + password reset + "forgot password" + caseworker self-service registration (pending approval) + family self-registration (auto-approved) + SSO (SAML/OIDC redirect, first-login provisioning) ✅
- **RequireAuth:** loading state, inactive/pending-approval wall, role gate (family → `/`, caseworker → `/dashboard`) ✅
- **AppShell:** sticky nav with hamburger menu on mobile (< 768px), role badge (links to /settings), sign-out, bell notification dropdown (type-aware: inquiry + registration), dynamic logo + brand color from state config; "Home" link at top of hamburger for all roles ✅
- **Pages built:**
  - LandingPage: public hero, 4 category cards (Individuals, Siblings, Boys, Girls), about/partnership section, live sponsor logos ✅
  - GalleryPage (`/gallery`): video-first ProfileCards, filters (persisted to sessionStorage), scroll position restored on back-navigation; siblings filter uses `gender === 'sibling_group'` ✅
  - DashboardPage: status stats, expiring consent alerts, inquiry count, profile search, CSV exports — mobile-responsive header ✅
  - ProfileFormPage: create + edit, interest tag picker, PII bio warnings, ICWA section; sibling group mode (driven by gender selector) with comma-separated names/ages, relabeled fields ✅
  - ProfileDetailPage: status/consent badges, consent record with signature image + language version + expiring-soon detection, action buttons (mobile-stacked), inline media, archive, inquiry list ✅
  - ConsentFormPage: canvas draw signature, youth assent + ICWA conditional fields, Nebraska draft language ✅
  - AdminUsersPage: list users by state, approve / deactivate, role change, requested role shown on pending users — mobile-stacked rows; **Invite user** button + modal (name/email/role → Cloud Function → invitation email) ✅
  - RegisterPage: self-service registration with role selector (caseworker or supervisor), pending approval flow, fires admin notification on submit ✅
  - FamilyRegisterPage: self-service family account at `/register/family`, auto-approved ✅
  - StateConfigPage: branding, consent model, SSO config ✅
  - FavoritesPage: saved profiles for family users ✅
  - AccountSettingsPage (`/settings`): display name update (Auth + Firestore) + password change (reauthenticate → updatePassword) ✅
- **MediaUpload component:** react-dropzone, per-file progress bar, photo + video ✅
- **InquiryModal:** public gallery CTA, writes to Firestore, triggers caseworker notification ✅
- **Toast system:** Radix Toast, success/error/info ✅
- **Firestore security rules:** full audit, notification sentinel rules for admin-targeted notifications ✅
- **Firestore indexes:** children (status+age, status+gender, status+lastUpdatedAt) + notifications (userId+read+createdAt) ✅
- **Storage rules deployed** ✅
- **Sibling group model:** single-profile model — `gender: 'sibling_group'` drives category filtering, comma-separated names/ages embedded in one Firestore doc, old cross-link system removed ✅
- **Emulator seed script, admin bootstrap script, platform admin live** ✅
- **Error boundary + `window.onerror`/`unhandledrejection` handlers** in `main.tsx` and `index.html` — white screen → readable error message ✅
- TypeScript: 0 errors ✅
- **Deployed:** https://spencers-home-dev.web.app ✅

**Next session — in order:**
1. Walk the core loop end-to-end on both desktop and mobile
2. Strip SSO from login page and state config UI
3. Empty gallery state polish + console error audit
4. First demo prep: decide which state admin account to use for walkthrough
5. Consider `pt-10` on public pages if staff preview bar overlaps hero content during walkthrough
6. Upgrade invitation email: add state name, branding color, and a cleaner HTML template when a sending domain is verified

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

### Consent Language — Nebraska Draft v1 (2026-04-09 → updated 2026-04-09)
Consent form now contains Nebraska-specific draft language (`consentLanguageVersion: 'ne-draft-v1'`). Cites Neb. Rev. Stat. § 43-104 et seq. (legal basis), § 84-712.05 (PII), Title IV-E Plan, and DHHS Policy Manual Ch. 7. Covers scope of authorization, duration/renewal, and right to withdraw. Amber banner and italic footer both name Kirsten Manert (Nebraska DHHS Recruitment) as the required sign-off contact. Must not be used with real child data until DHHS written approval is obtained.

### Real-Time Listeners as Default for Child Data (2026-04-12)
All hooks that read child profiles (`usePublishedChildren`, `useAllChildren`, `useChild`) use `onSnapshot` real-time subscriptions, not one-shot fetches. Service layer exposes `subscribeToChildren`, `subscribeToPublishedChildren`, `subscribeToChild` — hooks call these and return the unsubscribe function from `useEffect` cleanup. One-shot service functions (`listChildren`, `listPublishedChildren`, `getChild`) are retained for any future non-hook use. `reload()` is kept as a no-op in hook return values for backwards compatibility with existing callers.

### Fixed Interests List (2026-04-09)
18-item fixed list in `constants.ts`. Chosen for consistency in future gallery filtering. State-specific customization deferred to Phase 2 state config panel.

### State Config Stored at states/{stateId} Document (2026-04-09)
State configuration (`StateConfig`) is stored directly on the `states/{stateId}` Firestore document. Subcollections (`children`, `consents`) live beneath it. `getStateConfig` / `saveStateConfig` in `services/stateConfig.ts` use `setDoc` with `merge: true` to preserve fields not in the form (galleryTiers, logoUrl, additionalRules). Config writes produce a `state_config_updated` audit log entry.

### Inquiry Reads — Subcollection, Caseworker-Visible (2026-04-09)
`getInquiries(stateId, childId)` reads `states/{stateId}/children/{childId}/inquiries` ordered by `submittedAt desc`. ProfileDetailPage fetches and renders the list only when `child.inquiryCount > 0`. Email displayed as a mailto link for caseworker follow-up.

### Emulator Seed Script — Firebase REST API, No Admin SDK (2026-04-09)
`scripts/seed-emulator.ts` uses the Firestore and Auth emulator REST APIs directly — no `firebase-admin` required. Run with `npx tsx scripts/seed-emulator.ts` (requires `npm install -D tsx`). Serialization uses `serializeValue()` + `serializeFields()` helpers to produce correct Firestore typed-value format. Seeds: NE state config, 3 users (caseworker / supervisor / state_admin), 4 child profiles at various statuses, 2 consent records, 2 inquiries.

### Storage Rules — Auth Enforced, stateId at Service Layer (2026-04-09)
Firebase Storage rules cannot do Firestore lookups, so stateId matching is enforced in `storage.ts` (service layer), not in storage rules. Storage rules enforce: authenticated user, MIME type (image/* or video/*), max 500 MB.

### Public Inquiries — No Auth Required (2026-04-09)
Inquiry creates (`states/{stateId}/children/{childId}/inquiries`) are allowed without authentication in Firestore rules. Rationale: families browsing the gallery should be able to submit interest without creating an account. Inquiries are read-only for caseworkers, append-only, never updatable or deletable.

### Caseworker Registration — Pending Approval Flow (2026-04-09)
New users self-register via `/register`. Firebase Auth account is created immediately; Firestore user doc is set with `active: false`. State admin approves via `/admin/users`. RequireAuth shows a pending-approval wall for `active: false` users rather than redirecting to login.

### ReactPlayer v3 Type Workaround (2026-04-09)
react-player v3 ships narrowed types that omit `url` from the public props interface. ProfileCard uses a local `Player` alias typed with the props actually needed. This is isolated to one file and explicitly commented.

### Notifications — State-Scoped Subcollection (2026-04-09)
Inquiry notifications stored at `states/{stateId}/notifications/{notifId}`. Written without auth (same public-create pattern as inquiries) so the notification is created at the same time as the inquiry. Owner-only read/update in Firestore rules. `subscribeToNotifications()` uses a real-time `onSnapshot` listener filtered to `userId == currentUser && read == false`. Caseworker gets the `createdBy` UID on the child profile passed through `InquiryModal` as `caseworkerUserId`.

### Family Role — Auto-Approved, Separate Registration Path (2026-04-09)
`UserRole` extended with `'family'`. Family users register at `/register/family`, set `active: true` immediately (no admin approval needed). They are gated out of all caseworker routes — `AuthShell` now passes `allowedRoles: CASEWORKER_ROLES` and `RequireAuth` redirects family role to `/` instead of `/dashboard`. AppShell hides Dashboard and admin links for family users, shows Saved link instead.

### Favorites — users/{userId}/favorites Subcollection (2026-04-09)
Favorites stored at `users/{userId}/favorites/{childId}`. Document contains `childId`, `stateId`, `childFirstName`, `savedAt`. Firestore rules: owner-only read/write. `useFavoriteToggle` uses a module-level `Set<string>` + listener array to keep all ProfileCard instances in sync without a context provider or extra Firestore reads. Resets on page load.

### AdoptUSKids Export — Client-Side CSV (2026-04-09)
Export button in Dashboard (state_admin / platform_admin only) generates CSV in-browser from the already-loaded `children` array. No backend call. Fields: first_name, age, gender (blank for undisclosed), interests (semicolon-delimited), bio. Filename includes ISO date. Button disabled when no published profiles exist.

### Admin Notification Sentinel Pattern (2026-04-12)
Registration notifications can't target specific admin userIds at registration time (newly registered user can't query other users per Firestore rules). Solution: write notification with `userId: 'admin:{stateId}'` sentinel. State admins subscribe to both their own userId and the sentinel via `where('userId', 'in', [...])`. Firestore rules updated to allow state_admin read/update of sentinel notifications for their state. `Notification` type extended with optional `type` ('inquiry' | 'registration') and `message` fields; inquiry-specific fields (`childId`, `childFirstName`, `inquirerName`) made optional.

### Sibling Group Model — Single Profile, Not Cross-Linked Documents (2026-04-13)
Sibling groups are represented as a single `ChildProfile` document with `gender: 'sibling_group'`. First names and ages are comma-separated strings (`firstName`, `ages` fields). The old cross-link model (`siblingGroupIds[]` arrays, `linkSibling`/`unlinkSibling` Firestore transactions) is removed. Rationale: a child in a sibling group is never also listed as an individual — the group is the unit of placement, so a single profile is the correct model. Gallery filter (`category=siblings`) checks `child.gender === 'sibling_group'`; `category=individuals` excludes that value. Nonbinary and undisclosed children appear under individuals and "meet our kids" naturally. The `ages` field is optional and only meaningful for sibling group profiles.

### Consent "Expiring Soon" — Client-Side Computed (2026-04-12)
No Firestore schema change. `isExpiringSoon` is computed on ProfileDetailPage from the already-loaded `consentRecord.expiresAt`: active consent expiring within 30 days shows amber "Expiring Soon" badge instead of green "Active". The `consentStatus` field in Firestore remains 'active' — only the display changes.

### Email on Approval — Deferred (2026-04-12)
Cloud Functions not initialized. Decision: defer until a real sending domain is set up (needed anyway for branded Auth emails). At that point, set up SendGrid + custom SMTP for all Auth emails in one pass. Interim workaround: approval toast reminds admin to notify the user manually.

### Admin-Invited Users — Cloud Function + Resend (2026-04-13)
State admin can create user accounts directly via "Invite user" modal on AdminUsersPage. Flow: admin fills name/email/role → `inviteUser` Cloud Function (Firebase Functions v2, us-central1) creates Auth account, writes Firestore user doc (`active: true`, `createdBy` caller uid), writes audit log entry (`user_created`), calls `admin.auth().generatePasswordResetLink()` for the setup URL, sends a custom invitation email via Resend using `onboarding@resend.dev`. Email copy reads as onboarding ("You've been added to Spencer's Home") not password recovery. RESEND_API_KEY stored in Google Cloud Secret Manager via `firebase functions:secrets:set`. Functions emulator wired to port 5001. Node 20 deprecation warning noted — upgrade needed before 2026-10-30.

---

## Historical Log

### 2026-04-13 — Error boundary + mobile Chrome white screen diagnosis

Mobile Chrome showed a blank white screen while Edge on the same device worked. Root cause: stale cached JS chunks from a previous deploy — Chrome served old broken files while Edge had fetched fresh ones. Resolved by clearing browser history/cache on the phone; no code changes were needed for the underlying issue.

Added permanent diagnostic scaffolding:
- `ErrorBoundary` class component in `main.tsx` wrapping the entire app — any React render error now shows a readable message instead of a blank screen
- `window.onerror` and `window.addEventListener('unhandledrejection')` in `index.html` — catches errors that occur before React mounts (module load failures, syntax errors, Firebase init crashes)

Both are intentionally kept in production. The cost is negligible and the debugging value is high.

---

### 2026-04-13 — Sibling group model redesign + hamburger Home link

**Sibling group model replaced:**
Removed the cross-linked individual profile model (`siblingGroupIds[]`, `linkSibling`, `unlinkSibling`). A sibling group is now a single `ChildProfile` document where `gender === 'sibling_group'`. `Gender` type extended with `'sibling_group'`; `ages?: string` field added to `ChildProfile`; `siblingGroupIds` removed. `GENDER_OPTIONS` in constants gets a "Sibling group" entry, which drives the entire form behavior.

**ProfileFormPage:** Gender selector (now labeled "Profile type") shown first. When "Sibling group" is selected: "First name" → "First names" with comma/and hint (e.g. Emma, Liam, and Sofia); age field replaced by "Ages" text input with comma hint; bio and interests sections relabeled. Works in both create and edit mode.

**Gallery/display:** `GalleryPage` `category=siblings` filter now checks `gender === 'sibling_group'`; `category=individuals` excludes sibling group profiles. `ProfileCard` shows comma-separated ages and an amber "Sibling group" badge for group profiles. `PublicProfilePage` shows ages from `ages` field and a placement-together notice. `ProfileDetailPage` header shows "Sibling group · Ages: …" for group profiles; sibling picker section removed entirely.

**Hamburger Home link:**
Added "Home" as the first item in the mobile hamburger menu dropdown in `AppShell`, visible to all signed-in roles. Uses `NavLink` with `end` prop so it only activates on the exact `/` route.

TypeScript: 0 errors.

---

### 2026-04-13 — Admin-invited user flow: Cloud Functions + Resend

First server-side code in the project. Introduced Firebase Cloud Functions v2 (`functions/` directory, TypeScript, Node 20) and Resend for transactional email.

**`inviteUser` Cloud Function (`functions/src/index.ts`):**
Callable function. Validates caller is `state_admin` or `platform_admin` server-side (Admin SDK bypasses Firestore rules — server-side role check is mandatory). Creates Firebase Auth user, writes Firestore user doc (`active: true` — no approval step needed for admin-created accounts), writes `user_created` audit log entry, generates a password-setup link via `admin.auth().generatePasswordResetLink()`, sends invitation email via Resend. RESEND_API_KEY injected via `defineSecret()` from Google Cloud Secret Manager.

**Email framing:**
Intentional decision: email copy says "You've been added to Spencer's Home — click to set up your account" rather than "reset your password." Same Firebase mechanism, custom email send from the function. Avoids confusing caseworkers (who have never had an account) with recovery language.

**AdminUsersPage:**
Added "Invite user" button to page header. Modal collects name, email, role (caseworker/supervisor/state_admin). Calls `httpsCallable(functions, 'inviteUser')`. Loading, success toast, and error states handled. New user appears in the active user list immediately via existing real-time listener.

**Infrastructure:**
`firebase.json` updated with functions source + Functions emulator (port 5001). `src/config/firebase.ts` exports `functions` instance, connects to emulator when `VITE_USE_EMULATORS=true`. Deployed to `spencers-home-dev`. Cleanup policy set (`--force`).

TypeScript: 0 errors (frontend + functions).

---

### 2026-04-12 — Staff preview bar on public pages

Added `StaffPreviewBar` component for logged-in staff browsing public pages (`/`, `/gallery`, `/c/:stateId/:childId`). Fixed 40px bar pinned to top of viewport (`position: fixed, z-50`) with `bg-brand-900` background: "Viewing public site" left, "Back to Dashboard" link right. Renders only for the 5 staff roles; returns `null` while auth is loading and for anonymous/family visitors. No changes to AppShell, public page layouts, or staff route wrapping. Injected via fragment in each public `<Route>` element in `App.tsx`.

Also updated Save Project protocol: now deploys to Firebase Hosting (`firebase deploy --only hosting`) as step 6, so the live site refreshes every session.

---

### 2026-04-12 — Mobile polish: hamburger nav, gallery scroll persistence, responsive admin pages

Confirmed landing page and gallery look great on device. Fixed two issues reported from phone testing.

**Gallery scroll/filter persistence (GalleryPage):**
Gallery filters (age, gender, video) now persist to `sessionStorage` on every change and are read back on mount. Scroll Y position is saved on every scroll event and restored via `requestAnimationFrame` after data loads. Result: hitting browser back from a profile returns to the exact scroll position and filter state.

**AppShell hamburger menu:**
At `< md` (768px), nav links hidden and replaced with a hamburger icon. Tapping opens a 56-width dropdown panel containing all nav links, username/role (links to Settings), and Sign out. Panel auto-closes on outside tap, link click, or route change. Bell notification icon remains always visible. Desktop layout unchanged.

**DashboardPage mobile:**
Header now stacks vertically on mobile (`flex-col sm:flex-row`). Export button labels shorten to "AFCARS CSV" / "AdoptUSKids CSV" on mobile (prefix `hidden sm:inline`). Button group uses `flex-wrap` to prevent overflow.

**AdminUsersPage mobile:**
Both pending-approval and active user rows now use `flex-col sm:flex-row` so user info stacks above the role selector and action buttons on narrow screens.

**ProfileDetailPage mobile:**
Action button group (Edit / Submit for review / Add consent / Publish) stacks below the child name on mobile (`flex-col sm:flex-row`), removing the cramped justify-between layout.

Deployed to https://spencers-home-dev.web.app. TypeScript: 0 errors.

### 2026-04-12 — UX gap pass: consent viewing, registration role, admin notifications, settings, sibling groups

Systematic pass through 5 UX gaps identified during product review. All shipped in one session, 0 TypeScript errors throughout.

**Gap 4 — Consent record viewing (ProfileDetailPage):**
Added "Expiring Soon" amber badge (active consent within 30 days, client-side computed). Rendered signature image (`formData.signatureDataUrl` base64 PNG) in consent card. Added consent language version row.

**Gap 2 — Role selector at registration:**
RegisterPage now lets registrants choose Caseworker or Supervisor. Stored in Firestore as `role` (still `active: false`, still requires admin approval). Firestore `allow create` rule updated from `role == 'caseworker'` to `role in ['caseworker', 'supervisor']`. AdminUsersPage pending section shows "Requested: [role]" label so admin knows what was asked for.

**Gap 5 — Admin notification on new registration:**
Used sentinel pattern (`userId: 'admin:{stateId}'`) since newly registered users can't query other users. `createRegistrationNotification` written to notifications service. `subscribeToNotifications` updated to accept optional admin sentinel, uses Firestore `in` query. `useNotifications` hook passes sentinel for admin roles. Firestore rules updated. Bell notification click routes to `/admin/users` for registration type.

**Gap 1 — Account settings page:**
New `/settings` page (AccountSettingsPage). Display name updates both Firebase Auth profile and Firestore user doc. Password change uses `reauthenticateWithCredential` + `updatePassword` with typed error handling. User's name in AppShell nav now links to `/settings`.

**Gap 3 — Sibling group management:**
`linkSibling` and `unlinkSibling` added to children service using Firestore transactions for bidirectional consistency. Sibling Group card added to ProfileDetailPage: shows linked siblings with links + Remove buttons; search-by-name picker (min 2 chars, top 5 results). Public profile sibling notice updated to include group size.

**Gap 6 — Email on approval — deferred:**
Cloud Functions not set up. Decided not to initialize for v1 — volume too low to justify the infrastructure. Added "remember to notify them by email" reminder to approval toast in AdminUsersPage instead.

### 2026-04-12 — Notifications index added; core loop pre-walk complete

**Pre-walk audit:**
Full code review of all five core loop steps (consent → publish → browse → inquire → notify). Every step reviewed: ConsentFormPage, ProfileDetailPage publish flow, GalleryPage, PublicProfilePage inquiry form, notifications service and bell. Code and Firestore rules confirmed correct for all steps.

**Missing composite index on `notifications`:**
`subscribeToNotifications` queries `userId == X AND read == false ORDER BY createdAt DESC` — a three-field compound query. No composite index existed for the `notifications` collection in `firestore.indexes.json` or in the deployed project. Without it, the `onSnapshot` listener fails silently (no error handler) and the bell never rings. Added the index (`userId ASC, read ASC, createdAt DESC`) to `firestore.indexes.json` and deployed via `firebase deploy --only firestore:indexes`.

**Core loop walk prepared:**
Step-by-step run order documented: caseworker window (create + consent), supervisor window (publish), anonymous incognito window (browse + inquire), caseworker window (bell notification). All known blockers cleared.

### 2026-04-11 — Core loop unblocked: profile create + media upload working

**platform_admin `stateId` patched:**
Bootstrap script (`scripts/bootstrap-admin.ts`) was missing `stateId` on the user doc it wrote. This caused two failures: (1) `collection(db, 'states', '', 'children')` — 2-segment path, Firestore rejected it with "odd number of segments" error; (2) media upload never appeared because the create failed before reaching the detail page. Fixed by running `scripts/patch-admin-stateid.ts` against the live project (adds `stateId: 'ts'` to `users/EoCy0vcpn8RIucC5bsRuOOhn3ak2`). Bootstrap script also updated to include `stateId` going forward.

**`createChild` — undefined field guard:**
`ProfileFormPage` was passing `videoUrl: undefined` and `consentId: undefined` to Firestore on create. Firestore rejects explicit `undefined` values in `addDoc`. Fixed two ways: (1) payload construction uses spread conditionals to omit undefined optional fields; (2) `createChild()` in `services/children.ts` now strips undefined values before the `addDoc` call.

**MediaUpload added to edit form:**
MediaUpload component was only on ProfileDetailPage. Added it to `ProfileFormPage` (edit mode only — requires an existing `child` object for stateId/childId). Appears below the ICWA section. Create mode still redirects to detail page after save where upload is also available.

**`stateId` guard on form submit:**
Added an early return with a user-facing toast if `stateId` is empty, replacing the cryptic Firestore error.

**Profile create confirmed working on live URL.**

---

### 2026-04-11 — Landing page + gallery UI polish

**Dependencies added:** `framer-motion` v12 installed.

**GalleryPage masonry layout:**
Replaced the CSS `grid` with native CSS `columns-1 sm:columns-2 lg:columns-4`. Each card wrapped in `break-inside-avoid` div with `mb-6` spacing. No external library — achieves the same staggered masonry look as `react-masonry-css` with zero dependency overhead.

**LandingPage — hero scroll animation:**
Hero content (`motion.div`) now uses `useScroll` + `useTransform` to fade opacity 1→0 and scale 1→0.95 over the first 200px of scroll. Blurred background layer stays fixed, creating a parallax-like depth effect as content fades.

**LandingPage — copy updates:**
- "Our Story" body copy replaced with new mission-focused text (provided by Jason): opens with the invisibility problem, Spencer's Home as the fix, and closes with the Spencer origin story.
- 3 stat cards updated: `440→146 / 50+ / 100%` replaced with `70,000+ children / 3 years / 1 mission`.

**LandingPage — visual polish:**
- Hero photo frame: widened to `w-80`, shortened to `h-[12.5rem]`, `object-right` to show background people.
- Stat cards: switched from washed `bg-amber-50` to `bg-white` with `shadow-md` — more presence.
- Category card labels ("Individuals" etc.): `text-base` → `text-2xl`.
- Category cards: stronger shadow, border, padding, and hover lift.
- Hero z-index layering fixed: hero `z-10`, cards `z-20`, button wrapper `z-30`.
- Removed subheadline paragraph from hero — cleaner, less noise.

### 2026-04-11 — platform_admin login debugging

**Login credentials confirmed valid via Firebase REST API** — `signInWithPassword` returns success with correct uid. The issue is post-login, not auth.

**Suspected cause:** `platform_admin` user doc was written without a `stateId` field. `DashboardPage` passes `user?.stateId ?? ''` to `useAllChildren`, which queries `states/{stateId}/children` — empty string returns nothing but may not crash. More likely crash point: Firestore security rules call `userDoc().stateId` inside `userStateId()` helper — if that field is missing, `get()` on the user doc may fail or return undefined, causing a rules evaluation error and blocking the read of state data.

**Next step:** Try incognito window. If white screen after login, add `stateId: 'ts'` to `users/{uid}` doc in Firebase Console or update bootstrap script.

---

### 2026-04-12 — Role enforcement, gallery wired to test state, media upload fixed

**Users tab "failed to load" fixed:**
Firestore rule on `/users/{userId}` only allowed `request.auth.uid == userId` (self-read). Collection queries from admin pages hit every doc in the result set, all of which fail that check. Added `|| isPlatformAdmin()` and `|| (isStateAdmin() && resource.data.stateId == userStateId())` to the read rule. Deployed.

**Test supervisor account created:**
`supervisor@spencershome.org` / `TestSuper123!` — role: supervisor, stateId: ts. Created via `scripts/create-test-supervisor.ts`.

**Publish locked to supervisor+ only:**
`canPublish` in `ProfileDetailPage` now checks `user.role in ['supervisor', 'agency_admin', 'state_admin', 'platform_admin']`. Same check added to Firestore rules: a `status` transition to `published` requires supervisor+ role server-side. Caseworkers can create and edit profiles but cannot publish.

**Gallery was showing empty (wrong stateId):**
`VITE_DEFAULT_STATE_ID` was set to `NE` but all test data is under stateId `ts`. Changed to `ts` in `.env.local`. Gallery and public profile page now query Test State correctly.

**Media uploads writing 0 bytes:**
`uploadBytesResumable` was consistently producing 0-byte objects in Firebase Storage despite returning a token URL and firing the `complete` callback. Switched to `uploadBytes` (simple single-request upload). Added a guard that throws if `file.size === 0` before attempting the upload. Root cause was confirmed via `curl` — stored content length was 0 on every file.

**Storage CORS configured:**
Firebase Storage bucket had no CORS policy, blocking browser `GET` requests from unauthenticated gallery pages. Set via Admin SDK: origin `*`, methods `GET HEAD POST PUT DELETE`, required headers for Firebase upload protocol.

**Storage rules opened for public read:**
Previously required `request.auth != null` for reads. Gallery and public profile pages are unauthenticated, so all `<img>` and `<video>` loads were blocked. Changed to `allow read: if true`. Write/delete remain auth-gated. Paths are non-guessable (Firestore-generated child ID + timestamp filename).

**ReactPlayer replaced with native `<video>`:**
ReactPlayer v3's `Preview` component (`light` prop) silently fails to display the thumbnail for non-YouTube/Vimeo URLs — it tries an oEmbed fetch which returns nothing for Firebase Storage URLs, and the `useEffect` dependency array bug means the fallback image is never set. Replaced with `<video src poster controls>` in both `ProfileCard` and `PublicProfilePage`. Simpler, no dependency, works correctly with direct Firebase Storage URLs.

### 2026-04-12 — Architecture manifesto + 8 cross-role bug fixes

**Root cause investigation:** Full codebase audit across all pages, hooks, services, and Firestore/Storage rules. Found two systemic failure patterns: (1) one-shot fetches producing stale UI after writes, and (2) silent error swallowing hiding real failures.

**Architecture Manifesto created (`docs/ARCHITECTURE_MANIFESTO.md`):**
Pre-flight protocol requiring an Impact Analysis in plain English before any new feature code is written. Covers: role impact check, signed URL rule, Firestore write requirements (stateId + rule + audit log), real-time listener requirement, layer boundaries (pages/hooks/services), loading/error states, and a self-correction gate. `CLAUDE.md` updated to reference it as a mandatory pre-task read.

**All child data hooks converted to real-time `onSnapshot` listeners (`hooks/useChildren.ts`):**
`usePublishedChildren`, `useAllChildren`, and `useChild` previously used one-shot `getDocs`/`getDoc` fetches. After any write (create, publish, upload), the UI only updated if `reload()` was called explicitly — and only if the call wasn't missed. Converted all three to `onSnapshot` subscriptions via new service functions (`subscribeToChildren`, `subscribeToPublishedChildren`, `subscribeToChild` in `services/children.ts`). Unsubscribe returned from `useEffect` cleanup. `reload()` kept as a no-op for backwards compat with callers.

**Photo upload overwrite risk fixed (`components/profile/MediaUpload.tsx`):**
Photo append used `{ photoUrls: [...child.photoUrls, url] }` — a spread of the prop snapshot. Under concurrent or fast sequential uploads, stale snapshot could overwrite a previously uploaded URL. Fixed with Firestore `arrayUnion` via new `addPhotoUrl()` in `services/children.ts`. Writes are now atomic appends.

**Sponsor logo fetch error no longer swallowed silently (`pages/LandingPage.tsx`):**
`.catch(() => { /* non-critical */ })` replaced with `console.error(...)`. Failure is now visible in devtools — diagnosable instead of invisible.

**Consent and inquiry fetch errors surfaced (`pages/ProfileDetailPage.tsx`):**
Both `useEffect` blocks had `.catch(() => undefined)` — permission errors and network failures were completely invisible. Changed to `console.error`. Inquiry section now has its own `inquiriesLoading` boolean — previously showed "Loading…" indefinitely if the fetch completed but returned empty (data inconsistency).

**State config logo upload — user warned to save (`pages/StateConfigPage.tsx`):**
Logo uploads immediately to Storage but URL only persists on form submit. If the user navigated away without saving, the URL was silently lost. Toast changed from "Logo uploaded" to "Logo uploaded — click Save configuration below to apply it."

**Firestore rule — state admin can no longer modify platform_admin accounts (`firestore.rules`):**
`isStateAdmin()` update rule was missing a guard on the existing resource role. A state admin could set `active: false` on a platform_admin. Added `resource.data.role != 'platform_admin'` so neither deactivation nor role change is permitted on platform_admin accounts by anyone below platform_admin.

**Platform admin shown as read-only in user management (`pages/AdminUsersPage.tsx`):**
`ASSIGNABLE_ROLES` didn't include `platform_admin`, so platform admins appeared in the user list with the dropdown defaulting to "Caseworker" — visually wrong and potentially confusing. Now renders a read-only purple "Platform Admin" badge with no dropdown and no deactivate button for that role.

---

### 2026-04-12 — Sponsor management built and deployed

**Sponsor data model:** New top-level Firestore collection `/sponsors/{sponsorId}`. Fields: `name`, `logoUrl`, `linkUrl?`, `order`, `active`, `uploadedBy`, `createdAt`. Platform-level (not per-state) since the landing page is global.

**`AdminSponsorsPage` (`/admin/sponsors`):** Platform_admin-only page. Add sponsors (name + logo upload + optional link URL + display order), toggle active/hidden, delete. Logos uploaded to Firebase Storage at `sponsors/{fileName}`. Accessible from a "Sponsors" button in the Dashboard header for platform_admin.

**LandingPage wired to Firestore:** `getActiveSponsors()` called on mount. Renders logos in order; falls back to placeholder grid if none exist. Logos are links if `linkUrl` is set. Composite index issue avoided by fetching all sponsors ordered by `order` and filtering `active` client-side.

**Firestore rules:** Added `/sponsors` — `allow read: if true` (public, landing page is unauthenticated), `allow write/delete: if isPlatformAdmin()`. Deployed.

**Storage rules:** Added `sponsors/` path (public read, auth write, image-only, 10 MB max). Also added previously missing `states/{stateId}/branding/` rule that covers agency logo uploads from StateConfigPage. Deployed.

**Landing page polish:** "Our Partners & Sponsors" heading enlarged to `text-3xl`. Sponsor logo containers increased to `w-72 h-40` / `max-h-32`. Removed "In partnership with Arkansas Project Zero" from footer.

---

### 2026-04-11 — Storage live + platform_admin bootstrap

**Firebase Storage initialized and rules deployed:**
Storage bucket initialized in Firebase Console (test mode → immediately overwritten by `firebase deploy --only storage`). Auth-enforced storage rules are now live. Media uploads will work on the live URL.

**Admin bootstrap script (`scripts/bootstrap-admin.ts`):**
New script using `firebase-admin` SDK (bypasses Firestore security rules — required because no existing platform_admin can approve the first one). Takes a service account key path as argument. Creates:
- Firebase Auth user + Firestore user doc with `role: platform_admin`
- Test State config at `states/ts` with amber branding

Script run against live project. Platform admin now exists:
- Email: `jason@spencershome.org` / uid: `EoCy0vcpn8RIucC5bsRuOOhn3ak2`
- Password: `ChangeMe123!` — **must be changed before any demo**

`firebase-admin` added as dev dependency (bootstrap script only — not bundled into the app).

**Service account key:** Downloaded to `~/Downloads/` — not committed. Do not move into the project directory.

---

### 2026-04-11 — v1 deployment + build fixes

**App is live:** https://spencers-home-dev.web.app. Firestore rules deployed. Storage not yet initialized (manual step needed).

**Build fixes (6 TypeScript errors + 2 config errors):**
- `tsconfig.app.json`: removed deprecated `baseUrl` (TypeScript 6.0 — `paths` no longer requires it in bundler mode)
- `vite.config.ts`: `manualChunks` converted from object to function (Rollup 4 / Vite 8 API change)
- `audit.ts`: added `'state'` to `targetType` union (was missing; blocked sso.ts and stateConfig.ts)
- `ConsentFormPage.tsx`: Zod v4 API change — `errorMap` renamed to `error` on `z.literal()`
- `ProfileFormPage.tsx` + `StateConfigPage.tsx`: `z.coerce.number()` returns `unknown` input type in Zod v4, causing react-hook-form resolver mismatch — fixed with `as Resolver<FormValues>` cast
- `RequireAuth.tsx`, `RegisterPage.tsx`, `consent.ts`, `StateConfigPage.tsx`: removed unused imports/variables flagged by strict TypeScript
- `useNotifications.ts`: removed `user.role === 'family'` check (`'family'` removed from `UserRole` union)

**Environment decisions:**
- `.env.local` had trailing commas on all values (would have corrupted API keys in production) — stripped
- Decided to use `spencers-home-dev` as v1 production project (no separate prod project yet). Prod/dev split added to PRD backlog — trigger is first real state contract.
- `CLAUDE.md` updated: "Save Project" now includes `git push` as step 5

**Hero image fix:**
Image uploaded as `hero.jpg` but was actually PNG data — browsers reject mismatched extension/format. Renamed to `hero.png`, updated two references in `LandingPage.tsx`.

**Remaining before full v1:**
- Firebase Storage needs manual initialization in Console before storage rules can deploy and media uploads work
- Task 2 (platform_admin bootstrap + test state) not yet done
- Tasks 3–5 (SSO UI strip, sponsor logos, polish) not yet done

### 2026-04-10 — GTM breakthrough + public landing page + brand overhaul

**Partnership confirmed:** Arkansas Project Zero director agreed to partner. She handles outreach to each state's DHS/DHHS; Jason owns all infrastructure and product build. This is the distribution channel — she has existing relationships with state child welfare agencies across the country. Nebraska is no longer the anchor state. Platform must be generalized for any state from day one.

**Brand overhaul (3 files):**
- `index.css`: Default brand palette swapped from cold sky-blue to warm amber (50/100/500/600/700/900 CSS custom properties). Background changed from cool `#f9fafb` to warm `#faf9f7`. Font stack updated to Nunito first.
- `index.html`: Google Fonts preconnect + Nunito (400/500/600/700) loaded. Meta description made state-agnostic (removed Nebraska-specific copy).
- Rationale: Warm amber matches Project Zero's aesthetic (warm, community-nonprofit, child-centered) without copying any of their protected assets.

**Public landing page built (`src/pages/LandingPage.tsx` — new file):**
- Hero: full-width blurred background layer (same image scaled + CSS blur) + sharp foreground portrait (framed card) + warm dark gradient overlay + headline + CTA. Image source: `public/hero.jpg` — Jason to drop photo there.
- 4 category cards: Individuals, Siblings, Boys, Girls — each linking to `/gallery?category=X` with inline SVG icons and hover animation.
- About section: fabricated partnership copy (Project Zero collaboration story, Spencer's origin, mission). Includes 3 stat callout cards (440→146, 50+ states, 100% dignity-first). All copy is placeholder-ready for Jason to edit.
- Sponsors section: 6 dashed placeholder slots in a responsive grid. Replace `<div>` with `<img>` per sponsor added.
- Footer: copyright + Project Zero attribution link.
- Top nav: transparent over hero — logo text, Sign in, Create account links.

**GalleryPage moved to `/gallery` (updated):**
- Added `useSearchParams` to read `?category=` param.
- Category pre-filter applied before manual filters: `individuals` (no siblingGroupIds), `siblings` (has siblingGroupIds), `boys` (gender=male), `girls` (gender=female).
- Header title updates dynamically: "Meet Our Boys", "Meet Our Siblings", etc.
- "← View all children" breadcrumb shown when category is active.

**App.tsx:** `/` → `LandingPage`, `/gallery` → `GalleryPage`. LandingPage lazy-loaded.

**AppShell:** Gallery nav link updated from `/` to `/gallery`.

**No scope changes to PRD phases. GTM section updated in PRD to reflect Project Zero partnership and multi-state-first direction.**

### 2026-04-10 — Product orientation deep-dive (no code changes)

**Session type:** Knowledge/orientation — no files modified.

Full product deep-dive written for offline study. Covered: mission and benchmark (AR Project Zero), three personas (caseworker/admin, family, anonymous visitor), the core loop (create → consent → publish → archive), the family workflow (browse → inquire → save), state admin workflows (dashboard, user approval, state config panel), auth and role routing architecture, Firestore data model, media storage privacy architecture, consent architecture (transaction gate, expiry, NE draft v1 status), frontend stack and code splitting, service layer pattern, and business/GTM context.

ARCHITECTURE.md opened and referenced as source of truth for diagrams.

**No scope or requirement changes. Phase 4 remaining items unchanged:**
1. First-admin bootstrap fix (no existing admin to approve first signup)
2. SSO end-to-end test (scaffold done, Firebase SAML provider not yet enabled)
3. Nebraska consent form v2 (blocked — awaiting DHHS written approval from Kirsten Manert)

### 2026-04-09 — Bug fix + onboarding gap identified

**LoginPage parse error fixed:**
SSO block was a sibling of `<form>` inside a ternary true-branch without a fragment wrapper — OXC parser rejected it. Wrapped both in `<>...</>`. 0 TypeScript errors.

**First-admin bootstrap gap identified:**
Caseworker self-registration sets `active: false` pending approval. There is no existing admin to approve the very first signup, creating a chicken-and-egg. Current workaround: manually set `active: true` + `role: state_admin` + `stateId` in Firebase Console. This needs a proper fix — options: a one-time bootstrap route, a Firebase Admin SDK script, or a platform_admin seed step. Defer to next session.

**UX orientation:**
Full screen map and user flow documented in session. Three personas: caseworker/admin, family, anonymous visitor. Core caseworker loop: create profile → consent form → publish → family inquires → caseworker notified. Profile cannot publish without active consent (enforced at service layer).

### 2026-04-09 — Phase 4: AFCARS export + white-label branding

**AFCARS-ready CSV export — DashboardPage:**
`exportAFCARS()` added alongside the existing AdoptUSKids export. Exports all non-archived profiles. Maps to federal AFCARS adoption file field names (45 CFR Part 1355): `RPTFIPS` (stateId), `AFCARSID` (child.id), `REPDATMO/YR` (reporting period), `SEX` (1/2/99), `ICWAELIG` (1/2). Includes platform-specific reference columns (status, consent status, listed date, view/inquiry counts). Unmapped fields (DOB, race/ethnicity, FCID, legal dates) export as blank columns — tooltip and column headers note that these must be completed before federal submission. Button gated to state_admin+, disabled when no active profiles exist.

**White-label branding — dynamic CSS custom properties:**
Tailwind `brand-*` colors switched from hardcoded hex values to CSS custom properties (`rgb(var(--brand-N) / <alpha-value>)`). Defaults defined in `index.css` (unchanged sky-blue palette). AppShell fetches state config on mount; `applyBrandColor(hex)` derives the 6-shade palette (50/100/500/600/700/900) from the stored primary hex using mix/darken math and sets `--brand-*` vars on `document.documentElement`. All existing `brand-*` Tailwind classes update automatically — no class changes required across the app.

**White-label branding — logo:**
AppShell shows `<img>` when `branding.logoUrl` is set, falls back to "Spencer's Home" text. StateConfigPage Branding card now includes: logo upload (PNG/JPG/SVG/WebP → `states/{stateId}/branding/logo_*` in Storage, token URL stored in `branding.logoUrl`), logo preview when set, and custom domain text field (`branding.customDomain` — stored for reference; DNS/Firebase Hosting config is separate). `uploadStateLogo()` added to `services/storage.ts`.

**Technical note — logo storage path:**
Logo stored at `states/{stateId}/branding/logo_{timestamp}_{filename}`. Same Storage auth rules apply (authenticated users only). No audit log entry for logo upload (not a child data event). Existing logo is replaced on each upload (no cleanup of old file — acceptable for now given infrequency of logo changes).

### 2026-04-09 — Phase 4 partial: SSO scaffold (SAML/OIDC)

**SSO scaffold — 6 files changed, 0 TypeScript errors:**
- `src/types/index.ts`: Added `SsoProvider` interface, `SsoProviderType`, and `user_sso_login` audit event type.
- `src/services/sso.ts` (new): `getSsoProvider` / `saveSsoProvider` (read/write `ssoProviders/{stateId}`), `initiateSsoSignIn` (stores pending stateId in sessionStorage → `signInWithRedirect`), `provisionSsoUser` (creates Firestore user doc on first SSO login with `role: caseworker, active: false`).
- `src/hooks/useAuth.ts`: In `onAuthStateChanged`, if Firebase user has no Firestore doc, checks sessionStorage for `sso_pending` and provisions via `provisionSsoUser`. Subsequent logins skip provisioning (doc already exists).
- `src/pages/StateConfigPage.tsx`: Added SSO section — provider type (SAML/OIDC), provider ID, display name, enable toggle. Saves to `ssoProviders/{stateId}` via `saveSsoProvider` alongside existing state config save.
- `src/pages/LoginPage.tsx`: State ID input below email/password form. 500ms debounce loads SSO config; if enabled shows "Sign in with [displayName]" button. Post-redirect: `useEffect` on auth store user redirects to dashboard.
- `firestore.rules`: Added `ssoProviders/{stateId}` — public read (needed for pre-auth SSO detection), state_admin write.

**Status:** Firebase SAML provider configured by Jason, not yet enabled. To activate: enable provider in Firebase Console → Authentication, then fill in provider ID in State Config page and check "Enable SSO".

### 2026-04-09 — Phase 4 partial: security audit + performance pass

**Firestore rules audit — 5 critical bugs fixed:**
- Self-registration was blocked: `allow create` on `/users/{userId}` required `isPlatformAdmin()`. Both registration pages (`RegisterPage`, `FamilyRegisterPage`) called `setDoc` directly. Fixed: users can create their own doc with role locked to `caseworker` or `family` — no self-escalation.
- State admin approval/role change was blocked: `setUserActive()` and `setUserRole()` use `updateDoc` on `/users/{userId}`. Fixed: state admins can now update users in their own state; cannot set `platform_admin` role.
- `stateConfig.ts` reads/writes `states/{stateId}` but rules only matched `stateConfigs/{stateId}` (dead path). Fixed: added `allow read/write` on the `states/{stateId}` document itself for state admins; removed dead `stateConfigs` block.
- Public `submitInquiry()` called `updateDoc` to increment `inquiryCount` on the child profile — blocked by caseworker-only update rule. Fixed: field-restricted public update path for `inquiryCount` (only +1, only that field).
- `recordProfileView()` called `updateDoc` for `viewCount` — same block. Fixed: field-restricted public update path for `viewCount`.

**Medium security fixes:**
- Notification update restricted to `['read']` field only via `affectedKeys().hasOnly(['read'])`.
- Consent update restricted to `['status', 'expiresAt']` — core fields (`signedBy`, `signedAt`, `formData`, `auditTrail`) now immutable post-creation.

**Bug fix — `setUserActive()` in `services/users.ts`:**
Was setting `lastLoginAt: serverTimestamp()` as a side effect of admin approval — made last-login timestamp reflect approval time, not actual login. Removed; unused `serverTimestamp` import cleaned up.

**Performance pass:**
- All 11 pages converted to `React.lazy()` in `App.tsx`. Single `<Suspense>` wrapper at route level. Public gallery visitors never download caseworker/admin page code.
- Firebase SDK and React/router split into separate Vite `manualChunks` — independently cacheable on deploys.
- Profile photo `img` tags: added `loading="lazy"` + `decoding="async"`.
- `index.html`: preconnect to Firestore, Auth, and Storage domains; updated page title and added meta description.
- Note: `react-player/lazy` subpath not available in v3 types — reverted. The `light` prop already defers player boot until click, so impact was minimal.

### 2026-04-09 — Phase 3 complete (engagement layer)

**Caseworker notification on family inquiry:**
`services/notifications.ts` — `createInquiryNotification()` writes to `states/{stateId}/notifications/`. `submitInquiry()` now accepts `InquiryContext` (caseworkerUserId, childFirstName) and calls notification create after inquiry write. `InquiryModal` requires `caseworkerUserId` prop (sourced from `child.createdBy`). `useNotifications` hook subscribes to unread notifications via real-time listener. AppShell bell icon shows unread badge count; dropdown renders notification list; clicking marks read and navigates to the profile.

**Family registration + verified browsing tier:**
`FamilyRegisterPage` at `/register/family` — role: 'family', active: true on creation. `RequireAuth` role redirect fixed: family → `/`, caseworker → `/dashboard`. `AuthShell` wrapper now passes `CASEWORKER_ROLES` to block family users from caseworker routes. AppShell conditionally shows Dashboard/admin links vs. Saved link by role. Gallery page shows a sign-up banner for unauthenticated visitors.

**AdoptUSKids CSV export:**
`exportAdoptUSKidsCSV()` in DashboardPage — client-side Blob download from published profiles in the already-loaded children array. State admin / platform admin only. Button disabled when published count is 0.

**Save to Favorites:**
`services/favorites.ts` — `addFavorite`, `removeFavorite`, `getFavorites` on `users/{userId}/favorites/{childId}`. `useFavorites`, `useIsFavorite`, `useFavoriteToggle` hooks with module-level in-memory sync. Heart button on ProfileCard visible to family role only. `FavoritesPage` at `/favorites` fetches saved profiles from Firestore and renders as ProfileCard grid.

**Type additions:** `'family'` to UserRole, `Notification` interface, `FavoriteProfile` interface.

**Firestore rules additions:** `states/{stateId}/notifications` (public create, owner read/update), `users/{userId}/favorites` (owner read/write).

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

### 2026-04-09 — Phase 2 complete, seed script, consent language

**Inquiry list on ProfileDetailPage:**
`Inquiry` type added to `types/index.ts`. `getInquiries()` added to `services/inquiries.ts`. ProfileDetailPage now renders a full-width inquiry panel below the media column when `inquiryCount > 0` — name, mailto email, message, date. Panel only fetches when there are inquiries to show.

**State configuration panel:**
`services/stateConfig.ts` with `getStateConfig` / `saveStateConfig` (audit logged). `StateConfigPage` at `/admin/state-config` covers: agency name, state name, primary brand color (hex + color picker), consent model (authority level, expiry days, youth assent age, ICWA toggle), and PII rules (three checkboxes). Loads existing config on mount, merges before save to preserve fields not in the form. Route and AppShell nav link gated to `state_admin` / `platform_admin`.

**Nebraska consent language (ne-draft-v1):**
Replaced generic placeholder with Nebraska-specific draft language citing Neb. Rev. Stat. § 43-104, § 84-712.05, Title IV-E, and DHHS Policy Manual Ch. 7. Five labeled bullets cover legal basis, PII compliance, scope of authorization, duration/renewal, and right to withdraw. Closing attestation paragraph added. Amber banner and footer both name Kirsten Manert as required DHHS sign-off contact. Version bumped to `ne-draft-v1`.

**Emulator seed script:**
`scripts/seed-emulator.ts` — pure REST API approach (no firebase-admin). Seeds full Nebraska dataset: state config, 3 test users, 4 child profiles, 2 consent records, 2 inquiries.

### 2026-04-09 — Save Project (end of overnight session)
- PRD updated: Phase 1 fully checked off, Phase 2 CURRENT, partial Phase 3 items checked

### 2026-04-08 — Project Bootstrap + Firebase Connected
- Scaffolded complete project: Vite + React 18 + TypeScript strict + Tailwind + Firebase v10
- Built all data model interfaces, service layer, hooks, pages, and routing
- Added CLAUDE.md, docs/JOURNAL.md, docs/PRD.md, .claude/settings.json
- Zero TypeScript errors confirmed
