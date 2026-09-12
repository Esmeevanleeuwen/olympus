# Supabase ERD

Open **Audiences → ERD**. An entity relationship diagram (ERD) shows tables, their columns and the foreign keys that connect them.

## Open your tables

1. Click **Import schema** and choose your Olympus ERD JSON file. You can also paste its JSON under **Get schema → Paste a schema JSON result**.
2. Select a Supabase project. Search tables or columns, then select a table to inspect its connections.
3. Choose **All tables** for the full schema diagram. Use the zoom controls and scroll inside the diagram. The table below shows every column and lists the exact relationships.

The earlier row-count snapshot is a different format: it cannot describe an ERD. No additional token is needed for this import workflow. It works locally, on Vercel and on the static GitHub Pages site.

## Create or update a schema snapshot

1. Open **Get schema → Create a schema snapshot in Supabase**.
2. Paste your Supabase project dashboard URL or project ID, optionally enter its name, and click **Generate query**.
3. Copy the query into that project's Supabase **SQL Editor** and run it.
4. Under the results, choose **Export → JSON**, save the file anywhere on your computer, and import it in Olympus. Alternatively copy the `snapshot` cell and paste it directly into Olympus. You do not need to put the file in VS Code or the repository.

The generated SELECT reads PostgreSQL catalogs, including ordered composite keys. It selects application tables in `public` and custom schemas such as `aegis`. Built-in schemas, extension-owned tables and individual partition children are excluded. Referenced tables outside that selection, such as `auth.users`, appear as dashed references with only their referenced column names. They have not been inspected, and their data types and primary keys are not inferred. Database permissions may limit what you can export.

Reimporting a project replaces that project's structure and preserves other imported projects. A multi-project file can load several at once. Project counts and relationships are never combined across databases.

## Behaviour and privacy

- Imports stay in this browser tab's memory, including when switching workspace tabs. Reloading the page or pressing **Clear** removes them.
- The app makes no Supabase calls and never uploads or stores the schema in localStorage or layout exports. Keep the original JSON if you want to reopen it.
- No rows, default expressions, credentials or RLS policies are required or retained. The public repository contains no private schema snapshots.
- PK means primary key; FK means foreign key. The arrows point from the referencing table to the referenced table. The diagram does not infer cardinality or relationships from similarly named columns. Composite column pairs appear in order in the relationship list.
- The schema selector determines the starting tables. Their referenced tables remain visible so links do not lose their destinations. The focused view also includes incoming links across application schemas.
- Search filters the table navigator, keeping the selected diagram visible. Every column and relationship has a text representation below the diagram. Tabs, navigation, zoom and scrolling work with a keyboard.

## Format

`lib/erd.ts` defines and validates `{ version: 1, kind: "olympus-erd", projects: [...] }`. Each project has `id`, `name`, `capturedAt` and `tables`. Each table has `schema`, `name`, `columns` (`name`, `type`, `nullable`), `primaryKey` and `foreignKeys` (`name`, ordered `columns`, and a `target` with `schema`, `name`, ordered `columns`).

The importer accepts this document, a copied JSON cell or the SQL Editor's one-row `[{ "snapshot": ... }]` JSON export. It rejects duplicate identities, invalid timestamps and mismatched or missing key columns. Limits: 5 MB per import, 20 projects, 500 tables per project, 30,000 columns and 5,000 foreign keys overall. Unknown fields are discarded.

The export uses documented [PostgreSQL constraint catalogs](https://www.postgresql.org/docs/current/catalog-pg-constraint.html). See also [Supabase tables and foreign keys](https://supabase.com/docs/guides/database/tables).
