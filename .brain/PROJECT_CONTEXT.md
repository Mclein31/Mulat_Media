---
type: project-brain
title: Mulat Media Website Project Context
project: Mulat_Media_Website
status: active
tags:
  - project
  - web
  - cms
  - neon
  - journalism
  - wordle
last_updated: 2026-11-16
---

# 📰 Mulat_Media_Website — Project Context

## 📌 Overview & Purpose
**Mulat Media** is the digital publication platform and content management system (CMS) for *Mulat Media*, a student journalism publication. It publishes campus news, opinion, sports, entertainment, metrostyle and campus-press articles, special features and an acknowledgement page. Staff submit articles through a newsroom; non-editor submissions and edits go to a review queue where the Editor-in-Chief (EIC) approves them. It also has a Daily & Practice Wordle game with a midnight reset and a draggable visit/like counter.

---

## 🎯 Current Objectives & Status
- **Status**: `Active / Production Deployed`
- **Live Deployment**: [mulat-media.vercel.app](https://mulat-media.vercel.app/)
- **Backend**: Migrated from Supabase to **Neon Postgres + Neon Auth + Cloudflare R2**, served through Vercel API functions. Pushed as commit `5c67cbb` and confirmed in production on 2026-11-02 (deployment `dpl_DX82gz8xYQvTXsLgpBUCnSWKynSC`).
- **Migrated data**: 7 profiles, 0 articles and 3 photos copied from Supabase and verified; backups in the gitignored `.migration-backups/`.
- **Accounts**: Eight preprovisioned Neon Auth accounts (seven staff + developer admin); public signup disabled. Initial passwords are never stored in the repo or brain.
- **Open items**: custom SMTP sender (deferred until the publication mailbox owner is available; Neon's shared sender is in use by user choice), staff first-login verification, and retiring Supabase after the rollback window. See [[TODO]].
- Full migration evidence and history: `docs/BACKEND_MIGRATION.md` and `docs/LIVE_ROLLOUT.md` in the repo; the earlier status log is archived at [[archive/PROJECT_CONTEXT_migration-log-2026-11-02|archive/PROJECT_CONTEXT_migration-log-2026-11-02.md]].

---

## 💻 Tech Stack & Dependencies
- **Frontend Core**: Vanilla semantic HTML5, modular CSS3, vanilla JavaScript (no framework).
- **Backend**: Vercel serverless functions on Node 22 (`api/auth.js`, `api/newsroom.js`, `api/media.js`, `api/feed.js`).
  - **Database**: Neon Postgres 17 (dedicated project `mulat-media`, `blue-bread-38604486`, AWS Singapore) via `pg` 8.23.1. Schema in `migrations/001_neon.sql` (`profiles`, `articles`).
  - **Auth**: Neon Auth (`@neondatabase/auth` 0.6.0-beta) with email OTP verification; JWTs verified server-side with `jose`.
  - **Media**: Cloudflare R2 via `@aws-sdk/client-s3` / `s3-request-presigner` (signed PUT uploads; reads streamed through `/api/media`).
- **Build**: `esbuild` bundles `assets/js/backend-client.source.js` into `assets/js/supabase-client.js`, then `scripts/build-site.cjs` writes the static site to `public/` (Vercel output directory).
- **Tests**: `npm test` (Node test runner, `tests/*.test.cjs`; 18 tests at the 2026-11-02 rollout). `npm run lint` runs a syntax check.
- **APIs & Widgets**:
  - **Abacus Count API** (`abacus.jasoncameron.dev`, `assets/js/stats-widget.js`): site visit and like counters.
  - **Wordle Game Engine** (`assets/js/wordle.js`): deterministic daily Wordle with midnight reset + practice mode, stats in `localStorage`.
- **Typography**: Self-hosted since 2026-11-05 (`assets/fonts/fonts.css`): Playfair Display, DM Sans, League Spartan, Merriweather, Source Sans 3.

---

## 📂 Key Files & Structure
- `index.html`: Publication homepage with Wordle game and stats widget.
- `articles.html`, `articles/*.html` & `article.html`: Category browsing (six category pages) and the single-article reader.
- `submit-article.html`, `submit-special-feature.html`, `submit-acknowledgement.html`: Staff submission forms.
- `review-queue.html`: Review interface for pending submissions.
- `login.html`: Staff sign-in, email verification and password change.
- `about.html`, `mission.html`, `vision.html`, `core-values.html`, `special-features.html`, `acknowledgement.html`: Static/info pages.
- `members.html` & `members/*.html`: Staff directory and seven individual staff profile pages.
- `api/`: `auth.js` (same-origin Neon Auth proxy), `newsroom.js` (config, eligibility, member, upload and articles CRUD), `media.js` (R2 image streaming).
- `lib/staff.cjs`: Server-owned email-to-role mapping (staff, EIC, developer admin).
- `assets/js/`: `backend-client.source.js` (browser adapter source), `supabase-client.js` (build output, legacy filename kept for page compatibility), `newsroom.js`, `article-page.js`, `wordle.js`, `stats-widget.js`.
- `migrations/001_neon.sql`: Current Neon schema. `database/*.sql`: Legacy Supabase schema, members, seed and peer-review migration (local only; `database/` is gitignored).
- `scripts/migrate-backend.cjs`: One-off Supabase → Neon/R2 data and media migration.
- `docs/`: `BACKEND_MIGRATION.md`, `LIVE_ROLLOUT.md`, `r2-cors.json`.
- `MulatMedia/`: The project's Obsidian vault (excluded from deploys by `.vercelignore`).

---

## 🔗 Related Projects & Links
- 🌐 [[Personal Website]] — Showcases *Mulat Media* as the fifth card in the Work gallery.
- 🗺️ [[_BRAIN/PROJECT_INDEX|Master Project Index]]
- 📊 [[_BRAIN/CROSS_PROJECT_MAP|Cross-Project Map]]
- 🐙 **Repository**: [github.com/Mclein31/Mulat_Media](https://github.com/Mclein31/Mulat_Media.git)

---

## ⚠️ Known Limitations
- Login email codes come from Neon's shared sender until a custom SMTP sender is configured.
- Pushing to `main` deploys to production automatically; do not push just to test.
- Seven low-severity transitive `npm audit` findings remained at the 2026-11-02 rollout.
