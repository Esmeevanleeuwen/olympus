# Olympus — Workspace

A small, interactive Next.js + TypeScript workspace. Zeus is the visual owner. The Vercel Analytics section has separate owner access; the rest of the workspace remains a design foundation.

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

**Audiences → Vercel Analytics** can read live traffic from one configured Vercel project. Follow [the Vercel setup steps](docs/VERCEL_ANALYTICS.md) to add the server credentials and owner password. Missing settings leave analytics unavailable, rather than displaying invented counts.

Record editing, GitHub writes, deployment actions and AI judgement are not implemented. Public repository references are not live connection indicators. The app does not inherit the connectors available in ChatGPT.

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

## Additional integrations

Vercel Analytics checks the owner session on every request and restricts access to the server-configured project. Any further live integration must also enforce server-side authorization and retain the source identity. Never expose Supabase secret/service-role keys, GitHub tokens or Vercel tokens in the client. A Zeus avatar alone is not access control.

## Verification status

The offline UI preview and pure TypeScript model were tested: filtering, dialogs, charts, block editing, snapshot validation, local persistence and responsive layout. The offline harness uses the installed React 16 UMD renderer; production source targets React 19.

The test suite includes 15 existing snapshot/model tests and 12 analytics tests. Analytics checks cover signed sessions, failed access, fixed project scope, date ranges, distinct visitor totals, missing values, errors and component rendering using synthetic Vercel responses. Live figures still require verification with your configured token. No live Supabase connection is included.
