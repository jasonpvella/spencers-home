# Spencer's Home — Product Requirements

---

## Mission

Modernize adoption recruitment infrastructure for legally free children in the U.S. foster care system — replacing broken, stale, and non-existent digital galleries with a video-first, dignity-centered platform that connects children with forever families.

Named for Spencer, a foster child who lived in the Vella home in Bentonville, Arkansas.

---

## Anchor State: Nebraska

- Heart Gallery closed — no replacement being built
- Nebraska's 2025–2029 federal recruitment plan cites a dead contract
- 6,231 children in foster care; 913 waiting for adoptive families
- No incumbent vendor to displace
- DHHS contact: Kirsten Manert, 531-350-2755
- CSI (former Heart Gallery operator): 402-553-6000

## Benchmark

Arkansas Project Zero (theprojectzero.org): 200+ professional films, 138K Facebook followers, 1,400+ placements since 2011. Waiting list: 440 → 146 (67% reduction). Budget ~$20K–$30K/year.

---

## Build Phases

### Phase 1 — Core Loop (Sprint 1–2, Weeks 1–4) ✅ COMPLETE
**Goal: Caseworker can create a child profile and publish it to a gallery.**

- [x] Firebase project setup (dev + prod environments)
- [x] Authentication (email/password, role-based, self-service registration + approval)
- [x] Child profile CRUD
- [x] Basic digital consent form with signature capture (canvas draw)
- [x] Profile status workflow (Draft → Pending Review → Published → Archived)
- [x] Public gallery page (mobile-responsive, video-first, age/gender/video filters)
- [x] State admin dashboard (status stats, expiring consent alerts, inquiry counts, search)
- [x] Private media storage with signed URL generation

### Phase 2 — Compliance Layer (Sprint 3–4, Weeks 5–8) ← CURRENT
**Goal: State admin can configure platform to match their legal requirements.**

- [ ] State configuration panel (consent model, PII rules, branding)
- [x] Role-based access control (Firestore security rules)
- [x] Consent expiry tracking + alerts
- [x] ICWA flag field on child profile
- [x] Immutable audit logging (already built in service layer)
- [x] Forbidden field validation (bio editor flags prohibited PII)

### Phase 3 — Engagement Layer (Sprint 5–6, Weeks 9–12)
**Goal: Families can browse, save, and inquire about children.**

- [ ] Family registration + verified browsing tier
- [x] Profile engagement metrics (views, saves, inquiries)
- [ ] Caseworker notification on family inquiry
- [x] Gallery filter and search (age, gender, video available)
- [ ] AdoptUSKids export (one-click syndication)
- [ ] "Save to Favorites" for registered families

### Phase 4 — Anchor State Hardening (Sprint 7–8, Weeks 13–16)
**Goal: Platform ready for real state contract and production data.**

- [ ] Security audit checklist
- [ ] Performance optimization (Lighthouse 80+ mobile)
- [ ] SSO integration (SAML/OAuth scaffold)
- [ ] AFCARS-ready data export
- [ ] White-label branding for Nebraska
- [ ] Nebraska-specific consent form (based on DHHS workflow)

### Phase 5 — Mobile (Post-contract)
- Expo (React Native) app for caseworker field capture (video + photo)
- iOS + Android

---

## Pricing Model

| Tier | Target | Annual |
|---|---|---|
| Seed | Small states, nonprofits | $10K–$25K |
| Standard | Mid-size states (Nebraska) | $30K–$80K |
| Enterprise | Large states | $80K–$200K |
| Strategic | Anchor/crisis states | Negotiated |

---

## What This Platform Is NOT

Do not build or suggest:
- Case management (placement decisions, court dates, child welfare records)
- Home study qualification or family certification
- Matching algorithms (humans make placement decisions)
- A national consumer app
- A replacement for AdoptUSKids (complement it, don't compete)

---

## Dignity-First Design Principles

1. **Dignity First** — Children are people with stories, not case numbers.
2. **Caseworker as Hero** — Every workflow completable in the field, on a phone, with minimal training.
3. **Privacy by Architecture** — PII protection is the foundation, not a feature.
4. **Video as Default** — Photo is a fallback. Video is the primary medium.
5. **State as Customer, Child as Beneficiary** — These goals must be aligned, not in tension.
6. **Multi-State by Design** — Every decision must work for NE, HI, OK, and SD simultaneously.
