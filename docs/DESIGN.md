# Olympus / Design 0.2

## Purpose
A small, expandable workspace owned visually by Zeus. This iteration explores navigation and composition, not judgement, psychological profiling, analytics inference or remote administration.

## Composition
A 208px sidebar contains Overview, Audiences and Layout. A 72px top bar contains the platform selector and owner identity. The main area starts with a short heading, followed by source tabs and a two-column grid: a larger resource panel and a smaller reusable block. There are no KPI cards, theatrical artwork or invented activity feeds.

The resource panel switches between a table and zero-based bars. Search, source selection and an explicit database selector reveal a little information at a time. Selecting an item opens a focused detail dialog. Platform changes filter only confirmed mappings; unassigned database tables are never silently assigned to a website.

The secondary area starts blank. Add a reusable block, rename it, choose Blank or Note, write optional text, move it up or down, or remove it. Lorem ipsum appears only as an input placeholder.

Audiences has two keyboard-accessible tabs: **Supabase** and **Vercel Analytics**. Supabase contains the saved snapshot view. A required project selector keeps databases separate. Up to three clickable summary cards show separately named table counts for the selected project. Counts from unrelated tables are never summed; unavailable counts remain unknown. The table list is searchable and always uses simple zero-based bars. Opening a table shows its source, exact stored count and the read-only count query. When no snapshot is loaded, the page shows one clear import action instead of invented audience data.

Vercel Analytics starts with one configured project, an owner-password gate and a 7/30-day selector. Two cards show visitors and page views for the selected production period. A zero-based daily bar chart includes a readable data table; two breakdown tables show popular pages and referrers. Refresh reloads the report and updates its timestamp. Loading, missing settings, denied access, empty traffic and upstream errors have separate states. Missing values remain unknown. Its 16px body text and 14px controls retain the existing dark surfaces and violet accents.

Layout contains two inner tabs. **Layout & data** keeps the existing local storage, snapshot and reset controls. **Suite sidebar** controls an optional group of experimental tools. The whole group can be hidden, and Scratchpad, Data inspector, API sandbox and Command shelf can be shown separately. Enabled tools appear under a clearly marked `SUITE · TEST SPACE` section in the main sidebar. They are interface slots only and do not run external actions.

## Visual system
Near-black #0E0F11 background; #15161A surfaces; #282A32 boundaries; #F3F3F6 primary text; #A3A5B1 secondary text. Violet #B7AEF5 marks selection and controls; gold #CFBD98 is reserved for identity accents. System sans-serif, 14px base text, compact secondary labels and a 32px page title. Eight-pixel spacing rhythm, 12px panel corners. No external fonts or decorative textures.

## Interaction and states
All visible controls must work. Keyboard focus is visible. Modals trap focus natively, close with Escape and return focus. Import validation errors appear beside the importer. Missing data uses an em dash or an empty state, never a fabricated zero. A real zero remains visible.

The selected table chart uses a common zero baseline and retains its scale during text searches. Tables in different databases remain separate. Mixed-source metrics are never added together. The Audiences project selector never offers a combined-project option.

On tablet the blank blocks move below resources. On small screens the sidebar becomes compact navigation, enabled Suite tools become a horizontally scrollable row, the selectors stack and the table hides secondary columns. Controls remain at least 40px high where possible. Reduced-motion preferences disable transitions.

## Data boundaries
GitHub and Vercel repository links were inspected, as were selected Supabase table counts. The public starter contains only public repository references and platform labels. Private snapshots are separate downloads, not source files. An imported snapshot stays in page memory and is cleared on reload; it is not uploaded or saved to localStorage. Only layout, Suite visibility and draft text are stored locally, after a storage availability check. Drafts are not secure document storage.

The application does not inherit the ChatGPT connectors. Owner: Zeus is a visual label. Vercel Analytics separately checks a signed owner session and uses server-only credentials for read requests. Reports stay in memory and private responses are not cached. There are no database writes, commits, deployments or messages from the app.

## Next iteration, not this iteration
Extend the provider adapters and approved project mappings after the first live analytics report is verified. Adding another data source must preserve per-request authorization and clear source attribution.
