"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SidebarConfig, SuiteConfig, SuiteTool } from "../lib/workspace";
import type { DataWorkspaceState } from "../lib/data-workspace-bridge";

type Screen = "components" | "workspace" | "audiences" | "layout";
type Props = {
  screen: Screen;
  config: SidebarConfig;
  suite: SuiteConfig;
  data: DataWorkspaceState | null;
  tools: { id: SuiteTool; name: string; description: string; icon: string }[];
  icon: (name: string, size?: number) => ReactNode;
  onNavigate: (screen: Screen) => void;
  onCollapse: (collapsed: boolean) => void;
  onSelectTable: (name: string) => void;
  onTool: (name: string) => void;
};

export default function WorkspaceSidebar({ screen, config, suite, data, tools, icon, onNavigate, onCollapse, onSelectTable, onTool }: Props) {
  const [search, setSearch] = useState("");
  const toggle = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const open = !config.collapsed;
  const tables = data?.tables.filter(table => !config.search || table.name.toLowerCase().includes(search.toLowerCase())) || [];

  useEffect(() => {
    if (!open) {
      if (sidebar.current?.contains(document.activeElement)) toggle.current?.focus({ preventScroll: true });
      return;
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented && sidebar.current?.contains(document.activeElement)) {
        onCollapse(true); toggle.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open, onCollapse]);

  function closeOnMobile() {
    if (window.matchMedia("(max-width: 760px)").matches) {
      onCollapse(true); toggle.current?.focus({ preventScroll: true });
    }
  }
  return <>
    <button ref={toggle} className={`simple-sidebar-toggle ${open ? "is-open" : "is-closed"}`}
      aria-expanded={open} aria-controls="workspace-sidebar" aria-label={open ? "Collapse sidebar" : "Open sidebar"}
      title={open ? "Collapse sidebar" : "Open sidebar"} onClick={() => onCollapse(open)}>
      {icon(open ? "chevron-left" : "chevron-right", 17)}
    </button>
    {open && <button className="simple-sidebar-backdrop" tabIndex={-1} aria-label="Close sidebar" onClick={() => onCollapse(true)}/>}
    <aside ref={sidebar} id="workspace-sidebar" className={`simple-sidebar ${open ? "is-open" : "is-closed"}`}
      aria-label="Workspace sidebar" aria-hidden={!open} inert={!open}>
      <div className="brand"><span className="brand-mark">{icon("bolt", 23)}</span><span>OLYMPUS<small>A shared perspective.</small></span></div>
      <div className="simple-sidebar-scroll">
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">{([
          ["components", "cube", "Components"], ["workspace", "grid", "Overview"], ["audiences", "people", "Audiences"], ["layout", "sliders", "Layout"]
        ] as const).map(([target, symbol, label]) => <button key={target} className={`nav-item ${screen === target ? "active" : ""}`}
          aria-current={screen === target ? "page" : undefined} onClick={() => { onNavigate(target); closeOnMobile(); }}>
          {icon(symbol, 18)}<span>{label}</span>{screen === target && <span className="nav-dot"/>}
        </button>)}</nav>
        {suite.visible && <div className="suite-nav"><div className="nav-label">SUITE · TEST SPACE</div>
          {tools.filter(tool => suite.tools[tool.id]).map(tool => tool.id === "data-tables" ?
            <details className="suite-data-browser" key={tool.id} open>
              <summary className="suite-nav-item">{icon(tool.icon, 16)}<span>Data tables</span><span className="suite-data-arrow" aria-hidden="true">⌄</span></summary>
              <div className="suite-data-content">
                <p className="suite-data-source">Olympus demo · public</p>
                {config.search && <label className="suite-data-search"><span className="sr-only">Find a table in the sidebar</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a table…"/></label>}
                <nav aria-label="Data tables" className="suite-table-list">{tables.map(table => <button key={table.name} className={data?.selected === table.name ? "selected" : ""}
                  aria-current={data?.selected === table.name ? "true" : undefined} title={`${table.name} · ${table.fields} fields`}
                  onClick={() => { onSelectTable(table.name); closeOnMobile(); }}>
                  {icon("table", 14)}<span>{table.name}</span>{config.counts && <small aria-label={`${table.rows} rows`}>{table.rows}</small>}
                </button>)}</nav>
                {!data && <p className="suite-data-empty" role="status">Loading demo tables…</p>}
                {data && !tables.length && <p className="suite-data-empty">No matching tables.</p>}
                <p className="suite-data-source">Demo database · drafts only</p>
              </div>
            </details> : <button className="suite-nav-item" key={tool.id} onClick={() => onTool(tool.name)}>{icon(tool.icon, 16)}<span>{tool.name}</span><span className="suite-test-tag">TEST</span></button>)}
          {!Object.values(suite.tools).some(Boolean) && <p>No tools are visible. Choose them under Layout.</p>}
        </div>}
      </div>
      <div className="sidebar-bottom"><span className="tiny-square"/><span>Design foundation<small>Read-only workspace</small></span></div>
    </aside>
  </>;
}

export function SidebarSettings({ config, onChange, onSuite }: { config: SidebarConfig; onChange: (patch: Partial<SidebarConfig>) => void; onSuite: () => void }) {
  return <section className="panel settings-panel sidebar-settings" role="tabpanel" aria-label="Sidebar settings">
    <div className="panel-heading"><div><h2>Sidebar</h2><p>Choose what fits your workspace.</p></div></div>
    <div className="setting-row"><div><h3>Visibility</h3><p>The small arrow at the top closes or reopens the whole sidebar.</p></div><button className="button" onClick={() => onChange({ collapsed: !config.collapsed })}>{config.collapsed ? "Open sidebar" : "Collapse sidebar"}</button></div>
    <div className="setting-row"><div><h3>Sidebar width</h3><p>Give longer table names more room.</p></div><label><span className="sr-only">Sidebar width</span><select value={config.width} onChange={event => onChange({ width: event.target.value as SidebarConfig["width"] })}><option value="compact">Compact</option><option value="wide">Roomy</option></select></label></div>
    <div className="setting-row"><div><h3>Sidebar tools</h3><p>Choose Suite tools, including Data tables, with their individual switches.</p></div><button className="button" onClick={onSuite}>Suite sidebar</button></div>
    {([{ key: "search", title: "Table search", text: "Find tables by name." }, { key: "counts", title: "Row counts", text: "Show counts beside the table names." }] as const).map(setting =>
      <div className="setting-row" key={setting.key}><div><h3>{setting.title}</h3><p>{setting.text}</p></div><label className="switch-control"><span className="sr-only">{setting.title}</span><input type="checkbox" checked={config[setting.key]} onChange={() => onChange({ [setting.key]: !config[setting.key] })}/><span className="switch-track" aria-hidden="true"><span/></span></label></div>)}
    <p className="sidebar-settings-note">Saved on this device.</p>
  </section>;
}
