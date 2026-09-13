"use client";

import { useState, type ReactNode } from "react";
import { SharedSidebar } from "@olympus/workspace-ui/sidebar";
import { useWorkspaceAccess } from "@olympus/workspace-ui/access";
import type { SidebarConfig, SuiteConfig, SuiteTool } from "../lib/workspace";
import type { DataWorkspaceState } from "../lib/data-workspace-bridge";

type Screen = "features" | "components" | "workspace" | "audiences" | "layout";
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
  const access = useWorkspaceAccess();
  const tables = data?.tables.filter(table => !config.search || table.name.toLowerCase().includes(search.toLowerCase())) || [];
  const items = ([
    ["components", "cube", "Components"], ["workspace", "grid", "Overview"], ["audiences", "people", "Audiences"],
    ["layout", "sliders", "Layout"], ["features", "sliders", "Platformfuncties"],
  ] as const).map(([target, symbol, label]) => ({ id: target, label, icon: icon(symbol, 18), active: screen === target, onSelect: () => onNavigate(target) }));
  function closeOnMobile() { if (window.matchMedia("(max-width: 760px)").matches) onCollapse(true); }
  return <SharedSidebar id="workspace-sidebar" brand={<>{icon("bolt", 23)}<span>OLYMPUS<small>A shared perspective.</small></span></>}
    label="Workspace" items={items} collapsed={config.collapsed} onCollapse={onCollapse}
    flags={access.flags} preferences={access.preferences} onPreferences={access.savePreferences} saving={access.saving} canSave={access.owner}
    footer={<span>{access.owner ? "Persoonlijke werkruimte" : "Log in bij Platformfuncties"}</span>}>
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
  </SharedSidebar>;
}

export function SidebarSettings({ config, onChange, onSuite }: { config: SidebarConfig; onChange: (patch: Partial<SidebarConfig>) => void; onSuite: () => void }) {
  return <section className="panel settings-panel sidebar-settings" role="tabpanel" aria-label="Sidebar settings">
    <div className="panel-heading"><div><h2>Sidebar</h2><p>Breedte en snelkoppelingen beheer je direct in de sidebar. Deze instellingen gelden voor de Olympus-tabelbrowser.</p></div></div>
    <div className="setting-row"><div><h3>Visibility</h3><p>The small arrow at the top closes or reopens the whole sidebar.</p></div><button className="button" onClick={() => onChange({ collapsed: !config.collapsed })}>{config.collapsed ? "Open sidebar" : "Collapse sidebar"}</button></div>
    <div className="setting-row"><div><h3>Sidebar tools</h3><p>Choose Suite tools, including Data tables, with their individual switches.</p></div><button className="button" onClick={onSuite}>Suite sidebar</button></div>
    {([{ key: "search", title: "Table search", text: "Find tables by name." }, { key: "counts", title: "Row counts", text: "Show counts beside the table names." }] as const).map(setting =>
      <div className="setting-row" key={setting.key}><div><h3>{setting.title}</h3><p>{setting.text}</p></div><label className="switch-control"><span className="sr-only">{setting.title}</span><input type="checkbox" checked={config[setting.key]} onChange={() => onChange({ [setting.key]: !config[setting.key] })}/><span className="switch-track" aria-hidden="true"><span/></span></label></div>)}
    <p className="sidebar-settings-note">Saved on this device.</p>
  </section>;
}
