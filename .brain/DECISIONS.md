---
type: decisions-log
title: Mulat Media Decisions
project: Mulat_Media_Website
tags:
  - decisions
  - web
  - cms
  - supabase
last_updated: 2026-08-28
---

# ⚖️ Mulat_Media_Website — Technical Decisions

## 2025-01-20 — Supabase BaaS for Publication CMS

### Decision
Use Supabase (Cloud PostgreSQL + Supabase Auth + Supabase Storage) as the backend-as-a-service instead of building a standalone custom Express backend.

### Reason
Provided instant Row Level Security (RLS), managed user authentication for student editors, structured SQL relational tables for articles, and instant CDN media storage with zero server maintenance.

### Alternatives
- **Custom Node/Express Backend**: Would require hosting a database, managing auth sessions manually, and provisioning S3 storage.
- **Firebase / Firestore**: NoSQL document structure makes relational category queries and editorial review workflows more cumbersome than SQL.

### Consequences
Fast development velocity and high reliability on Vercel + Supabase infrastructure.

---

## 2025-02-12 — Daily Wordle Engagement Game Integration

### Decision
Build a custom daily Wordle game module (`wordle.js`) directly integrated into the student publication website.

### Reason
Drives recurring daily traffic from students and campus readers, boosting overall publication readership and engagement.

### Alternatives
- Embedding a third-party iframe (lacks custom Mulat branding and theme sync).

### Consequences
Significant increase in daily active readers and positive reader feedback.
