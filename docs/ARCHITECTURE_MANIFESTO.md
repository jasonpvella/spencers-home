# Spencer's Home: Architecture Manifesto

## The Pre-Flight Protocol

Before writing any code for a new feature or data flow, I must present an **Impact Analysis** in plain English. No code is written until you approve it.

**If I skip this and start writing code — stop me. Say: "Impact Analysis first."**

---

## Impact Analysis Format

Every analysis covers three things, in plain English (no jargon):

**What's changing?**
What new button, screen, or data connection is being added. Written so a non-developer can picture it.

**What could break?**
Which user roles, pages, or data flows might be affected. Name them specifically — don't say "some components." If sponsor logos are involved, say "the landing page sponsor section." If uploads are involved, say "caseworker and state_admin upload flows."

**Stability plan:**
How this change keeps navigation, data freshness, and role access intact. Specifically address:
- Will data still be visible after navigating away and back?
- Does every affected role (platform_admin / state_admin / supervisor / caseworker / family) get the right experience?
- Is there a loading state and an error state?

End every analysis with: **"Ready to proceed? (Yes / No)"**

---

## When an Impact Analysis is Required

Required for:
- Any new page, component, or hook
- Any new Firestore read or write
- Any change to routing, navigation, or role-gating
- Any change to how media (photos, videos, logos) is uploaded or displayed

Not required for:
- Typo or copy fixes
- CSS / color / spacing only changes
- Renaming a label

---

## Non-Negotiable Architecture Rules

### 1. Check Every Role Before Building
Every feature is touched by one or more of: `platform_admin`, `state_admin`, `supervisor`, `caseworker`, `family`. Before writing code, name which roles are affected and confirm the feature works correctly for each — not just the role being demoed.

### 2. Firebase Storage — Signed URLs Only
Never display a raw Storage bucket path in the UI. All media (child photos/video, sponsor logos, state branding logos) must go through `getDownloadURL()`. Raw paths look like they work but break for other roles or after a session refresh. This is already enforced in `services/storage.ts` — always use it.

### 3. Every Firestore Write Needs Three Things
- `stateId` pulled from the authenticated user record (never from a form field or URL param)
- A Firestore security rule that allows the write for the intended role
- An audit log entry via `writeAuditLog()` if the write involves: profile status change, consent event, media upload, or user role change

If any of the three is missing, don't write the code — flag it first.

### 4. Use Real-Time Listeners for Data That Can Change
If a page shows data that could change while the user is elsewhere — gallery profiles, sponsor logos, profile status, notification counts — it must use `onSnapshot`, not a one-shot `getDocs`/`getDoc`. One-shot fetches go stale when the user navigates away and back. This is the most common cause of "it worked, then it broke."

### 5. Respect the Layer Boundaries
| Layer | What goes here | What does NOT go here |
|---|---|---|
| `pages/` | Display, layout, event wiring | Direct Firestore calls |
| `hooks/` | All data reads, return `{ data, loading, error }` | Write operations |
| `services/` | All Firestore and Storage writes | UI logic |

Breaking this hides bugs inside render functions and makes them invisible until a specific role hits a specific state.

### 6. Every Data-Fetching Component Must Handle Three States
Loading, error, and empty. Never let the UI hang silently or show a blank screen. If a fetch fails, the user must see something that tells them what happened.

### 7. Self-Correction Gate
If a feature request would violate any rule above — stop. Do not write partial code. State the conflict clearly and ask for direction before proceeding.
