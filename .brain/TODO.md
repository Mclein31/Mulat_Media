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
- [ ] Implement article search filter with live debounce (originally planned on Supabase full-text search; would now go through `/api/newsroom` and Neon Postgres).

## 🟢 Low Priority
- [ ] Review the seven low-severity transitive `npm audit` findings.

## 💡 Future Ideas
- [ ] Student comment section with moderation queue and spam detection.
- [ ] Push notification alerts for breaking campus news announcements.

## ✅ Done
- [x] Update `README.md`, which still describes the Supabase backend. — done 2026-11-16: Rewrote `README.md` for Neon Postgres, Neon Auth proxy, Cloudflare R2 media streaming, `/feed.xml`, and local build/lint/test scripts.
- [x] Add RSS feed generator (`feed.xml`) for syndication with student news aggregator apps. — done 2026-11-16: Added `api/feed.js` queried from Neon `status='approved'` articles, routed `/feed.xml` in `vercel.json`, and linked `<link rel="alternate" type="application/rss+xml">` across public HTML pages.
- [x] Add social media share buttons (Facebook, X, LinkedIn, Copy Link) on `article.html`. — done 2026-11-16: Added zero-tracker intent links and accessible Copy Link control in `article.html`, `articles.css`, and `assets/js/article-page.js`.
- [x] Add estimated reading progress indicator bar at the top of long-form articles. — done 2026-11-16: Added `role="progressbar"` top indicator in `article.html`/`articles.css`/`assets/js/article-page.js` shown only on long articles with `prefers-reduced-motion` support.
- [x] Prevent unapproved drafts from appearing publicly: the server returns only `status='approved'` articles to anonymous readers (covered by `tests/api.test.cjs`). Replaces the Supabase-era "verify RLS policies" item.
- [x] Create staff accounts: eight Neon Auth accounts provisioned 2026-11-02 (replaces "onboard staff with Supabase member accounts").
- [x] Migrate backend from Supabase to Neon + R2 and deploy to production (2026-11-02, `5c67cbb`).
- [x] Self-host all fonts instead of Google Fonts (2026-11-05, `eeb411c`).
