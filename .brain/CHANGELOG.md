---
type: changelog
title: Mulat Media Changelog
project: Mulat_Media_Website
tags:
  - changelog
  - history
last_updated: 2026-11-16
---

# 📜 Mulat_Media_Website — Changelog

## 2026-11-16 — Article search & npm audit review
- **Added**: Parameterized, length-capped `q` search filter (`title`, `excerpt`, `author_name`, approved articles only) in `api/newsroom.js`, `searchArticles` in `assets/js/backend-client.source.js`, and an accessible 250ms debounced search bar with loading/empty/no-results/error states on `articles.html` (`articles.css`, `assets/js/newsroom.js`).
- **Added**: API and UI regression tests in `tests/search.test.cjs`.
- **Reviewed**: All 7 low-severity `npm audit` findings (`deepmerge` → `html-to-text` → `@react-email/render` → `@react-email/components` → `@daveyplate/better-auth-ui` → `@neondatabase/auth-ui` → `@neondatabase/auth`); no non-breaking fix available, left dependencies unchanged and recorded outcomes in `TODO.md`.

## 2026-11-16 — README update, RSS feed, share bar, and reading progress
- **Changed**: Rewrote `README.md` to document the Neon Postgres, Neon Auth proxy, Cloudflare R2, and Vercel API architecture plus local build/lint/test commands.
- **Added**: RSS 2.0 feed endpoint (`api/feed.js`) serving approved articles, `/feed.xml` rewrite in `vercel.json`, and `<link rel="alternate" type="application/rss+xml">` discovery tags on public HTML pages.
- **Added**: Zero-tracker share buttons (Facebook, X, LinkedIn, Copy Link) and a top reading-progress bar on long articles (`article.html`, `articles.css`, `assets/js/article-page.js`) with ARIA attributes, keyboard accessibility, and `prefers-reduced-motion` support.
- **Added**: Regression tests in `tests/feed.test.cjs` and `tests/article-page.test.cjs`.

## 2026-11-15 — Brain cleanup
- Rewrote `PROJECT_CONTEXT.md` and `ARCHITECTURE.md` for the live Neon Postgres + Neon Auth + Cloudflare R2 backend (they still described Supabase as current). Corrected schema (no `reviews` table or `slug`; status is `pending`/`approved`), fonts (self-hosted, Source Sans 3 not Source Serif 4), and added the API, build, test and deploy layout.
- Archived verbatim: old architecture (`archive/ARCHITECTURE_supabase-era.md`), the migration status log and Supabase storage limitation (`archive/PROJECT_CONTEXT_migration-log-2026-11-02.md`), and Supabase credentials + sign-in outage notes (`archive/NOTES_supabase-era.md`).
- `DECISIONS.md`: marked the Supabase decision superseded, added status notes to the Neon decisions, and flagged dates that predate the git history.
- `TODO.md`: moved account provisioning, approved-only public reads, migration and font self-hosting to Done; added SMTP, staff verification, Supabase retirement and README items. FLOW.json validated, no changes.

## 2026-11-05 — Self-hosted fonts (from git log)
- **Changed**: All fonts self-hosted under `assets/fonts/` instead of Google Fonts (`eeb411c`).

## 2026-11-02 — Backend migration to Neon + R2 (from git log and docs)
- **Changed**: Backend moved from Supabase to Neon Postgres, Neon Auth and Cloudflare R2 behind Vercel API functions (`5c67cbb`); live in production the same day.
- **Added**: Preprovisioned staff accounts, server-side role allowlist, `/api/media` streaming, Node test suite, `npm run build` to `public/`.

## [2.1.0] — 2026-08-27 — Wordle Midnight Reset & Editorial Migration
- **Added**: Daily Wordle gameplay limit with live midnight countdown timer (`wordle.js`).
- **Added**: Editorial peer review database migration (`mulat_media_peer_review_migration.sql`) and storage bucket setup.
- **Added**: Draggable floating stats widget with live visit and like counters (`stats-widget.js`).

## [2.0.0] — 2026-08-20 — Supabase Full-Stack Integration
- **Added**: Supabase PostgreSQL database schema with profiles, articles, and reviews tables.
- **Added**: Dynamic single article reader page (`article.html`, `article-page.js`).
- **Added**: Article submission workflow (`submit-article.html`) and review queue (`review-queue.html`).

## [1.0.0] — 2026-08-15 — Initial Static Release
- **Added**: Homepage (`index.html`), category pages (`articles.html`), and member bios (`members.html`).
