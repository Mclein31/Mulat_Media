---
type: archive
title: Mulat Media Archived Notes (Supabase era)
project: Mulat_Media_Website
tags:
  - archive
last_updated: 2026-11-15
---

# Mulat_Media_Website — Archived Notes (Supabase era)

Moved verbatim from `NOTES.md` during the 2026-11-15 brain cleanup. Production stopped using this Supabase project when commit `5c67cbb` (2026-11-02) moved the backend to Neon + R2; the current code no longer references the project URL (only `scripts/migrate-backend.cjs` does). The Supabase project is kept as the migration source and rollback, so these notes may still matter if a rollback is attempted. See [[NOTES]].

---

## 🔑 Supabase Credentials Configuration
- Project URL: `https://rjbkeadhidccpduedaqb.supabase.co`
- Anon Key: Public key initialized in `assets/js/supabase-client.js`
- Storage Bucket: `article-photos` (Public CDN URL format: `https://.../storage/v1/object/public/article-photos/<filename>`)

## Sign-in outage investigation — 2026-11-02
- The deployed `assets/js/supabase-client.js` matched the local file and points to `rjbkeadhidccpduedaqb.supabase.co`.
- The live login page returned HTTP 200, but the Supabase auth health request failed DNS resolution. Google and Cloudflare DNS-over-HTTPS both returned `NXDOMAIN` for the project hostname.
- Authentication cannot reach Supabase; password validity has not been tested. Check the project's dashboard status and configured project URL before changing login code or credentials.
- Paused/deleted project status remains unconfirmed. Supabase documents both as possible causes: https://supabase.com/kb/troubleshooting/nxdomain-error-connecting-to-a-supabase-project
