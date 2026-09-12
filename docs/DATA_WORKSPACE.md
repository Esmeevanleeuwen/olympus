# Audiences → Data

Data is the first and default source tab inside Audiences. It opens the agreed
database UX demo, including Data, Structure, Connections, Latest change and the
query composer. The Supabase snapshot, Vercel Analytics and imported ERD views
remain separate sources.

The workspace is served from `public/data-workspace/index.html` and mounted by
`components/data-workspace.tsx`. Keeping the existing standalone workspace in an
iframe preserves its interactions and isolates its styles from the dashboard.
Its duplicate Olympus header has been removed; the app provides the outer
navigation and Zeus owner label. It loads on the first Data visit and stays
mounted across source and main-navigation changes.

The server page passes the asset URL with `/olympus` for GitHub Pages exports,
and without that prefix for local development and Vercel. No new dependencies,
environment settings or service credentials are required.

## Available interactions

- Search tables, fields and sample records; follow linked records.
- Inspect the full ERD in Connections, query drafts and Latest change.
- Write supported plain-language requests and edit individual command parts.
- Combine drafts as ordered statements or read queries using real demo foreign
  keys. Ambiguous join paths require a relationship choice.
- Collect drafts locally, copy SQL and download query combinations.
- View before/after snapshots of recorded demo changes. “Add demo field” updates
  only the local sample schema and adds a recent-change entry automatically.

All records are fictional. Nothing connects to Supabase or executes SQL.
Draft collections and combinations use browser local storage. Selection and the
demo change journal stay in memory during navigation and reset on page reload.
This is a bounded query composer, not a general SQL parser or an AI service.

## Quick check

Run `npm run dev`, open Audiences → Data, then visit each database tab. Make a
query, switch to another audience source and back, and confirm it remains there.
Combine reads from articles and users, choose author or reviewer, and inspect
the generated join. In Latest change, use Add demo field and compare Before
with After. No Supabase or Vercel setup is needed for these checks.
