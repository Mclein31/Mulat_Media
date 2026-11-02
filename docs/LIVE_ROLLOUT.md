# Production preparation — 2026-11-02

Preview: https://mulat-media-ikdpaidpp-mc-lein-jei-onza.vercel.app
Vercel deployment: dpl_G7pusqNne37oqE5HYzLiQZcHTW9T (READY, protected preview).
Public production domain remains https://mulat-media.vercel.app on the old deployment.

## Completed

- User approved copying backend settings into Vercel and creating a preview.
  Workspace linked to existing project prj_RxJ3Zm3nVRzSCv1JMyzokHsvH7U9 only.
- Eight Neon/R2 settings saved as secrets in production and preview. Old Supabase
  settings retained for rollback. No source database credential uploaded.
- Production build and clean dependency install pass; Node 22 runtime pinned.
  Eighteen regression tests pass. Audit has no high/critical findings; seven low
  transitive findings remain.
- Restricted same-origin Auth proxy avoids third-party cookie dependence.
  Real developer email verification, sign-in, restored session, JWT-backed roles,
  password-change endpoint and logout verified. Existing password retained.
- Safari HTTPS preview sign-in reached the Developer Admin Change Password
  panel and restored the account after a full reload.
- Deployed preview verified: config/auth rewrites, unsigned access denial,
  sign-in, cookie restoration, JWT-backed Developer Admin role, editor-only
  acknowledgement restriction, temporary article create/edit/delete, and logout.
- Production media is now /api/media/article-photos/... on the website's own
  domain. It streams images from R2 with CDN caching, ETags and type/path/size
  restrictions. It does not depend on the rate-limited r2.dev public endpoint.
- All three migrated photos matched backup hashes through the deployed preview.
  R2 CORS includes exact production and preview origins. Deployed signed upload,
  preview preflight, PUT and same-origin retrieval verified byte-for-byte.
  Temporary test rows and images removed.
- Public build excludes credentials, initial passwords, backups and server code.
  Private migration backups remain local in ignored .migration-backups/.

## Deferred with the user

The publication email account owner is unavailable. Custom SMTP cannot be
configured yet; leave Neon's tested shared OTP sender in place for preview.
When the user supplies access, configure an appropriate production sender and
send/verify a fresh test code. Do not collect the mailbox's primary password.

The app can use mulat-media.vercel.app; no website/media domain purchase is needed.

## Before promoting production

1. User explicitly approved launching with Neon’s current shared sender for now.
   Keep email verification enabled; switch SMTP when the mailbox owner is available.
2. Have the owner review the protected preview (Vercel sign-in may be required).
   Other seven accounts still verify email on first login and can change their
   initial passwords. Signup remains disabled. Jang Mee alone manages
   acknowledgement; developer admin manages other sections; writers own work only.
3. Obtain instruction to promote the tested preview to production. Do not push
   main merely to test; main automatically deploys publicly. No production
   promotion or Git push was performed during this preparation.
4. After promotion, verify the public domain and retain Supabase/backups through
   the rollback window.

## Server variables configured in Vercel

DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_JWKS_URL, R2_ACCOUNT_ID,
R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL.
R2_PUBLIC_URL is retained for migration compatibility; application uploads return
relative /api/media URLs so production and preview each use their own hostname.

Local changes are not committed. Several earlier migration files were already
staged by the user; re-stage the final files (including api/media.js and its
tests) before committing. A direct CLI preview deployment does not push Git.

## User rollout decision — 2026-11-02

User chose to keep the tested shared sender for launch and requested commands
to push main themselves. No agent Git push or production promotion performed.
When the mailbox owner is available, use a dedicated Gmail app password with
2-Step Verification, configure Neon custom SMTP, and verify a fresh OTP before
considering the sender switch complete. Never request the mailbox’s primary
password, recovery codes, or unrelated account access.
