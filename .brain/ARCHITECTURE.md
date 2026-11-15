---
type: architecture
title: Mulat Media Architecture
project: Mulat_Media_Website
tags:
  - architecture
  - web
  - cms
  - neon
last_updated: 2026-11-15
---

# 🏛️ Mulat_Media_Website — Architecture

Current architecture since the 2026-11-02 production cutover (commit `5c67cbb`). The previous Supabase architecture and the pre-cutover migration notes are archived in [[archive/ARCHITECTURE_supabase-era|archive/ARCHITECTURE_supabase-era.md]].

## 📐 System & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                 Static site (public/, built by npm run build)          │
│            Vanilla HTML5 / CSS3 / JS  ·  window.MulatSupabase adapter   │
├──────────────────────────┬──────────────────────────┬──────────────────┤
│ Public reader            │ Newsroom (staff)         │ Extras           │
│ - index.html             │ - login.html             │ - wordle.js      │
│ - articles.html + 6 cats │ - submit-*.html (3)      │ - stats-widget.js│
│ - article.html           │ - review-queue.html      │   (Abacus API)   │
└──────────────────────────┴──────────┬───────────────┴──────────────────┘
                                      │ same-origin fetch
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Vercel serverless functions (Node 22)                  │
│  /api/auth/*  → api/auth.js     (restricted Neon Auth proxy)           │
│  /api/newsroom → api/newsroom.js (JWT check + lib/staff.cjs roles, SQL) │
│  /api/media/* → api/media.js    (R2 image streaming, CDN cache, ETag)  │
└──────────────┬──────────────────────────┬──────────────────────────────┘
               ▼                          ▼                         ▼
        Neon Auth (OTP)          Neon Postgres 17            Cloudflare R2
                                 profiles, articles          article photos
```

## 🔐 Auth & Permissions
- Staff sign in with eight preprovisioned Neon Auth email/password accounts; email OTP verification is required; public signup is disabled.
- `api/newsroom.js` verifies the Neon JWT (signature, issuer, audience, expiry, verification and ban state) and checks the server allowlist in `lib/staff.cjs`. Display names and browser-sent roles or author IDs never grant permissions.
- Roles: Jang Mee is EIC and alone manages acknowledgement content; the developer admin manages other sections; six writers manage only their own ordinary articles. Non-editor submissions and edits are set back to `pending`.
- Anonymous readers only get `approved` articles.

## 🗄️ Database (`migrations/001_neon.sql`)
1. **`profiles`**: `id`, `name`, `is_eic`, `can_edit_acknowledgement`, `created_at`.
2. **`articles`**: `id` (identity), `category`, `category_name`, `tag`, `title`, `excerpt`, `body` (`text[]`), `image`, `read_time`, `author_id`, `author_name`, `status` (`pending` | `approved`), `reviewed_at`, `reviewed_by`, `created_at`.
- RLS is enabled and all privileges revoked from `PUBLIC`; there is no Data API and no browser access. Only the server connects.

## 🖼️ Media
- Uploads: `/api/newsroom` (`resource=upload`) returns a short-lived R2 signed PUT URL; JPG, PNG, WebP and GIF up to 10 MB. The stored image path is relative (`/api/media/article-photos/...`).
- Reads: `GET/HEAD /api/media/article-photos/...` streams from R2 with CDN caching, ETags and strict path/type/size checks, so the app does not depend on `r2.dev` or a separate media domain.
- R2 CORS (`docs/r2-cors.json`) allows the exact production and preview origins.

## 📦 Build & Deploy
- `npm run build`: esbuild bundles `assets/js/backend-client.source.js` into `assets/js/supabase-client.js` (the legacy filename and `window.MulatSupabase` global are kept so existing pages work), then `scripts/build-site.cjs` writes `public/`, excluding credentials and server files.
- `vercel.json`: output `public/`, rewrites for `/api/auth/*` and `/api/media/*`, security headers (`nosniff`, `DENY` framing, strict referrer).
- `.vercelignore` excludes `.brain/`, `MulatMedia/`, `database/`, `tests/`, `.migration-backups/` and `.env*`.
- Pushing `main` deploys production automatically.

## 🎮 Wordle Engine (`assets/js/wordle.js`)
- **Daily Mode**: Picks the target word from a curated list using the number of days since a fixed anchor date (sine-based index), so it changes at local midnight. One game per day, with a live midnight countdown; progress and stats in `localStorage`.
- **Practice Mode**: Random 5-letter words with unlimited replays.
