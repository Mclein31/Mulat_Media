# Mulat Media — Campus Journalism Publication & Editorial CMS

Official digital publication platform and editorial content management system for *Mulat Media*, an active student journalism publication.

Live Site: [mulat-media.vercel.app](https://mulat-media.vercel.app/)

---

## ⚡ Tech Stack & Architecture
- **Frontend**: Vanilla semantic HTML5, modular CSS3, and vanilla JavaScript with self-hosted typography (`assets/fonts/`). The browser client adapter (`assets/js/backend-client.source.js`) is bundled with `esbuild` into `assets/js/supabase-client.js` (compatibility filename and `window.MulatSupabase` global).
- **Backend API**: Vercel serverless functions on Node 22 (`api/auth.js`, `api/newsroom.js`, `api/media.js`, `api/feed.js`):
  - **Database**: Neon Postgres 17 (`pg`), schema in `migrations/001_neon.sql` (`public.profiles` and `public.articles` with Row Level Security enabled and all `PUBLIC` privileges revoked; accessed exclusively server-side).
  - **Authentication**: Neon Auth (`@neondatabase/auth`) with email OTP verification through a restricted same-origin proxy (`/api/auth/*` → `api/auth.js`) and server-side JWT verification (`jose`). Public signup is disabled; eight preprovisioned staff accounts and role permissions (Editor-in-Chief, developer admin, and writers) are enforced via `lib/staff.cjs`.
  - **Media Storage**: Cloudflare R2 (`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`) using short-lived signed `PUT` upload URLs (`POST /api/newsroom?resource=upload`) and first-party streaming with CDN caching and ETags at `/api/media/article-photos/*` (`api/media.js`).
- **Editorial Workflow**: Staff submission portals (`submit-article.html`, `submit-special-feature.html`, `submit-acknowledgement.html`), peer review queue (`review-queue.html`), and Editor-in-Chief / developer admin approval. Non-editor submissions and edits are set to `pending`; anonymous readers receive `approved` articles only.
- **RSS Syndication**: Dynamically generated RSS 2.0 feed of published articles served at `/feed.xml` (`api/feed.js`).
- **Gamification**: Interactive Daily Wordle game with midnight countdown reset + Practice mode (`assets/js/wordle.js`).
- **Live Metrics**: Draggable real-time visitor and like counter widget powered by Abacus API (`assets/js/stats-widget.js`).
- **Deployment**: Vercel (`vercel.json` builds static assets into `public/` and routes `/api/*` and `/feed.xml`).

---

## 🛠️ Local Development & Checks
1. Copy `.env.example` to `.env.local` and supply server-side Neon/R2 values locally (never commit `.env*` or credentials).
2. Install dependencies: `npm ci`
3. Build static output (`public/`) and client bundle: `npm run build`
4. Run syntax checks: `npm run lint`
5. Run tests: `npm test`
