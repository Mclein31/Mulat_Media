---
type: decisions-log
title: Mulat Media Decisions
project: Mulat_Media_Website
tags:
  - decisions
  - web
  - cms
  - supabase
last_updated: 2026-11-15
---

# ⚖️ Mulat_Media_Website — Technical Decisions

> Date note: the first two entries are dated 2025-01 and 2025-02, but the git history starts on 2026-08-15, Supabase was added on 2026-08-20 and Wordle on 2026-08-27. The dates are kept as recorded; they are probably not the real decision dates.

## 2025-01-20 — Supabase BaaS for Publication CMS

### Decision
Use Supabase (Cloud PostgreSQL + Supabase Auth + Supabase Storage) as the backend-as-a-service instead of building a standalone custom Express backend.

### Reason
Provided instant Row Level Security (RLS), managed user authentication for student editors, structured SQL relational tables for articles, and instant CDN media storage with zero server maintenance.

### Alternatives
- **Custom Node/Express Backend**: Would require hosting a database, managing auth sessions manually, and provisioning S3 storage.
- **Firebase / Firestore**: NoSQL document structure makes relational category queries and editorial review workflows more cumbersome than SQL.

### Consequences
Fast development velocity and high reliability on Vercel + Supabase infrastructure.

> **Status: Superseded** by "2026-11-02 — Neon Auth with verified staff allowlist and R2" below. Production moved off Supabase in commit `5c67cbb` (2026-11-02).

---

## 2025-02-12 — Daily Wordle Engagement Game Integration

### Decision
Build a custom daily Wordle game module (`wordle.js`) directly integrated into the student publication website.

### Reason
Drives recurring daily traffic from students and campus readers, boosting overall publication readership and engagement.

### Alternatives
- Embedding a third-party iframe (lacks custom Mulat branding and theme sync).

### Consequences
Significant increase in daily active readers and positive reader feedback.

> Note (2026-11-15): no analytics in the repo back this claim; the only metric is the Abacus visit/like counter.

---

## 2026-11-02 — Neon Auth with verified staff allowlist and R2

User chose Neon Postgres and Neon Auth, with Cloudflare R2 for media. Dedicated
Mulat Media project `blue-bread-38604486` only; never modify other Neon projects.
Replace preset `.local` accounts with email signup and verification. Server owns
seven supplied staff identities plus developer admin `mcleinonza0531@gmail.com`;
Jang Mee retains EIC. Names and client roles never authorize access. Vercel API
functions own SQL access and signed media uploads. Public signup may create an
Auth identity directly, but an identity outside the allowlist never receives
newsroom access. No existing source accounts have been deleted remotely.

Implementation and verification are in progress; live data/media import and
production cutover await source/R2 credentials. See `docs/BACKEND_MIGRATION.md`.

> Status (2026-11-15): implemented and live in production since 2026-11-02 (`5c67cbb`). The email-signup part was replaced the same day by the preprovisioned-accounts decision below.

---

## 2026-11-02 — Preprovisioned staff accounts and acknowledgement ownership

User replaced email signup with eight preprovisioned Neon Auth accounts and
user-specified initial passwords. Public signup disabled. Keep first-login
verification and allow current-password-authenticated password changes. Never
store initial passwords in source or Brain files. Jang Mee alone controls
acknowledgement content; developer admin retains other-section management; six
writers manage only their own work. Existing deployment review hold still applies.

> Status (2026-11-15): the review hold was lifted when the user pushed `5c67cbb` to `main` on 2026-11-02. The user also chose to launch with Neon's shared email sender and defer custom SMTP.
