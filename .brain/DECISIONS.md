---
type: decisions-log
title: Mulat Media Decisions
project: Mulat_Media_Website
tags:
  - decisions
  - web
  - cms
  - supabase
last_updated: 2026-08-28
---

# ⚖️ Mulat_Media_Website — Technical Decisions

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

## 2026-11-02 — Preprovisioned staff accounts and acknowledgement ownership

User replaced email signup with eight preprovisioned Neon Auth accounts and
user-specified initial passwords. Public signup disabled. Keep first-login
verification and allow current-password-authenticated password changes. Never
store initial passwords in source or Brain files. Jang Mee alone controls
acknowledgement content; developer admin retains other-section management; six
writers manage only their own work. Existing deployment review hold still applies.
