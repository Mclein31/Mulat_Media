---
type: todo-list
title: Mulat Media Tasks & Backlog
project: Mulat_Media_Website
tags:
  - todo
  - backlog
last_updated: 2026-11-16
---

# 📋 Mulat_Media_Website — TODO & Task Tracker

## 🔴 High Priority
- [ ] Have the seven staff complete first-login email verification and change their initial passwords; test review-queue permissions with a real non-admin account. (Accounts are provisioned on Neon Auth; only the developer admin has been verified live.)
- [ ] Configure a custom SMTP sender for login codes once the publication mailbox owner is available (see [[NOTES]]).

## 🟡 Medium Priority
- [ ] Retire the old Supabase project and its Vercel settings after the rollback window, keeping `.migration-backups/`.

## 🟢 Low Priority

## 💡 Future Ideas
- [ ] Student comment section with moderation queue and spam detection.
- [ ] Push notification alerts for breaking campus news announcements.

## ✅ Done
- [x] Implement article search filter with live debounce (originally planned on Supabase full-text search; would now go through `/api/newsroom` and Neon Postgres). — done 2026-11-16: Added parameterized, length-capped `q` filter (`status='approved'` only) in `api/newsroom.js`, `searchArticles` in `assets/js/backend-client.source.js`, and 250ms debounced accessible search UI on `articles.html` (`articles.css`, `assets/js/newsroom.js`) with Node tests (`tests/search.test.cjs`).
- [x] Review the seven low-severity transitive `npm audit` findings. — done 2026-11-16: Reviewed all 7 findings (`npm audit --json` + `npm audit fix --dry-run`); all share one transitive chain from `@neondatabase/auth@0.6.0-beta` with no non-breaking fix available (`--force` refused; `package.json`/`package-lock.json` unchanged):
  1. `deepmerge` (`>=4.2.0 <=4.3.1`, GHSA-gcqx-w48m-w2h4, prototype poisoning in `mergeObject()`): kept at `4.3.1` (latest; no upstream patch exists).
  2. `html-to-text` (`6.0.0 - 9.0.5`, via `deepmerge`): kept at `9.0.5` (v10 is a major change required only by `@react-email/render@^2.3.1`).
  3. `@react-email/render` (`0.0.4 - 2.1.1`, via `html-to-text`): kept at `2.0.6` (pinned exact by `@react-email/components@1.0.12`).
  4. `@react-email/components` (`*`, via `@react-email/render`): kept at `1.0.12` (already latest; no newer non-breaking release).
  5. `@daveyplate/better-auth-ui` (`>=1.2.0`, via `@react-email/components`): kept at `3.4.0` (depends on `@react-email/components@^1.0.10`; unused by browser bundle).
  6. `@neondatabase/auth-ui` (`*`, via `@daveyplate/better-auth-ui` & `@neondatabase/auth`): kept at `0.4.0-beta` (not imported by `assets/js/backend-client.source.js`).
  7. `@neondatabase/auth` (`*`, direct `0.6.0-beta`, via `@neondatabase/auth-ui`): kept at `0.6.0-beta` (`0.7.0-beta` also pulls `@neondatabase/auth-ui@0.4.0-beta`; client bundle only imports `createAuthClient` & `BetterAuthVanillaAdapter`).
- [x] Update `README.md`, which still describes the Supabase backend. — done 2026-11-16: Rewrote `README.md` for Neon Postgres, Neon Auth proxy, Cloudflare R2 media streaming, `/feed.xml`, and local build/lint/test scripts.
- [x] Add RSS feed generator (`feed.xml`) for syndication with student news aggregator apps. — done 2026-11-16: Added `api/feed.js` queried from Neon `status='approved'` articles, routed `/feed.xml` in `vercel.json`, and linked `<link rel="alternate" type="application/rss+xml">` across public HTML pages.
- [x] Add social media share buttons (Facebook, X, LinkedIn, Copy Link) on `article.html`. — done 2026-11-16: Added zero-tracker intent links and accessible Copy Link control in `article.html`, `articles.css`, and `assets/js/article-page.js`.
- [x] Add estimated reading progress indicator bar at the top of long-form articles. — done 2026-11-16: Added `role="progressbar"` top indicator in `article.html`/`articles.css`/`assets/js/article-page.js` shown only on long articles with `prefers-reduced-motion` support.
- [x] Prevent unapproved drafts from appearing publicly: the server returns only `status='approved'` articles to anonymous readers (covered by `tests/api.test.cjs`). Replaces the Supabase-era "verify RLS policies" item.
- [x] Create staff accounts: eight Neon Auth accounts provisioned 2026-11-02 (replaces "onboard staff with Supabase member accounts").
- [x] Migrate backend from Supabase to Neon + R2 and deploy to production (2026-11-02, `5c67cbb`).
- [x] Self-host all fonts instead of Google Fonts (2026-11-05, `eeb411c`).
