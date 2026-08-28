---
type: project-brain
title: Mulat Media Website Project Context
project: Mulat_Media_Website
status: active
tags:
  - project
  - web
  - cms
  - supabase
  - journalism
  - wordle
last_updated: 2026-08-28
---

# 📰 Mulat_Media_Website — Project Context

## 📌 Overview & Purpose
**Mulat Media** is the official digital publication platform and content management system (CMS) engineered for *Mulat Media*, a student journalism publication. The web platform delivers breaking campus news, editorial opinions, sports coverage, entertainment features, metrostyle articles, and community stories. It includes a complete editorial publishing workflow with student article submissions, a peer review queue, and Editor-in-Chief (EIC) publication approval powered by Supabase. It also features a custom Daily & Practice Wordle game with midnight reset and a draggable live visitor/like counter.

---

## 🎯 Current Objectives & Status
- **Status**: `Active / Production Deployed`
- **Live Deployment**: [mulat-media.vercel.app](https://mulat-media.vercel.app/)
- **Primary Deliverables**: Full-stack dynamic publication with Supabase backend and Vercel edge deployment.

---

## 💻 Tech Stack & Dependencies
- **Frontend Core**: Vanilla Semantic HTML5, Modular CSS3, Vanilla ES6+ JavaScript.
- **Backend-as-a-Service (BaaS)**: **Supabase**:
  - Cloud PostgreSQL database (`articles`, `profiles`, `reviews`, `acknowledgements`).
  - Supabase Auth for staff members and Editor-in-Chief.
  - Supabase Storage (`article-photos` bucket) for article media attachments.
  - Row Level Security (RLS) policies for granular permission enforcement.
- **APIs & Widgets**:
  - **Abacus Count API** (`assets/js/stats-widget.js`): Real-time site visits and like counters.
  - **Wordle Game Engine** (`assets/js/wordle.js`): Deterministic daily Wordle with midnight reset + practice mode.
- **Typography**: Google Fonts (Playfair Display, DM Sans, League Spartan, Merriweather, Source Serif 4).

---

## 📂 Key Files & Structure
- `index.html`: Publication homepage with breaking news banner, hero article carousel, latest category grid, Wordle game modal, and stats widget.
- `articles.html` & `article.html`: Dynamic category browsing and individual article reading view with URL query parameter parsing.
- `submit-article.html`: Article submission portal for student writers with image upload and category tagging.
- `review-queue.html`: Editorial peer-review interface where editors review drafts, request revisions, or approve articles.
- `login.html`: Secure authentication interface for editorial staff.
- `members.html` & `members/*.html`: Staff directory and individual author profile pages.
- `assets/js/`:
  - `supabase-client.js`: Supabase SDK initialization, authentication helpers, and CRUD methods.
  - `newsroom.js`: Newsroom workflow controller and category management.
  - `wordle.js`: Interactive Wordle game with countdown timer and local persistence.
  - `stats-widget.js`: Draggable floating stats widget tracking visits and likes.
  - `article-page.js`: Dynamic rendering of single article pages from Supabase data.
- `database/`:
  - `mulat_media_supabase_schema.sql`: Base tables, profiles, articles, and RLS policies.
  - `mulat_media_peer_review_migration.sql`: Peer review system, storage bucket, and EIC permission migrations.

---

## 🔗 Related Projects & Links
- 🌐 [[Personal Website]] — Showcases *Mulat Media* as featured project #1 in the 3D coverflow carousel.
- 🗺️ [[_BRAIN/PROJECT_INDEX|Master Project Index]]
- 📊 [[_BRAIN/CROSS_PROJECT_MAP|Cross-Project Map]]
- 🐙 **Repository**: [github.com/Mclein31/Mulat_Media](https://github.com/Mclein31/Mulat_Media.git)

---

## ⚠️ Known Limitations
- Supabase free tier storage bucket limits must be monitored for high-resolution article photo uploads.
