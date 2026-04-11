# Spencer's Home — v1 Session Prompt

## Context for Claude Code

Spencer's Home is a digital permanency platform for legally free foster children in the U.S. foster care system. It's a React + Vite + TypeScript app with Firebase (Firestore, Auth, Storage) as the backend. The codebase is functional — profiles, consent, publishing, gallery, inquiries, notifications, and state admin config are all built and working in local dev.

This session is about getting v1 live. Not adding features. Not refactoring. Getting the existing product deployed, testable end-to-end on a real URL, and polished enough that it looks like a real product.

---

## What Already Exists

**Stack:** React 18, Vite 5, TypeScript (strict), Tailwind CSS 3, Firebase v10 (Firestore, Auth, Storage)

**Key libraries:** react-hook-form + zod, react-player, react-dropzone, react-signature-canvas, react-google-recaptcha, zustand, @radix-ui/react-dialog, @radix-ui/react-toast

**Pages built:**
- `/` — LandingPage (hero, category cards, about, sponsors)
- `/gallery` — GalleryPage (published profiles, filters by age/gender/video/category)
- `/c/:stateId/:childId` — PublicProfilePage (full profile + inline inquiry form with reCAPTCHA)
- `/login` — LoginPage (email/password + SSO detection)
- `/register` — RegisterPage (caseworker self-registration)
- `/dashboard` — DashboardPage (stats, consent alerts, profile list, exports)
- `/profile/new` — ProfileFormPage (create mode)
- `/profile/:id` — ProfileDetailPage (full detail + media + inquiries + consent status)
- `/profile/:id/edit` — ProfileFormPage (edit mode)
- `/profile/:id/consent` — ConsentFormPage (legal language, signature, ICWA, youth assent)
- `/admin/users` — AdminUsersPage (approve/deactivate/role change)
- `/admin/state-config` — StateConfigPage (branding, consent model, PII rules, SSO config)

**Service layer:** src/services/ — children.ts, consent.ts, inquiries.ts, notifications.ts, users.ts, stateConfig.ts, storage.ts, audit.ts, sso.ts. All Firestore operations go through these. Pages never call Firestore directly.

**Auth:** Firebase Auth + Firestore user docs (users/{userId}) with role, stateId, active fields. RequireAuth gate on all protected routes. Roles: caseworker, supervisor, agency_admin, state_admin, platform_admin.

**Data model:** Everything state-scoped under states/{stateId}/. Children, consents, notifications under there. Inquiries as subcollection under children. Users and audit log are global collections.

**Security rules:** firestore.rules and storage.rules are written and enforce multi-tenant isolation, role-based access, field restrictions, consent immutability, append-only inquiries, and public gallery read access.

**What was recently removed:** Family accounts, favorites, heart button, FavoritesPage, family registration. Only two user types now: anonymous public visitors and internal staff.

---

## v1 Tasks — In Order

### Task 1: Deploy to Firebase Hosting

Get the app live on a public URL.

**Steps:**
1. Run `firebase init hosting` if not already configured
2. Set the public directory to `dist` (Vite's build output)
3. Configure as a single-page app (rewrite all URLs to index.html)
4. Run `npm run build` to create the production build
5. Run `firebase deploy --only hosting`
6. Verify the live URL works (should be something like `spencers-home-xxxxx.web.app`)

**Important:** Make sure the Firebase project config in the app (src/firebase.ts or wherever the Firebase config object lives) points to the correct production Firebase project, not a dev/test project. The Firestore rules and Storage rules need to be deployed to the same project.

Also deploy Firestore rules and Storage rules if not already deployed:
- `firebase deploy --only firestore:rules`
- `firebase deploy --only storage`

### Task 2: Bootstrap Platform Admin + Test State

I need to be able to log in as a platform_admin and set up a test state to run the full loop.

**Steps:**
1. Create a script (can be a Node.js script using Firebase Admin SDK, or instructions for the Firebase Console) that:
   - Takes an email address and sets their Firestore user doc to: `role: 'platform_admin', active: true, stateId: 'ts'` (ts = Test State)
   - Creates a state config document at `states/ts` with reasonable defaults (a brand color, consent expiry of 365 days, youth assent age of 14, ICWA enabled, PII rules all enabled)
   - Sets `stateName: 'Test State'` and `agencyName: 'Test Agency'` on the state config

2. I also need to be able to test as a caseworker. Options:
   - A second email account that I register at /register, then approve from my platform_admin account via the Admin Users page
   - OR a dev tool / script that creates a test caseworker directly
   
   The first option is better because it tests the real registration → approval flow.

**End state:** I can log in as platform_admin, see the Dashboard for Test State, approve a caseworker, then log in as that caseworker and create a profile → consent → submit for review. Then log back in as admin and publish it. Then view it on the public gallery as an anonymous visitor and submit an inquiry.

### Task 3: Strip SSO from Visible UI

SSO (SAML/OIDC) is being deferred to v2. The backend scaffolding should stay intact (services/sso.ts, the ssoProviders collection, the Firebase SAML provider config), but it should be hidden from the user-facing UI.

**What to change:**
- **LoginPage:** Remove the SSO detection logic (the debounced state ID lookup and the "Sign in with [DisplayName]" button). The login page should only show email/password.
- **StateConfigPage:** Remove or hide the SSO configuration section. The branding, consent model, and PII rules sections stay.
- **Do NOT delete:** services/sso.ts, the Firestore rules for ssoProviders, or any SSO-related types/interfaces. Just hide the UI entry points so it can be re-enabled later.

### Task 4: Add Sponsor Logo Uploads to State Config

States will have sponsors and partners they want to acknowledge on the landing page. The state admin needs to be able to upload sponsor logos.

**What to build:**
- In StateConfigPage, add a "Sponsors" section
- The section should allow uploading multiple sponsor logos (PNG/JPG/SVG/WebP)
- Each sponsor should have: a logo image, a name, and an optional URL (if the sponsor wants their logo to link somewhere)
- Store in the state config document at `states/{stateId}` under a `sponsors` array field: `[{ name: string, logoUrl: string, url?: string }]`
- Logo files go to Firebase Storage at `states/{stateId}/sponsors/{filename}`
- The LandingPage should read the sponsors array from the state config and render them in the sponsors section

**Important:** Use the same signed-URL pattern as other media uploads. The sponsor logos don't need to be as locked down as child media (they're brand logos, not sensitive), but keep the pattern consistent.

### Task 5: Polish Pass

Before calling v1 done, make sure:

1. **The landing page looks complete** — hero section, category cards, about section, and sponsors section all render correctly with test data. No placeholder text like "Lorem ipsum" or "[State Name]" visible — everything should pull from the state config or have sensible defaults.

2. **The gallery looks good with zero profiles** — if there are no published profiles yet, the gallery should show a friendly empty state, not a broken page or a blank white screen.

3. **The inquiry form works end-to-end** — submit an inquiry on the live URL, verify it shows up in the caseworker's notification bell and on the profile detail page.

4. **The consent flow works end-to-end** — create a profile, navigate to consent, fill out the form, sign, verify consent status updates, verify the publish button appears.

5. **Mobile responsiveness** — check the landing page, gallery, and profile pages on a phone-width viewport. These are the pages families will hit, often on mobile.

6. **No console errors in production** — open browser dev tools on the live URL and make sure there are no red errors in the console.

---

## What NOT to Do in This Session

- Do NOT build a platform admin dashboard (v2)
- Do NOT add state admin self-service features beyond what's listed above (v2)
- Do NOT re-enable or extend SSO (v2)
- Do NOT add a mobile app or Expo setup (post-v1)
- Do NOT refactor the service layer or data model — it works, ship it
- Do NOT add new user roles or change the role hierarchy
- Do NOT build a CMS for landing page content — I'll update that in code when needed

---

## File Structure Reminders

- All pages: `src/pages/`
- All components: `src/components/`
- All services: `src/services/`
- All hooks: `src/hooks/`
- Auth store: `src/store/authStore.ts`
- Firebase config: check for `src/firebase.ts` or `src/lib/firebase.ts`
- Firestore rules: `firestore.rules`
- Storage rules: `storage.rules`
- Vite config: `vite.config.ts`
- Tailwind config: `tailwind.config.js`
- Path alias: `@/` maps to `src/`

---

## Success Criteria

v1 is done when:

1. The app is live on a Firebase Hosting URL
2. I can log in as platform_admin and as a test caseworker
3. I can run the full core loop: create profile → consent → submit → publish → browse gallery → submit inquiry → see notification
4. SSO is hidden from the UI
5. Sponsor logos can be uploaded and appear on the landing page
6. The public-facing pages (landing, gallery, profile) look polished on desktop and mobile
7. No console errors in production
