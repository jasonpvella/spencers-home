# Spencer's Home — Core Rules

**Product:** Digital permanency platform for legally free children in U.S. foster care.
**Stack:** React 18 + Vite 5 + TypeScript strict + Tailwind CSS 3 + Firebase v10
**NOT a case management system. NOT a matching algorithm. Child privacy is non-negotiable.**

---

## Terminal Commands

**Never ask Jason to run terminal commands manually.** Run them yourself with the Bash tool. This includes:
- Migration scripts (`npx tsx scripts/...`) — the service account key is at `/Users/jasonvella/Downloads/spencers-home-dev-firebase-adminsdk-fbsvc-31d5d16872.json`
- Firebase deploys (`firebase deploy --only ...`)
- TypeScript checks (`npx tsc --noEmit`)
- Builds (`npm run build`)
- Git operations (`git add`, `git commit`, `git push`)

---

## CRITICAL RULES

**NEVER store child last name, school name, location, or case history — anywhere.**
**NEVER generate public Firebase Storage URLs — signed/token URLs only, always.**
**ALWAYS validate `stateId` matches the auth user's `stateId` before any Firestore write.**
**ALWAYS write to audit log on: profile status change, consent event, media upload, user role change.**

---

## Project Index

| Doc | Contents |
|---|---|
| [docs/JOURNAL.md](docs/JOURNAL.md) | Session log, executive snapshot, technical decisions |
| [docs/PRD.md](docs/PRD.md) | Build phases, business model, what this platform is NOT |
| [docs/ARCHITECTURE_MANIFESTO.md](docs/ARCHITECTURE_MANIFESTO.md) | Pre-flight protocol, impact analysis format, architecture rules |

---

## Journal Protocol

**Before any task:** Read `docs/JOURNAL.md`, `docs/PRD.md`, and `docs/ARCHITECTURE_MANIFESTO.md`.

**Before writing any code for a new feature or data flow:** Present an Impact Analysis in plain English covering what's changing, what could break, and the stability plan. Wait for explicit approval ("Yes") before writing code. See `docs/ARCHITECTURE_MANIFESTO.md` for the full format and when this is required.

**When Jason says "Save Project":**
1. Scan the session for new technical decisions, scope changes, or requirement shifts.
2. Rewrite the `## Executive Snapshot` to reflect current focus and next session priorities.
3. Append a dated entry to `## Historical Log` summarizing the session delta.
4. If scope, features, or requirements changed, update the relevant phase in `docs/PRD.md` and note the change in the log entry.
5. Stage all changed files and push to GitHub (`git add -A && git commit -m "..." && git push`).
6. If `firestore.rules` or `firestore.indexes.json` changed this session, run `firebase deploy --only firestore:rules,firestore:indexes` first.
7. If `functions/` changed this session, build and deploy functions: `cd functions && npm run build && cd .. && firebase deploy --only functions`.
8. Build the frontend (`npm run build`) then deploy to Firebase Hosting (`firebase deploy --only hosting`) to refresh the live site.

---

## Model Selection

Select the cheapest model where output quality is comparable — don't ask, don't suggest:

- Bulk/repetitive tasks (batch writes, simple transforms, templated generation) → `claude-haiku-4-5-20251001`
- Default work (standard features, UI components, hooks, service functions) → `claude-sonnet-4-6`
- High-stakes reasoning (security rules, consent logic, ICWA compliance decisions, architecture) → `claude-opus-4-6`
