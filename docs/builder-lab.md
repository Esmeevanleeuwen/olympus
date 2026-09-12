# Olympus Builder Lab

Builder Lab is the safe customization layer for Olympus. It is intentionally separate from the real dashboard source so experiments cannot accidentally change Supabase, Vercel, GitHub or the current workspace layout.

## Current workflow

1. **Select a feature** from the Feature Map or click it directly in the live canvas.
2. **Inspect its origin** to see what the feature is, which source file builds it and which CSS selector styles it.
3. **Customize the preview** with local controls for sidebar width, gaps, corner radius, UI scale, density, visibility and module order.
4. **Export the draft** as JSON. The draft is also stored locally in the browser under `olympus-builder-lab-v01`.

The Builder Lab currently does **not** write changes back to source code. That boundary is deliberate while the editor is still a testing environment.

## Source map

- `components/dashboard.tsx` — main Olympus dashboard structure and interaction.
- `app/globals.css` — main visual system and layout rules.
- `lib/workspace.ts` — resource, snapshot and local-layout model.
- `components/vercel-analytics.tsx` — Vercel analytics interface.
- `components/builder-lab.tsx` — the test builder itself.

## Next stages

The next useful step is a real element-inspection layer: clicking an element in the actual dashboard should resolve it to a component, file and selector automatically. After that, Builder Lab can create a source-change draft, show the exact diff, and only then offer an explicit GitHub commit or pull request. This keeps inspection, experimentation and source editing as separate steps.
