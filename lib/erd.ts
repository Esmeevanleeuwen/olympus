export type TableRef = { schema: string; name: string };
export type ErdColumn = { name: string; type: string; nullable: boolean };
export type ErdForeignKey = { name: string; columns: string[]; target: TableRef & { columns: string[] } };
export type ErdTable = TableRef & { columns: ErdColumn[]; primaryKey: string[]; foreignKeys: ErdForeignKey[] };
export type ErdProject = { id: string; name: string; capturedAt: string; tables: ErdTable[] };
export type ErdSnapshot = { version: 1; kind: "olympus-erd"; projects: ErdProject[] };
export const ERD_MAX_BYTES = 5_000_000;
export const tableKey = (table: TableRef) => JSON.stringify([table.schema, table.name]);
export const tableLabel = (table: TableRef) => `${table.schema}.${table.name}`;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a schema object.");
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 128): string {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f]/.test(value)) throw new Error("Invalid or missing schema name.");
  return value;
}
function array(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error("Missing schema list or import limit exceeded.");
  return value;
}
function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label} in schema.`);
}
function names(value: unknown, allowEmpty = false): string[] {
  const result = array(value, 64).map(item => text(item));
  if (!allowEmpty && !result.length) throw new Error("A key must contain at least one column.");
  unique(result, "key column");
  return result;
}

/** Accept the document, a copied JSON cell, or Supabase's one-row JSON export. */
export function parseErdSnapshot(input: unknown): ErdSnapshot {
  let value = input;
  for (let step = 0; step < 4; step++) {
    if (typeof value === "string") { value = JSON.parse(value); continue; }
    if (Array.isArray(value) && value.length === 1) { value = value[0]; continue; }
    if (value && typeof value === "object" && "snapshot" in value) { value = (value as { snapshot: unknown }).snapshot; continue; }
    break;
  }
  const root = object(value);
  if (root.kind !== "olympus-erd" || root.version !== 1) throw new Error("This is not an ERD schema snapshot. Row-count snapshots do not contain columns or relationships. Use Get schema below.");
  let columnCount = 0, keyCount = 0;
  const projects = array(root.projects, 20).map(raw => {
    const p = object(raw), id = text(p.id);
    if (!/^[a-z0-9]{20}$/.test(id)) throw new Error("Use the 20-character Supabase project ID.");
    const capturedAt = text(p.capturedAt);
    if (!/^\d{4}-\d{2}-\d{2}T/.test(capturedAt) || !Number.isFinite(Date.parse(capturedAt))) throw new Error("Invalid schema capture time.");
    const tables = array(p.tables, 500).map(rawTable => {
      const t = object(rawTable);
      const columns = array(t.columns, 1600).map(rawColumn => {
        const c = object(rawColumn);
        if (typeof c.nullable !== "boolean") throw new Error("Column nullability must be true or false.");
        return { name: text(c.name), type: text(c.type, 256), nullable: c.nullable };
      });
      unique(columns.map(c => c.name), "column");
      const primaryKey = names(t.primaryKey, true);
      const foreignKeys = array(t.foreignKeys, 1000).map(rawKey => {
        const f = object(rawKey), target = object(f.target);
        const columns = names(f.columns), targetColumns = names(target.columns);
        if (columns.length !== targetColumns.length) throw new Error("Foreign-key column pairs do not match.");
        return { name: text(f.name), columns, target: { schema: text(target.schema), name: text(target.name), columns: targetColumns } };
      });
      unique(foreignKeys.map(f => f.name), "foreign key");
      if ([...primaryKey, ...foreignKeys.flatMap(f => f.columns)].some(name => !columns.some(c => c.name === name))) throw new Error("A key refers to a missing source column.");
      columnCount += columns.length; keyCount += foreignKeys.length;
      return { schema: text(t.schema), name: text(t.name), columns, primaryKey, foreignKeys };
    });
    unique(tables.map(tableKey), "table");
    const byId = new Map(tables.map(t => [tableKey(t), t]));
    for (const table of tables) for (const fk of table.foreignKeys) {
      const target = byId.get(tableKey(fk.target));
      if (target && fk.target.columns.some(name => !target.columns.some(c => c.name === name))) throw new Error("A foreign key refers to a missing target column.");
    }
    return { id, name: text(p.name), capturedAt, tables };
  });
  if (!projects.length) throw new Error("The schema snapshot contains no projects.");
  if (columnCount > 30_000 || keyCount > 5_000) throw new Error("Schema import is too large. Export fewer schemas.");
  unique(projects.map(p => p.id), "project");
  // Construct only known metadata fields. Never retain row data, defaults or credentials.
  return { version: 1, kind: "olympus-erd", projects };
}

export function mergeErdSnapshots(existing: ErdSnapshot | null, incoming: ErdSnapshot): ErdSnapshot {
  const incomingIds = new Set(incoming.projects.map(p => p.id));
  return parseErdSnapshot({ ...incoming, projects: [...(existing?.projects ?? []).filter(p => !incomingIds.has(p.id)), ...incoming.projects] });
}

export type DiagramTable = ErdTable & { external?: boolean };
export type DiagramEdge = { id: string; source: string; target: string; key: ErdForeignKey };
export function diagramFor(project: ErdProject, schema: string, selected: string, focused: boolean) {
  const scoped = project.tables.filter(t => !schema || t.schema === schema);
  const edges: DiagramEdge[] = project.tables.flatMap(t => t.foreignKeys.map(key => ({ id: JSON.stringify([t.schema, t.name, key.name]), source: tableKey(t), target: tableKey(key.target), key })));
  const ids = new Set(focused && selected ? [selected] : scoped.map(tableKey));
  const visibleEdges = edges.filter(e => focused && selected ? e.source === selected || e.target === selected : ids.has(e.source));
  for (const edge of visibleEdges) { ids.add(edge.source); ids.add(edge.target); }
  const tables: DiagramTable[] = project.tables.filter(t => ids.has(tableKey(t)));
  for (const edge of visibleEdges) {
    if (tables.some(t => tableKey(t) === edge.target)) continue;
    const columns = [...new Set(visibleEdges.filter(e => e.target === edge.target).flatMap(e => e.key.target.columns))];
    tables.push({ schema: edge.key.target.schema, name: edge.key.target.name, columns: columns.map(name => ({ name, type: "Not inspected", nullable: false })), primaryKey: [], foreignKeys: [], external: true });
  }
  return { tables, edges: visibleEdges };
}

export function defaultTable(project: ErdProject, schema = ""): string {
  const tables = project.tables.filter(t => !schema || t.schema === schema);
  const degree = new Map<string, number>();
  for (const t of project.tables) for (const f of t.foreignKeys) {
    for (const id of [tableKey(t), tableKey(f.target)]) degree.set(id, (degree.get(id) ?? 0) + 1);
  }
  return tableKey([...tables].sort((a, b) => (degree.get(tableKey(b)) ?? 0) - (degree.get(tableKey(a)) ?? 0) || tableLabel(a).localeCompare(tableLabel(b)))[0] ?? { schema: "", name: "" });
}

export function supabaseProjectId(input: string): string {
  const value = input.trim();
  if (/^[a-z0-9]{20}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error();
    const id = url.hostname === "supabase.com" ? url.pathname.match(/^\/dashboard\/project\/([a-z0-9]{20})(?:\/|$)/)?.[1] : url.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/)?.[1];
    if (id) return id;
  } catch { /* Report one actionable input error. */ }
  throw new Error("Paste your Supabase project URL or its 20-character project ID.");
}

/** A single read-only statement. It reads catalogs, never table records. */
export function schemaExportSql(projectInput: string, projectName = ""): string {
  const id = supabaseProjectId(projectInput);
  const name = (projectName.trim() || id).slice(0, 128).replace(/'/g, "''").replace(/\\/g, "\\\\");
  return `-- Olympus ERD: table structure only. No records or database changes.
-- Export the result as JSON, then import it in Audiences → ERD.
with app_tables as (
  select c.oid, n.nspname as schema, c.relname as name
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p') and not c.relispartition
    and n.nspname not like 'pg_%'
    and n.nspname not in ('information_schema', 'auth', 'storage', 'realtime',
      '_realtime', 'supabase_migrations', 'supabase_functions', 'vault', 'extensions',
      'pgsodium', 'pgsodium_masks', 'graphql', 'graphql_public', 'net', 'cron')
    and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass
      and d.objid = c.oid and d.deptype = 'e')
), definitions as (
  select t.schema, t.name, jsonb_build_object(
    'schema', t.schema, 'name', t.name,
    'columns', coalesce((select jsonb_agg(jsonb_build_object(
      'name', a.attname, 'type', format_type(a.atttypid, a.atttypmod),
      'nullable', not a.attnotnull) order by a.attnum)
      from pg_attribute a where a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped), '[]'::jsonb),
    'primaryKey', coalesce((select jsonb_agg(a.attname order by k.position)
      from pg_constraint con cross join lateral unnest(con.conkey) with ordinality k(attnum, position)
      join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum
      where con.conrelid = t.oid and con.contype = 'p'), '[]'::jsonb),
    'foreignKeys', coalesce((select jsonb_agg(jsonb_build_object(
      'name', con.conname,
      'columns', (select jsonb_agg(a.attname order by k.position)
        from unnest(con.conkey) with ordinality k(attnum, position)
        join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum),
      'target', jsonb_build_object('schema', rn.nspname, 'name', rc.relname,
        'columns', (select jsonb_agg(a.attname order by k.position)
          from unnest(con.confkey) with ordinality k(attnum, position)
          join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum))) order by con.conname)
      from pg_constraint con join pg_class rc on rc.oid = con.confrelid
      join pg_namespace rn on rn.oid = rc.relnamespace
      where con.conrelid = t.oid and con.contype = 'f'), '[]'::jsonb)
  ) as definition from app_tables t
)
select jsonb_build_object('version', 1, 'kind', 'olympus-erd', 'projects', jsonb_build_array(
  jsonb_build_object('id', '${id}', 'name', E'${name}',
    'capturedAt', to_char(current_timestamp at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'tables', coalesce((select jsonb_agg(definition order by schema, name) from definitions), '[]'::jsonb))
)) as snapshot;`;
}
