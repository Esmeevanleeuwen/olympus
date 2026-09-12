"use client";

import { useId, useMemo, useRef, useState } from "react";
import { defaultTable, diagramFor, ERD_MAX_BYTES, mergeErdSnapshots, parseErdSnapshot, schemaExportSql, tableKey, tableLabel,
  type DiagramTable, type ErdProject, type ErdSnapshot } from "../lib/erd";

function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Diagram({ project, schema, selected, focused, onSelect }: {
  project: ErdProject; schema: string; selected: string; focused: boolean; onSelect: (id: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const arrowId = useId().replaceAll(":", "");
  const graph = useMemo(() => {
    const result = diagramFor(project, schema, selected, focused);
    const cards = result.tables.map(table => {
      const keys = new Set([...table.primaryKey, ...table.foreignKeys.flatMap(f => f.columns), ...result.edges.filter(e => e.target === tableKey(table)).flatMap(e => e.key.target.columns)]);
      const columns = [...table.columns.filter(c => keys.has(c.name)), ...table.columns.filter(c => !keys.has(c.name))].slice(0, Math.max(8, keys.size));
      return { table, columns, height: 68 + columns.length * 28 + 32, x: 0, y: 0 };
    });
    const ordered = [...cards].sort((a, b) => (tableKey(a.table) === selected ? -1 : tableKey(b.table) === selected ? 1 : tableLabel(a.table).localeCompare(tableLabel(b.table))));
    const columns = focused && ordered.length > 1 ? 2 : Math.min(3, Math.max(1, ordered.length));
    let y = 32;
    for (let start = 0; start < ordered.length; start += columns) {
      const row = ordered.slice(start, start + columns);
      row.forEach((card, i) => { card.x = 40 + i * 390; card.y = y; });
      y += Math.max(...row.map(card => card.height)) + 64;
    }
    return { ...result, cards: ordered, width: columns * 390 + 20, height: Math.max(y, 260) };
  }, [project, schema, selected, focused]);
  const byId = new Map(graph.cards.map(card => [tableKey(card.table), card]));
  const label = `${graph.tables.length} tables and ${graph.edges.length} foreign-key relationships`;
  return <section className="panel erd-diagram" aria-label="Entity relationship diagram">
    <div className="erd-diagram-heading"><div><h2>{focused ? "Table & relationships" : "Schema diagram"}</h2><p>{label}. Arrows point to the referenced table.</p></div>
      <div className="erd-zoom" role="group" aria-label="Diagram zoom"><button className="button" aria-label="Zoom out" disabled={zoom <= .5} onClick={() => setZoom(z => Math.max(.5, z - .25))}>−</button><button className="button" aria-label="Reset zoom" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button><button className="button" aria-label="Zoom in" disabled={zoom >= 1.5} onClick={() => setZoom(z => Math.min(1.5, z + .25))}>+</button></div>
    </div>
    <div className="erd-canvas-scroll" tabIndex={0} role="region" aria-label="Scrollable diagram. Use arrow keys to scroll. Table and relationship details follow below.">
      <div style={{ width: graph.width * zoom, height: graph.height * zoom }}>
        <div className="erd-canvas" style={{ width: graph.width, height: graph.height, transform: `scale(${zoom})` }}>
          <svg width={graph.width} height={graph.height} aria-hidden="true" className="erd-lines">
            <defs><marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/></marker></defs>
            {graph.edges.map((edge, index) => {
              const a = byId.get(edge.source), b = byId.get(edge.target); if (!a || !b) return null;
              const self = a === b, right = self || a.x <= b.x;
              const x1 = a.x + (right ? 300 : 0), x2 = b.x + (right && !self ? 0 : 300);
              const y1 = a.y + 82 + Math.max(0, a.columns.findIndex(c => c.name === edge.key.columns[0])) * 28;
              const y2 = b.y + 82 + Math.max(0, b.columns.findIndex(c => c.name === edge.key.target.columns[0])) * 28;
              const bend = 32 + index % 4 * 8;
              const d = self || a.x === b.x
                ? `M ${a.x + 300} ${y1} C ${a.x + 300 + bend * 2} ${y1 - (self ? 45 : 0)}, ${b.x + 300 + bend * 2} ${y2 + (self ? 45 : 0)}, ${b.x + 300} ${y2}`
                : `M ${x1} ${y1} C ${x1 + (right ? bend : -bend)} ${y1}, ${x2 + (right ? -bend : bend)} ${y2}, ${x2} ${y2}`;
              return <path key={edge.id} d={d} fill="none" markerEnd={`url(#${arrowId})`} className={edge.source === selected || edge.target === selected ? "selected" : ""}><title>{edge.key.name}</title></path>;
            })}
          </svg>
          {graph.cards.map(({ table, columns, x, y, height }) => <article key={tableKey(table)} className={`erd-node ${tableKey(table) === selected ? "selected" : ""} ${table.external ? "external" : ""}`} style={{ left: x, top: y, width: 300, height }}>
            <button className="erd-node-title" disabled={table.external} aria-pressed={tableKey(table) === selected} onClick={() => onSelect(tableKey(table))}><small>{table.schema}{table.external ? " · external reference" : ""}</small><strong title={table.name}>{table.name}</strong></button>
            <ul>{columns.map(column => <li key={column.name}><span className="erd-key">{table.primaryKey.includes(column.name) ? "PK" : table.foreignKeys.some(f => f.columns.includes(column.name)) ? "FK" : ""}</span><span title={column.name}>{column.name}</span><code title={column.type}>{column.type}</code></li>)}</ul>
            <div className="erd-node-foot">{table.external ? "Referenced columns only · not inspected" : `${table.columns.length} columns${table.columns.length > columns.length ? " · select to see all" : ""}`}</div>
          </article>)}
        </div>
      </div>
    </div>
    <p className="erd-legend">PK = primary key · FK = foreign key · Dashed tables are references outside the exported schemas.</p>
  </section>;
}

function TableDetails({ table, project, onSelect }: { table: DiagramTable; project: ErdProject; onSelect: (id: string) => void }) {
  const edges = project.tables.flatMap(t => t.foreignKeys.map(key => ({ source: t, key }))).filter(e => tableKey(e.source) === tableKey(table) || tableKey(e.key.target) === tableKey(table));
  return <section className="panel erd-details" aria-label="Selected table details">
    <h2>{tableLabel(table)}</h2><p>{table.columns.length} columns · {edges.length} relationships</p>
    <div className="erd-columns-wrap"><table><caption className="sr-only">Columns in {tableLabel(table)}</caption><thead><tr><th>Column</th><th>Type</th><th>Key</th><th>Nullable</th></tr></thead><tbody>{table.columns.map(c => <tr key={c.name}><th scope="row">{c.name}</th><td><code>{c.type}</code></td><td>{[table.primaryKey.includes(c.name) && "PK", table.foreignKeys.some(f => f.columns.includes(c.name)) && "FK"].filter(Boolean).join(" · ") || "—"}</td><td>{c.nullable ? "Yes" : "No"}</td></tr>)}</tbody></table></div>
    <h3>Relationships</h3>{!edges.length ? <p>No foreign keys declared for this table. Matching column names alone do not create a link.</p> : <ul className="erd-relationships">{edges.map(({ source, key }) => <li key={JSON.stringify([tableKey(source), key.name])}><strong>{key.name}</strong><div><button className="text-button" onClick={() => onSelect(tableKey(source))}>{tableLabel(source)} ({key.columns.join(", ")})</button><span> references </span>{project.tables.some(t => tableKey(t) === tableKey(key.target)) ? <button className="text-button" onClick={() => onSelect(tableKey(key.target))}>{tableLabel(key.target)} ({key.target.columns.join(", ")})</button> : <span>{tableLabel(key.target)} ({key.target.columns.join(", ")}) · not inspected</span>}</div></li>)}</ul>}
  </section>;
}

export default function SupabaseErd() {
  const [snapshot, setSnapshot] = useState<ErdSnapshot | null>(null);
  const [projectId, setProjectId] = useState("");
  const [schema, setSchema] = useState("");
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [pasted, setPasted] = useState("");
  const [sourceInput, setSourceInput] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sql, setSql] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const project = snapshot?.projects.find(p => p.id === projectId) ?? snapshot?.projects[0];
  const schemas = [...new Set(project?.tables.map(t => t.schema) ?? [])].sort();
  const selectedTable = project?.tables.find(t => tableKey(t) === selected);
  const scoped = project?.tables.filter(t => !schema || t.schema === schema) ?? [];
  const matches = scoped.filter(t => `${tableLabel(t)} ${t.columns.map(c => c.name).join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  const importText = (value: string) => {
    const incoming = parseErdSnapshot(JSON.parse(value));
    const next = mergeErdSnapshots(snapshot, incoming);
    setSnapshot(next); setProjectId(incoming.projects[0].id); setSchema(""); setSearch("");
    setSelected(defaultTable(incoming.projects[0])); setPasted(""); setShowImport(false); setError("");
    setSourceInput(incoming.projects[0].id); setSourceName(incoming.projects[0].name); setSql("");
    setNotice("Schema loaded. Kept in this browser tab until you reload or clear it.");
  };
  const importFile = async (input?: File) => {
    if (!input) return;
    setBusy(true); setError(""); setNotice("");
    try { if (input.size > ERD_MAX_BYTES) throw new Error("Choose a schema JSON file smaller than 5 MB."); importText(await input.text()); }
    catch (e) { setError(e instanceof SyntaxError ? "That file is not valid JSON. Export the SQL result as JSON." : e instanceof Error ? e.message : "Unable to read schema."); }
    finally { setBusy(false); if (file.current) file.current.value = ""; }
  };
  const chooseTable = (id: string) => {
    const table = project?.tables.find(t => tableKey(t) === id);
    if (!table) return;
    if (schema && table.schema !== schema) setSchema("");
    setSelected(id);
  };
  return <div className="supabase-erd">
    <div className="erd-toolbar"><div><h2>Database relationships</h2><p>See how your Supabase tables connect.</p></div><div className="erd-actions"><button className="button" onClick={() => setShowImport(!showImport)} aria-expanded={showImport}>Get schema</button><button className="button primary" disabled={busy} onClick={() => file.current?.click()}>{busy ? "Reading…" : "Import schema"}</button>{snapshot && <button className="button" onClick={() => { setSnapshot(null); setSelected(""); setError(""); setPasted(""); setNotice("Imported schema cleared."); }}>Clear</button>}</div></div>
    <input ref={file} type="file" hidden accept=".json,application/json" onChange={e => void importFile(e.target.files?.[0])}/>
    {error && <p className="feedback error" role="alert">{error}</p>}{notice && <p className="feedback" role="status">{notice}</p>}
    {(showImport || !snapshot) && <section className="panel erd-import" aria-label="Receive a Supabase schema"><h3>{snapshot ? "Update or add a project" : "Bring in your tables"}</h3><p>Import an Olympus ERD schema file, or create one below. Existing row-count snapshots do not include relationships.</p>
      <details><summary>Create a schema snapshot in Supabase</summary><ol><li>Paste your project URL or ID and generate the read-only query.</li><li>Run it in that project’s <strong>SQL Editor</strong>.</li><li>Choose <strong>Export → JSON</strong> under the results, then use <strong>Import schema</strong> above. You can also copy the snapshot cell and paste it below.</li></ol>
        <form onSubmit={e => { e.preventDefault(); setError(""); try { setSql(schemaExportSql(sourceInput, sourceName)); } catch (err) { setError(err instanceof Error ? err.message : "Check the project URL."); } }}><label>Supabase project URL or ID<input value={sourceInput} onChange={e => { setSourceInput(e.target.value); setSql(""); }} placeholder="Paste the URL of your Supabase project" required/></label><label>Project name (optional)<input value={sourceName} maxLength={128} onChange={e => { setSourceName(e.target.value); setSql(""); }} placeholder="A name you recognise"/></label><button className="button" type="submit">Generate query</button></form>
        {sql && <div className="erd-sql"><label>Read-only schema query<textarea readOnly value={sql} rows={10} onFocus={e => e.target.select()}/></label><div className="erd-actions"><button className="button" onClick={async () => { try { await navigator.clipboard.writeText(sql); setNotice("Query copied. Run it in this project’s Supabase SQL Editor."); } catch { setError("Select the query text and copy it manually."); } }}>Copy query</button><button className="button" onClick={() => download(sql, "olympus-erd-query.sql", "text/plain")}>Download SQL</button></div></div>}
      </details>
      <details><summary>Paste a schema JSON result</summary><form onSubmit={e => { e.preventDefault(); setError(""); setNotice(""); try { if (new Blob([pasted]).size > ERD_MAX_BYTES) throw new Error("Paste a schema smaller than 5 MB."); importText(pasted); } catch (err) { setError(err instanceof SyntaxError ? "Paste the JSON result, not the SQL query." : err instanceof Error ? err.message : "Unable to read schema."); } }}><label>Schema JSON<textarea rows={6} value={pasted} maxLength={ERD_MAX_BYTES} onChange={e => setPasted(e.target.value)} placeholder="Paste the snapshot JSON here" required/></label><button className="button" type="submit">Load diagram</button></form></details>
      <p className="erd-footnote">Only structure is needed: table names, columns and keys. No token required. Nothing is uploaded or changed in Supabase.</p>
    </section>}
    {project && <>
      <div className="erd-controls"><label>Supabase project<select value={project.id} onChange={e => { const p = snapshot!.projects.find(p => p.id === e.target.value)!; setProjectId(p.id); setSchema(""); setSearch(""); setSelected(defaultTable(p)); }}>
        {snapshot!.projects.map(p => <option key={p.id} value={p.id}>{p.name} · {p.id}</option>)}</select></label><label>Schema<select value={schema} onChange={e => { setSchema(e.target.value); setSearch(""); setSelected(defaultTable(project, e.target.value)); }}><option value="">All app schemas</option>{schemas.map(s => <option key={s}>{s}</option>)}</select></label><label>View<select value={focused ? "focused" : "all"} onChange={e => setFocused(e.target.value === "focused")}><option value="focused">Selected table & links</option><option value="all">All tables</option></select></label>
      </div>
      <div className="erd-source"><span>Snapshot · {new Date(project.capturedAt).toISOString().replace("T", " ").slice(0, 19)} UTC · not live</span><a href={`https://supabase.com/dashboard/project/${project.id}/database/tables`} target="_blank" rel="noopener noreferrer">Open Supabase ↗</a></div>
      {!project.tables.length ? <section className="panel erd-import"><h3>No application tables in this snapshot</h3><p>The query returned no tables in the inspected schemas.</p></section> : <div className="erd-workspace"><aside className="panel erd-table-list" aria-label="Tables"><label>Find a table or column<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tables…"/></label><p>{matches.length} of {scoped.length} tables</p><div className="erd-table-buttons">{matches.map(t => <button key={tableKey(t)} aria-pressed={tableKey(t) === selected} onClick={() => chooseTable(tableKey(t))}><strong>{t.name}</strong><small>{t.schema} · {t.columns.length} columns</small></button>)}</div>{!matches.length && <p>No matching tables.</p>}</aside><div className="erd-main"><Diagram key={project.id} project={project} schema={schema} selected={selected} focused={focused} onSelect={chooseTable}/>{selectedTable && <TableDetails table={selectedTable} project={project} onSelect={chooseTable}/>}</div></div>}
    </>}
  </div>;
}
