# Spencer's Home — Project Memory Journal

---

## Executive Snapshot

**Current Focus:** Initial scaffold complete. Firebase project not yet created — `.env.local` is empty. Sprint 1 goal is the core caseworker loop: create child profile → upload media → capture consent → publish to gallery.

**Scaffold status:**
- React 18 + Vite 5 + TypeScript (strict) + Tailwind CSS 3 ✅
- Firebase v10 (modular) wired up, awaiting project credentials ⏳
- Data models: `ChildProfile`, `ConsentRecord`, `StateConfig`, `User`, `AuditLog` ✅
- Service layer: `children.ts`, `consent.ts`, `storage.ts`, `audit.ts` ✅
- Custom hooks: `useAuth`, `useChildren` ✅
- Zustand auth store ✅
- Pages: Login, Dashboard (status counts), Gallery (video-first ProfileCard) ✅
- Route guard (`RequireAuth`), PII warning utility (`pii.ts`) ✅
- `.env.local` template, `.gitignore`, `@/` path aliases ✅

**Next session — work items in priority order:**
1. Create `spencers-home-dev` Firebase project, fill in `.env.local`
2. Set up Firebase emulators for local dev
3. Write Firestore security rules
4. Build child profile create/edit form (`ProfileFormPage`)
5. Consent form with signature capture
6. Media upload UI (React Dropzone → Firebase Storage)

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

---

## Historical Log

### 2026-04-08 — Project Bootstrap
- User provided full PRD (Spencer's Home Digital Permanency Platform v1.0)
- Scaffolded complete project: Vite + React 18 + TypeScript strict + Tailwind + Firebase v10
- Built all data model interfaces, service layer, hooks, pages, and routing
- Zero TypeScript errors on first type-check
- First git commit: `d13907e`
