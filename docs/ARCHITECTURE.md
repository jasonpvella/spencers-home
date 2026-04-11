# Spencer's Home - Architecture & Flow

> Open preview: Cmd+Shift+V (requires Mermaid Preview extension).
> Green = Built | Red = Not yet built

---

## 1. Pages & Access Control

```mermaid
flowchart TD
    classDef built fill:#d1fae5,stroke:#10b981,color:#064e3b
    classDef notbuilt fill:#fee2e2,stroke:#ef4444,color:#7f1d1d

    subgraph PUB["Public - no auth required"]
        G["GalleryPage - /"]:::built
        L["LoginPage - /login"]:::built
        R["RegisterPage - /register"]:::built
        FR["FamilyRegisterPage - /register/family"]:::built
    end

    subgraph FAM["Family role only"]
        FAV["FavoritesPage - /favorites"]:::built
    end

    subgraph CW["Caseworker+ - all staff roles"]
        DASH["DashboardPage - /dashboard"]:::built
        PFN["ProfileFormPage - /profile/new"]:::built
        PD["ProfileDetailPage - /profile/:id"]:::built
        PFE["ProfileFormPage - /profile/:id/edit"]:::built
        CF["ConsentFormPage - /profile/:id/consent"]:::built
    end

    subgraph ADM["state_admin / agency_admin / platform_admin"]
        AU["AdminUsersPage - /admin/users"]:::built
        SC["StateConfigPage - /admin/state-config"]:::built
    end

    subgraph P4["Phase 4 - Remaining"]
        SSO["SSO / SAML / OAuth scaffold"]:::notbuilt
        AFCARS["AFCARS-ready data export"]:::notbuilt
        WL["White-label branding for Nebraska"]:::notbuilt
        NEC["Nebraska consent form v2 - post DHHS sign-off"]:::notbuilt
    end

    subgraph P5["Phase 5 - Post-contract"]
        MOB["Mobile app - Expo / React Native"]:::notbuilt
    end
```

---

## 2. Caseworker Workflow - Profile to Publish

```mermaid
flowchart TD
    classDef built fill:#d1fae5,stroke:#10b981,color:#064e3b
    classDef gate fill:#fef3c7,stroke:#f59e0b,color:#78350f
    classDef store fill:#e0e7ff,stroke:#6366f1,color:#1e1b4b

    LOGIN["Login - /login"]:::built
    LOGIN --> DASH["DashboardPage"]:::built
    DASH --> PFN["ProfileFormPage - create"]:::built
    PFN --> DRAFT["Firestore: children - status = draft"]:::store
    DRAFT --> PD["ProfileDetailPage"]:::built
    PD --> CF["ConsentFormPage - canvas sig - NE draft v1"]:::built
    CF --> ACTIVE["Firestore: consents - status = active"]:::store
    ACTIVE --> PUBCHECK{"Consent gate in publishProfile"}:::gate
    PUBCHECK -- "consentStatus = active" --> PUB["status = published - Firestore transaction"]:::built
    PUBCHECK -- "not active" --> BLOCKED["Publish blocked"]:::gate
    PUB --> GAL["GalleryPage - visible to public"]:::built
    PD --> PEDIT["ProfileFormPage - edit"]:::built
    PD --> ARCH["Archive action - status = archived"]:::built
    DASH -- "state_admin+" --> EXPORT["AdoptUSKids CSV - client-side Blob"]:::built
```

---

## 3. Family Workflow - Browse, Inquire, Save

```mermaid
flowchart TD
    classDef built fill:#d1fae5,stroke:#10b981,color:#064e3b
    classDef store fill:#e0e7ff,stroke:#6366f1,color:#1e1b4b

    ANON["Anonymous visitor"] --> GAL["GalleryPage - age / gender / video filters"]:::built
    GAL --> INQ["InquiryModal - no auth required"]:::built
    INQ --> INQW["Firestore: inquiries subcollection + increment inquiryCount"]:::store
    INQW --> NOTIF["Firestore: notifications - caseworker notified"]:::store
    NOTIF --> BELL["AppShell bell - useNotifications realtime"]:::built
    GAL --> FREG["FamilyRegisterPage - /register/family"]:::built
    FREG --> FAUTH["Auto-approved - role = family"]:::built
    FAUTH --> GALF["GalleryPage + heart button visible"]:::built
    GALF --> HEART["useFavoriteToggle - users/userId/favorites"]:::built
    HEART --> FAVP["FavoritesPage - /favorites"]:::built
```

---

## 4. Auth & Role Routing

```mermaid
flowchart TD
    classDef built fill:#d1fae5,stroke:#10b981,color:#064e3b
    classDef notbuilt fill:#fee2e2,stroke:#ef4444,color:#7f1d1d
    classDef gate fill:#fef3c7,stroke:#f59e0b,color:#78350f

    ARRIVE(["User arrives"]) --> AUTHCHECK{"Firebase Auth state"}:::gate
    AUTHCHECK -- "Not signed in" --> PUB["Public routes only"]:::built
    AUTHCHECK -- "Signed in" --> ROLECHECK{"User role + active flag"}:::gate
    ROLECHECK -- "active = false" --> WALL["Pending Approval Wall"]:::built
    ROLECHECK -- "family" --> FAMROUTES["/ and /favorites only"]:::built
    ROLECHECK -- "caseworker" --> CWROUTES["All caseworker routes"]:::built
    ROLECHECK -- "supervisor / agency_admin" --> CWROUTES
    ROLECHECK -- "state_admin" --> CWROUTES
    ROLECHECK -- "state_admin" --> ADMINROUTES["/admin/users + /admin/state-config"]:::built
    ROLECHECK -- "platform_admin" --> CWROUTES
    ROLECHECK -- "platform_admin" --> ADMINROUTES
    SSO["SSO / SAML / OAuth - Phase 4"]:::notbuilt -.-> AUTHCHECK
```

---

## 5. Firestore Data Structure

```mermaid
flowchart TD
    classDef col fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef doc fill:#f0fdf4,stroke:#22c55e,color:#14532d

    ROOT["Firestore Root"]

    ROOT --> STATES["states / stateId"]:::col
    STATES --> STATEDOC["StateConfig - branding, consent model, PII rules"]:::doc
    STATEDOC --> CHILDREN["children / childId"]:::col
    CHILDREN --> CDOC["ChildProfile - firstName, age, gender, bio, interests, photoUrls, videoUrl, status, viewCount, inquiryCount, icwaFlag"]:::doc
    CDOC --> INQS["inquiries / inquiryId"]:::col
    INQS --> IDOC["Inquiry - name, email, message, submittedAt - append-only, public create"]:::doc
    STATEDOC --> CONSENTS["consents / consentId"]:::col
    CONSENTS --> CONDOC["ConsentRecord - childId, status, signedBy, signatureDataUrl, consentLanguageVersion - core fields immutable post-create"]:::doc
    STATEDOC --> NOTIFS["notifications / notifId"]:::col
    NOTIFS --> NDOC["Notification - userId, childId, message, read - owner read/update only"]:::doc

    ROOT --> USERS["users / userId"]:::col
    USERS --> UDOC["AppUser - role, stateId, active, displayName"]:::doc
    UDOC --> FAVS["favorites / childId"]:::col
    FAVS --> FDOC["FavoriteProfile - childId, stateId, childFirstName, savedAt"]:::doc

    ROOT --> AUDIT["audit / logId"]:::col
    AUDIT --> ADOC["AuditLog - action, actorId, stateId, targetId, timestamp - write-only"]:::doc
```

---

## 6. Service & Hook Layer

```mermaid
flowchart LR
    classDef svc fill:#fef3c7,stroke:#f59e0b,color:#78350f
    classDef hook fill:#ede9fe,stroke:#8b5cf6,color:#4c1d95

    subgraph HOOKS["Hooks"]
        H_AUTH["useAuth - Zustand auth store"]:::hook
        H_CHILDREN["useChildren - list with reload"]:::hook
        H_CONSENT["useConsent - active record"]:::hook
        H_NOTIF["useNotifications - realtime unread"]:::hook
        H_FAV["useFavorites / useFavoriteToggle / useIsFavorite"]:::hook
    end

    subgraph SERVICES["Services"]
        SC_CHILDREN["children.ts - CRUD, publish, archive"]:::svc
        SC_CONSENT["consent.ts - create, update status"]:::svc
        SC_STORAGE["storage.ts - signed URL upload/fetch"]:::svc
        SC_AUDIT["audit.ts - writeAuditLog - write-only"]:::svc
        SC_USERS["users.ts - approve, role change"]:::svc
        SC_INQ["inquiries.ts - submit, get list"]:::svc
        SC_NOTIF["notifications.ts - create, subscribe"]:::svc
        SC_FAV["favorites.ts - add, remove, get"]:::svc
        SC_CONFIG["stateConfig.ts - get, save"]:::svc
    end

    H_AUTH --> SC_USERS
    H_CHILDREN --> SC_CHILDREN
    H_CONSENT --> SC_CONSENT
    H_NOTIF --> SC_NOTIF
    H_FAV --> SC_FAV

    SC_CHILDREN --> SC_AUDIT
    SC_CONSENT --> SC_AUDIT
    SC_STORAGE --> SC_AUDIT
    SC_USERS --> SC_AUDIT
    SC_CONFIG --> SC_AUDIT
```

---

## Build Status Summary

| Phase | Status | Notes |
|---|---|---|
| Phase 1 - Core Loop | Complete | Auth, profiles, consent, gallery, dashboard, media storage |
| Phase 2 - Compliance Layer | Complete | State config, Firestore RBAC rules, audit log, ICWA flag, PII warnings |
| Phase 3 - Engagement Layer | Complete | Family registration, favorites, inquiry notifications, AdoptUSKids CSV export |
| Phase 4 - Anchor State Hardening | In Progress | Security + Performance done. SSO, AFCARS, white-label, NE consent v2 remaining |
| Phase 5 - Mobile | Post-contract | Expo / React Native caseworker field capture app |
