---
type: notes
title: Mulat Media Reference Notes
project: Mulat_Media_Website
tags:
  - notes
  - reference
last_updated: 2026-11-15
---

# 📝 Mulat_Media_Website — Technical Notes

## 🔑 Backend Configuration
- Server variables (set in Vercel for production and preview): `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL`. Template in `.env.example`; local values in gitignored `.env.local`. Never commit or paste them.
- The old Supabase project settings are kept in Vercel for rollback. Supabase-era credentials notes and the 2026-11-02 Supabase sign-in outage investigation (NXDOMAIN on the project hostname) are archived in [[archive/NOTES_supabase-era|archive/NOTES_supabase-era.md]].
- The Supabase source database is only reachable through its Session pooler (direct host is IPv6-only and unreachable from the dev network).

## 🧩 Gotchas
- `assets/js/supabase-client.js` is a build artefact despite its name; edit `assets/js/backend-client.source.js` instead.
- Only touch the dedicated Neon project `blue-bread-38604486`; never modify other Neon projects.
- Custom SMTP: when the mailbox owner is available, use a dedicated Gmail app password with 2-Step Verification and verify a fresh OTP. Never request the mailbox's primary password or recovery codes.

## 📰 Editorial Categories
- `opinion`: Editorials, columns, and reader perspectives.
- `news-current-affairs`: Breaking campus news and ongoing coverage.
- `entertainment`: Pop culture, media, and reviews.
- `metrostyle`: Lifestyle, fashion, and city culture.
- `sports`: Game coverage and athlete features.
- `campus-press`: School events, clubs, and student life.
