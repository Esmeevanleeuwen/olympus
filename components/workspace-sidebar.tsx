"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { SidebarConfig, SuiteConfig, SuiteTool } from "../lib/workspace";
import type { DataWorkspaceState } from "../lib/data-workspace-bridge";

type Screen = "workspace" | "audiences" | "layout";
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
  onCustomize: () => void;
  onTool: (name: string) => void;
};

export default function WorkspaceSidebar(props: Props) {
  const { config, data, icon } = props;
  const [mobile, setMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const toggle = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ x: number; y: number; id: number } | null>(null);
  const swiped = useRef(false);
  const open = mobile ? mobileOpen : !config.collapsed;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const update = () => { setMobile(media.matches); setMobileOpen(false); };
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  function setOpen(value: boolean) {
    if (mobile) setMobileOpen(value); else props.onCollapse(!value);
    if (!value) toggle.current?.focus({ preventScroll: true });
  }
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (mobile) setMobileOpen(false); else props.onCollapse(true);
      toggle.current?.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open, mobile, props.onCollapse]);

  function startGesture(event: PointerEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    swiped.current = false;
    if (target.closest("input,textarea,select") || (event.pointerType !== "touch" && !target.closest(".workspace-sidebar-grip"))) return;
    gesture.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    const grip = target.closest<HTMLElement>(".workspace-sidebar-grip");
    grip?.setPointerCapture(event.pointerId);
  }
  function finishGesture(event: PointerEvent<HTMLElement>) {
    const start = gesture.current; gesture.current = null;
    if (!start || event.pointerId !== start.id) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    swiped.current = true; setOpen(dx > 0);
  }
  const tables = data?.tables.filter(table => !config.search || table.name.toLowerCase().includes(search.toLowerCase())) || [];
  return <>
    {mobile && open && <button className="workspace-sidebar-backdrop" aria-label="Close sidebar" onClick={() => setOpen(false)}/>}
    <aside className={`workspace-sidebar ${open ? "is-open" : "is-closed"}`} aria-label="Workspace navigation and tools"
      onPointerDown={startGesture} onPointerUp={finishGesture} onPointerCancel={() => { gesture.current = null; }}
      onClickCapture={event => { if (swiped.current && event.detail > 0) { event.preventDefault(); event.stopPropagation(); } swiped.current = false; }}>
      <div className="workspace-sidebar-rail">
        <div className="workspace-rail-brand" aria-label="Olympus">{icon("bolt", 27)}</div>
        <nav aria-label="Main navigation">{([
          ["workspace", "grid", "Overview"], ["audiences", "people", "Audiences"], ["layout", "sliders", "Layout"]
        ] as const).map(([screen, symbol, label]) => <button key={screen} className={`workspace-rail-item ${props.screen === screen ? "active" : ""}`} aria-current={props.screen === screen ? "page" : undefined}
          onClick={() => props.onNavigate(screen)}>{icon(symbol, 21)}<span>{label}</span></button>)}</nav>
        <button ref={toggle} className="workspace-rail-toggle" aria-expanded={open} aria-controls="workspace-side-panel" aria-label={open ? "Collapse sidebar" : "Expand sidebar"} title={open ? "Collapse sidebar" : "Expand sidebar"} onClick={() => setOpen(!open)}>{icon(open ? "chevron-left" : "chevron-right", 20)}</button>
      </div>
      <div className="workspace-side-panel" id="workspace-side-panel" aria-hidden={!open} inert={!open}>
        <div className="workspace-panel-heading"><span><small>OLYMPUS</small><strong>Workspace</strong></span><button className="workspace-panel-close" aria-label="Collapse sidebar" onClick={() => setOpen(false)}>{icon("chevron-left", 18)}</button></div>
        <div className="workspace-panel-content">
          {config.dataTables && <details className="workspace-sidebar-section" open><summary><span>{icon("database", 17)}Data tables</span><small>{data?.tables.length ?? "…"}</small></summary>
            <p className="workspace-sidebar-source">Olympus demo · public</p>
            {config.search && <label className="workspace-sidebar-search"><span className="sr-only">Find a table in the sidebar</span>{icon("search", 15)}<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a table…"/></label>}
            <nav aria-label="Data tables" className="workspace-table-list">{tables.map(table => <button key={table.name} className={data?.selected === table.name ? "selected" : ""} aria-current={data?.selected === table.name ? "true" : undefined} title={`${table.name} · ${table.fields} fields`}
              onClick={() => { props.onSelectTable(table.name); if (mobile) setOpen(false); }}>{icon("table", 16)}<span>{table.name}</span>{config.counts && <small aria-label={`${table.rows} rows`}>{table.rows}</small>}</button>)}</nav>
            {!data && <p className="workspace-sidebar-empty" role="status">Loading demo tables…</p>}
            {data && !tables.length && <p className="workspace-sidebar-empty">No matching tables.</p>}
            <p className="workspace-sidebar-note">Demo database · drafts only</p>
          </details>}
          {props.suite.visible && <details className="workspace-sidebar-section" open><summary><span>{icon("cube", 17)}Suite</span><small>TEST</small></summary><div className="workspace-suite-list">{props.tools.filter(tool => props.suite.tools[tool.id]).map(tool => <button key={tool.id} onClick={() => props.onTool(tool.name)}>{icon(tool.icon, 16)}<span>{tool.name}</span></button>)}</div>{!Object.values(props.suite.tools).some(Boolean) && <p className="workspace-sidebar-empty">Choose your tools under Layout → Suite sidebar.</p>}</details>}
          {!config.dataTables && !props.suite.visible && <p className="workspace-sidebar-empty">Add Data tables or Suite tools to make this space yours.</p>}
        </div>
        <button className="workspace-sidebar-customize" onClick={props.onCustomize}>{icon("sliders", 16)}Customize sidebar</button>
      </div>
      <button className="workspace-sidebar-grip" aria-label={open ? "Collapse sidebar; drag left to close" : "Expand sidebar; drag right to open"} aria-expanded={open} aria-controls="workspace-side-panel" onClick={() => setOpen(!open)}><span/></button>
    </aside>
  </>;
}

export function SidebarSettings({ config, onChange }: { config: SidebarConfig; onChange: (patch: Partial<SidebarConfig>) => void }) {
  const settings = [
    { key: "dataTables", title: "Data tables in the main sidebar", text: "Move the table browser from Data into this sidebar. Turn off to put it back." },
    { key: "search", title: "Table search", text: "Find a table by name without leaving the sidebar." },
    { key: "counts", title: "Row counts", text: "Show the demo row count beside each table." }
  ] as const;
  return <section className="panel settings-panel sidebar-settings" role="tabpanel" aria-label="Sidebar settings"><div className="panel-heading"><div><h2>Your sidebar</h2><p>Keep the tools you use next to your workspace.</p></div></div>
    <div className="setting-row"><div><h3>Sliding panel</h3><p>Use the arrow, drag the edge or swipe sideways. Navigation stays within reach.</p></div><button className="button" onClick={() => onChange({ collapsed: !config.collapsed })}>{config.collapsed ? "Expand desktop panel" : "Collapse desktop panel"}</button></div>
    {settings.map(setting => <div className="setting-row" key={setting.key}><div><h3>{setting.title}</h3><p>{setting.text}</p></div><label className="switch-control"><span className="sr-only">{setting.title}</span><input type="checkbox" checked={config[setting.key]} disabled={setting.key !== "dataTables" && !config.dataTables} onChange={() => onChange({ [setting.key]: !config[setting.key] })}/><span className="switch-track" aria-hidden="true"><span/></span></label></div>)}
    <p className="sidebar-settings-note">Saved on this device. Suite tools can be added separately under Suite sidebar.</p>
  </section>;
}
