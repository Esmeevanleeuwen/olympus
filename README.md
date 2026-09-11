# Olympus — Workspace

A deliberately small, interactive Next.js + TypeScript design foundation. Zeus is the visual owner; this is not yet an authenticated administration console.

Read [the design notes](docs/DESIGN.md) before adding features.

## Run

Use Node.js 22 or newer:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Dependency versions are pinned in package.json and package-lock.json.

```sh
npm run test
npm run typecheck
npm run build
```

## What works

Platform selection; source filtering; resource search; table and bar views; source details; local snapshot import; adding, renaming, reordering and removing blocks; draft notes; the Audiences snapshot dashboard; local layout persistence; layout export and reset; optional Suite sidebar controls.

No live service connection, record editing, GitHub writes, deployment actions, analytics or AI judgement are implemented. Public repository references are not live connection indicators. The app does not inherit the connectors available in ChatGPT.

## Data and privacy

The starter contains only public GitHub references. The private data snapshot is provided separately to the owner and is not committed. Import it with **Import snapshot**. Parsing is local; no data is uploaded. Imported snapshot resources stay in memory and disappear on reload. The separately supplied offline preview contains a saved snapshot; it is not a live connection.

Draft text and layout are stored in localStorage; do not use drafts for confidential content. Export layout exports drafts, never the imported snapshot.

Tables are not assigned to platforms by guessing their names. Two databases can contain similarly named tables, so each row retains its source and no cross-project total is computed. Vercel project-to-repository links appear only when present in the inspected metadata. A null link remains unassigned.

### Snapshot contract

A JSON object with `version: 1`, an ISO `capturedAt` string and a `resources` array. Each resource has `id`, `name`, `provider` (`supabase`, `github`, `vercel`), `kind` (`table`, `repository`, `project` respectively), `source`, `platform` (known platform id or null), `detail`, `count` (nonnegative integer or null; Supabase only), `capturedAt` (ISO timestamp or null) and `url` (HTTPS link on github.com, vercel.com or supabase.com, or null). See `lib/workspace.ts` for validation. Up to 300 references and a 1 MB import limit.

## Structure

- `app/`: minimal Next.js route, layout and CSS design tokens.
- `components/dashboard.tsx`: client workspace and reusable panels/dialogs.
- `lib/workspace.ts`: typed model, validation, filtering and immutable ordering.
- `tests/model.test.cjs`: model validation and privacy boundary tests.
- `docs/DESIGN.md`: UI decisions and limits.

The client component uses React's supported class lifecycle so the same UI can be inspected in an offline preview harness. It can be decomposed into smaller feature modules without changing the data contract.

## Before live integrations

Add owner authentication, server-side authorization on every resource, least-privilege provider adapters and an audit log. Never expose Supabase secret/service-role keys, GitHub tokens or Vercel tokens in this client. A Zeus avatar is not access control. Keep the source project/table identity in every API result.

## Verification status

The offline UI preview and pure TypeScript model were tested: filtering, dialogs, charts, block editing, snapshot validation, local persistence and responsive layout. The offline harness uses the installed React 16 UMD renderer; production source targets React 19.

The Audiences update passes all 15 model tests, TypeScript checks and a production Next.js build. A component rendering check covers project separation, unavailable and zero counts, searching beyond the first six tables, a stable chart scale and the empty import state. No live Supabase connection is included.
