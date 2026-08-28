---
project: MulatMedia
type: architecture
status: completed
created: 2026-08-28
updated: 2026-08-28
tags:
  - architecture
  - supabase
---

# System Architecture

```
┌────────────────────────────────────────────────────────┐
│                 Mulat Media Web Client                 │
│         (HTML5 / CSS3 / ES6+ JS on Vercel)             │
├──────────────────────────┬─────────────────────────────┤
│ Public Pages:            │ Editorial Management:       │
│ - index.html (Homepage)  │ - submit-article.html       │
│ - articles.html (Browse) │ - review-queue.html         │
│ - article.html (Reader)  │ - login.html                │
└──────────────────────────┴──────────────┬──────────────┘
                                          │
                                          ▼
┌────────────────────────────────────────────────────────┐
│                Supabase Cloud Platform                 │
├──────────────────────────┬─────────────────────────────┤
│ Supabase Auth            │ PostgreSQL Database         │
│ - Staff Member Login     │ - profiles & articles       │
│ - JWT Session Tokens     │ - reviews & audit tables    │
├──────────────────────────┴─────────────────────────────┤
│ Storage: article-photos bucket (Public CDN)            │
└────────────────────────────────────────────────────────┘
```
