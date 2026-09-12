# Audiences → Data

Data is the first and default source tab inside Audiences. It opens the agreed
database UX demo, including Data, Structure, Connections, Latest change and the
query composer. The Supabase snapshot, Vercel Analytics and imported ERD views
remain separate sources.

The workspace is served from `public/data-workspace/index.html` and mounted by
`components/data-workspace.tsx`. Keeping the existing standalone workspace in an
iframe preserves its interactions and isolates its styles from the dashboard.
Its duplicate Olympus header has been removed; the app provides the outer
navigation and Zeus owner label. It loads when the main sidebar needs table metadata, or on the first Data
visit, and stays mounted across source and main-navigation changes.

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

## Customizable sidebar

The main navigation is a fixed icon rail with a collapsible panel. Use its
arrow, drag the edge handle, or swipe horizontally. On narrow screens, the
panel opens over the workspace and closes after choosing a table.

Layout → Sidebar controls the Data tables section, table search, row counts
and desktop collapse preference. Settings are saved with the existing local
layout; old layouts receive defaults without losing their blocks or Suite
settings. Suite tools keep their separate controls under Suite sidebar.

When Data tables is enabled, the embedded table browser moves into the main
sidebar. Turning it off restores the browser inside Data. Both use the same
demo state. The frame sends table names, row/field counts and the current
selection through a bridge that checks the message source and origin. The
host can select a known table or change docking; it cannot send SQL through
this bridge. No records or credentials are shared.
