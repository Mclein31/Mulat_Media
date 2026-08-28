---
project: MulatMedia
type: requirements
status: active
created: 2026-08-28
updated: 2026-08-28
tags:
  - security
---

# Security & RLS Requirements

- Public users can only read `status = 'published'` articles.
- Only authenticated members in `profiles` can view `review-queue.html`.
- Only `is_eic = true` profiles can mutate article status to `published`.
