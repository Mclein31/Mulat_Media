---
type: architecture
title: Mulat Media Architecture
project: Mulat_Media_Website
tags:
  - architecture
  - web
  - cms
  - supabase
last_updated: 2026-08-28
---

# 🏛️ Mulat_Media_Website — Architecture

## 📐 System & Data Flow Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Mulat Media Web Client                        │
│                   (Semantic HTML5 / Modular CSS3 / ES6+)               │
├──────────────────────────┬──────────────────────────┬──────────────────┤
│ Public Reader View       │ Editorial CMS Workflow   │ Student Hub      │
│ - index.html (Homepage)  │ - login.html             │ - wordle.js      │
│ - articles.html (Browse) │ - submit-article.html    │ - stats-widget.js│
│ - article.html (Reader)  │ - review-queue.html      │ - members.html   │
└──────────────────────────┴──────────┬───────────────┴──────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Supabase Cloud Platform                         │
├──────────────────────────┬──────────────────────────┬──────────────────┤
│ Supabase Auth            │ PostgreSQL Database      │ Supabase Storage │
│ - Staff Login & Session  │ - profiles (roles/EIC)   │ - article-photos │
│ - JWT Token Validation   │ - articles (content/tag) │   bucket         │
│                          │ - reviews & audit log    │                  │
└──────────────────────────┴──────────────────────────┴──────────────────┘
```

---

## 🗄️ Supabase Database Architecture
1. **`profiles`**: Links to `auth.users`, storing member full names, Editor-in-Chief status (`is_eic`), and permissions (`can_edit_acknowledgement`).
2. **`articles`**:
   - `id`, `title`, `slug`, `excerpt`, `body`, `image` (Storage URL), `category` (e.g. `news-current-affairs`, `opinion`, `sports`), `tag`, `read_time`, `author_name`, `status` (`draft`, `pending_review`, `published`), `created_at`.
3. **`reviews`**: Editorial feedback, review status, reviewer ID, and timestamps.
4. **Storage Bucket**: `article-photos` configured with public read access and authenticated upload policy.

---

## 🎮 Wordle Engine Architecture (`wordle.js`)
- **Daily Mode**: Selects target word from a curated word list using a deterministic hash of the current calendar date (`YYYY-MM-DD`). Enforces one game per day with a live midnight countdown timer.
- **Practice Mode**: Generates random 5-letter words with unlimited replays for casual student engagement.
