# Spencer's Home — Project Memory Journal

---

## Executive Snapshot

**Current Focus:** v1 infrastructure complete. Storage live, platform_admin bootstrapped. Ready for end-to-end core loop validation on the live URL.

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
- **AppShell:** sticky nav, role badge, sign-out, bell notification dropdown for caseworkers, Saved nav link for families, dynamic logo + brand color from state config ✅
- **Pages built:**
  - LandingPage: public hero (blurred background + foreground portrait), 4 category cards, about/partnership section, sponsors placeholder grid ✅
  - GalleryPage (at `/gallery`): video-first ProfileCards, `?category=` pre-filter from landing page, age/gender/video filters, result count, family sign-up banner for anonymous visitors ✅
  - DashboardPage: status stats, expiring consent alerts, inquiry count, profile search, AdoptUSKids CSV export, AFCARS CSV export (state_admin+) ✅
  - ProfileFormPage: create + edit, interest tag picker, PII bio warnings, ICWA section ✅
  - ProfileDetailPage: status/consent badges, action buttons, consent record details, inline media, archive, inquiry list ✅
  - ConsentFormPage: canvas draw signature, youth assent + ICWA conditional fields, Nebraska draft language ✅
  - AdminUsersPage: list users by state, approve/deactivate, role change ✅
  - RegisterPage: self-service caseworker account, pending approval flow ✅
  - FamilyRegisterPage: self-service family account at `/register/family`, auto-approved, role: 'family' ✅
  - StateConfigPage: branding (color + logo upload + custom domain), consent model, expiry days, youth assent age, ICWA toggle, PII rules, SSO config ✅
  - FavoritesPage: grid of saved profiles for family users at `/favorites` ✅
- **MediaUpload component:** react-dropzone, per-file progress bar, photo + video ✅
- **InquiryModal:** public gallery CTA, writes to Firestore, increments inquiryCount, triggers caseworker notification ✅
- **Toast system:** Radix Toast, success/error/info, wired into all mutations ✅
- **Firestore security rules:** full audit complete, 5 critical bugs fixed, field-level update restrictions added, `ssoProviders` public read ✅
- **Storage rules deployed** ✅
- **Emulator seed script:** `scripts/seed-emulator.ts` — 3 users, 4 child profiles, 2 consents, 2 inquiries, NE state config ✅
- **Admin bootstrap script:** `scripts/bootstrap-admin.ts` — creates platform_admin + Test State in live Firebase ✅
- **Platform admin live:** `jason@spencershome.org` / uid: `EoCy0vcpn8RIucC5bsRuOOhn3ak2` ✅
- **Test State created:** `states/ts` ✅
- **Route code splitting:** all 12 pages lazy-loaded; Firebase + vendor in separate cacheable chunks ✅
- **Image lazy loading:** `loading="lazy"` + `decoding="async"` on gallery photos ✅
- **HTML preconnect:** Firebase domains + Google Fonts preconnected in index.html ✅
- **Brand:** Warm amber palette (CSS custom properties), Nunito font, warm off-white background ✅
- **Hero image:** `public/hero.png` — live on landing page ✅
- TypeScript: 0 errors ✅
- **Deployed:** https://spencers-home-dev.web.app ✅

**Next session — in order:**
1. Change platform admin password on the live site (currently `ChangeMe123!`)
2. Walk the full core loop on the live URL: create profile → consent → publish → browse gallery → submit inquiry → see notification
3. Task 3: strip SSO from login page and state config UI
4. Task 4: sponsor logo uploads in state config + landing page
5. Task 5: polish pass (empty gallery state, mobile check, console errors)

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

---

## Historical Log

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
