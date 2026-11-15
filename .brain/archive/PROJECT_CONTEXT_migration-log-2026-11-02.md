---
type: archive
title: Mulat Media Archived Migration Status Log
project: Mulat_Media_Website
tags:
  - archive
last_updated: 2026-11-15
---

# Mulat_Media_Website — Archived Migration Status Log

Moved verbatim from `PROJECT_CONTEXT.md` during the 2026-11-15 brain cleanup. This was a running log of the 2026-11-02 Supabase → Neon/R2 migration; it is superseded by the condensed status in [[PROJECT_CONTEXT]] and by `docs/BACKEND_MIGRATION.md` and `docs/LIVE_ROLLOUT.md` in the repo.

---

## Former "Current Objectives & Status" migration bullet

- **Backend migration (2026-11-02, in progress)**: Target is Neon Postgres + Neon Auth, with Cloudflare R2 for photos/files. Dedicated Neon project `mulat-media` (`blue-bread-38604486`, AWS Singapore, Postgres 17) created; other Neon projects must remain untouched. Production still uses Supabase; no data or auth cutover has occurred. Source and R2 credentials verified in ignored `.env.local`; source Session pooler required because direct IPv6 is unreachable. Backed up and migrated 7 profiles, 0 articles and 3 photos; target rows/public photo bytes verified. Confirm live source schema/version before importing; preserve article IDs and map staff identities when moving Auth. Eight Neon Auth accounts are provisioned with user-specified initial passwords; public signup is disabled. Staff sign in with their supplied real emails, verify email, and can change their password; the server allowlist includes seven staff plus developer admin mcleinonza0531@gmail.com. Auth accounts and application schema are provisioned on the new project. Jang Mee alone can edit acknowledgement content; developer admin can manage other sections; six writers can manage only their own ordinary articles. Local implementation uses Vercel server APIs and R2 signed uploads; deployment remains pending. Release verification: 11 tests pass; developer OTP/sign-in/session/JWT, temporary article CRUD, password-change and logout tested live; temporary article removed and existing password retained. Added same-origin auth proxy and corrected R2 upload checksum signing. Production preparation: user approved Vercel settings and preview. Eight settings saved in production+preview, Node22 pinned, cached same-origin media replaces r2.dev dependency, 18 tests pass. Protected preview READY at https://mulat-media-ikdpaidpp-mc-lein-jei-onza.vercel.app; deployed login/session/JWT, permissions, article CRUD, photo streaming/upload and logout verified. User approved retaining the tested shared sender for initial production launch; custom SMTP deferred until publication mailbox owner is available. User requested Git push commands to roll out themselves; agent has not promoted production. See docs/LIVE_ROLLOUT.md. Original review hold superseded only for approved Vercel setup and preview; public production promotion still requires instruction. See docs/BACKEND_MIGRATION.md.

## Production rollout — 2026-11-02

User pushed migration commit 5c67cbb to main. Production deployment
dpl_DX82gz8xYQvTXsLgpBUCnSWKynSC is READY at mulat-media.vercel.app.
Public login/config/articles and auth-session routes pass smoke checks; unsigned
member access returns 401. Neon shared sender retained by user choice. Only
custom publication Gmail SMTP setup is deferred until the mailbox owner is available.

## Former Known Limitation (Supabase era)

- Supabase free tier storage bucket limits must be monitored for high-resolution article photo uploads.
