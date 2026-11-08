---
type: notes
title: Mulat Media Reference Notes
project: Mulat_Media_Website
tags:
  - notes
  - reference
last_updated: 2026-11-02
---

# 📝 Mulat_Media_Website — Technical Notes

## 🔑 Supabase Credentials Configuration
- Project URL: `https://rjbkeadhidccpduedaqb.supabase.co`
- Anon Key: Public key initialized in `assets/js/supabase-client.js`
- Storage Bucket: `article-photos` (Public CDN URL format: `https://.../storage/v1/object/public/article-photos/<filename>`)

## Sign-in outage investigation — 2026-11-02
- The deployed `assets/js/supabase-client.js` matched the local file and points to `rjbkeadhidccpduedaqb.supabase.co`.
- The live login page returned HTTP 200, but the Supabase auth health request failed DNS resolution. Google and Cloudflare DNS-over-HTTPS both returned `NXDOMAIN` for the project hostname.
- Authentication cannot reach Supabase; password validity has not been tested. Check the project's dashboard status and configured project URL before changing login code or credentials.
- Paused/deleted project status remains unconfirmed. Supabase documents both as possible causes: https://supabase.com/kb/troubleshooting/nxdomain-error-connecting-to-a-supabase-project

## 📰 Editorial Categories
- `opinion`: Editorials, columns, and reader perspectives.
- `news-current-affairs`: Breaking campus news and ongoing coverage.
- `entertainment`: Pop culture, media, and reviews.
- `metrostyle`: Lifestyle, fashion, and city culture.
- `sports`: Game coverage and athlete features.
- `campus-press`: School events, clubs, and student life.
