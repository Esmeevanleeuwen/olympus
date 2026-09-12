"use client";

import * as React from "react";
import VercelAnalytics from "./vercel-analytics";
import SupabaseErd from "./supabase-erd";
import DataWorkspace from "./data-workspace";
import WorkspaceSidebar, { SidebarSettings } from "./workspace-sidebar";
import type { DataWorkspaceState, TableRequest } from "../lib/data-workspace-bridge";
import { Block, Layout, Resource, Snapshot, Provider, SuiteTool, SidebarConfig, PLATFORMS, PROVIDERS, INITIAL_LAYOUT,
  parseSnapshot, parseLayout, resourcesWithSnapshot, filterResources, chartMaximum, moveBlock } from "../lib/workspace";

type Group = "blocks" | "audiences";
type ModalState = { type: "resource"; resource: Resource } | { type: "block"; group: Group; draft: Block } | { type: "reset" } | null;
type State = { screen: "workspace" | "audiences" | "layout"; platform: string; provider: string; source: string;
  search: string; chart: boolean; expanded: boolean; snapshot: Snapshot | null; layout: Layout; modal: ModalState;
  layoutTab: "controls" | "suite" | "sidebar"; dataWorkspace: DataWorkspaceState | null; tableRequest: TableRequest | null; audienceTab: "data" | "supabase" | "vercel" | "erd"; storage: boolean; error: string; notice: string; importing: boolean };
const STORAGE = "olympus-layout-v02";
const SUITE_TOOLS: { id: SuiteTool; name: string; description: string; icon: string }[] = [
  { id: "scratchpad", name: "Scratchpad", description: "Keep temporary notes beside the workspace.", icon: "edit" },
  { id: "data-inspector", name: "Data inspector", description: "Test focused views of selected resources.", icon: "database" },
  { id: "api-sandbox", name: "API sandbox", description: "Reserve a safe place for request testing later.", icon: "code" },
  { id: "command-shelf", name: "Command shelf", description: "Keep repeated actions within reach.", icon: "bolt" },
  { id: "data-tables", name: "Data tables", description: "Browse demo tables and open them in the Data workspace.", icon: "database" }
];
const number = new Intl.NumberFormat("en-GB");
const date = (value: string | null) => value ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value)) : "Not a live reading";
const icons: Record<string, React.ReactNode> = {
  "chevron-left": <path d="m14 6-6 6 6 6"/>, "chevron-right": <path d="m10 6 6 6-6 6"/>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  people: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2"/></>,
  sliders: <><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.5"/><circle cx="16" cy="17" r="2.5"/></>,
  plus: <path d="M12 5v14M5 12h14"/>, search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>, out: <><path d="M14 3h7v7m0-7L10 14"/><path d="M10 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6"/></>,
  down: <path d="m7 10 5 5 5-5"/>, up: <path d="m7 14 5-5 5 5"/>, close: <path d="m6 6 12 12M6 18 18 6"/>,
  upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/></>,
  code: <><path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/></>, deploy: <path d="m12 4 10 17H2z"/>,
  bars: <path d="M4 7h16M4 12h10M4 17h6"/>, table: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M10 4v16"/></>,
  cube: <><path d="m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9"/></>,
  edit: <><path d="m15 5 4 4M4 20l5-1L21 7a2.8 2.8 0 0 0-4-4L5 15z"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></>,
  check: <path d="m5 12 4 4L19 6"/>, trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></>,
  bolt: <path d="m14 2-9 12h7l-2 8 9-12h-7z"/>
};
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name] || icons.cube}</svg>;
}
function ProviderMark({ provider }: { provider: Provider }) { return <span className={`provider-mark ${provider}`}><Icon name={provider === "supabase" ? "database" : provider === "github" ? "code" : "deploy"} size={16}/></span>; }
function EmptyState({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-symbol"><Icon name="cube" size={25}/></span><h3>{title}</h3><p>{children}</p>{action}</div>;
}
class Modal extends React.Component<{ title: string; children: React.ReactNode; onClose: () => void }> {
  node: HTMLDialogElement | null = null;
  previous: HTMLElement | null = null;
  cancel = (event: Event) => { event.preventDefault(); this.props.onClose(); };
  componentDidMount() { this.previous = document.activeElement as HTMLElement; this.node?.addEventListener("cancel", this.cancel); this.node?.showModal(); }
  componentWillUnmount() { this.node?.removeEventListener("cancel", this.cancel); this.node?.close(); this.previous?.focus(); }
  render() { return <dialog ref={node => { this.node = node; }} aria-labelledby="dialog-title" onClick={event => {
    if (event.target !== this.node || !this.node) return;
    const r = this.node.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) this.props.onClose();
  }}><div className="modal-heading"><h2 id="dialog-title">{this.props.title}</h2><button className="icon-button" aria-label="Close dialog" onClick={this.props.onClose}><Icon name="close"/></button></div>{this.props.children}</dialog>; }
}
function ResourceList({ rows, chart, maximum, onSelect }: { rows: Resource[]; chart: boolean; maximum: number; onSelect: (resource: Resource) => void }) {
  return <div className="resource-table-wrap"><table className="resource-table"><thead><tr><th>Name</th><th className="source-column">Source</th><th className="value-heading">{chart ? `Rows · scale 0–${number.format(maximum)}` : "Rows"}</th><th><span className="sr-only">Details</span></th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>
    <td><button className="resource-name" onClick={() => onSelect(row)}><ProviderMark provider={row.provider}/><span><strong>{row.name}</strong><small className="technical-detail">{row.kind === "table" ? row.detail : row.kind === "repository" ? "Repository" : "Deployment project"}</small><small className="mobile-source">{row.source}</small></span></button></td>
    <td className="source-column"><span className="source-name">{PROVIDERS[row.provider]}</span><small className="source-sub" title={row.source}>{row.source}</small></td>
    <td className="value-cell">{chart && <span className="bar-track" aria-hidden="true"><span style={{ width: `${100 * (row.count ?? 0) / maximum}%` }}/></span>}<span className="count">{row.count === null ? "—" : number.format(row.count)}</span></td>
    <td><button className="icon-button open-resource" aria-label={`Inspect ${row.name}`} onClick={() => onSelect(row)}><Icon name="arrow" size={16}/></button></td>
  </tr>)}</tbody></table></div>;
}
function BlockPanel({ block, index, total, onEdit, onMove }: { block: Block; index: number; total: number; onEdit: () => void; onMove: (direction: -1 | 1) => void }) {
  return <section className={`panel block-panel ${block.kind === "blank" ? "is-blank" : ""}`}><div className="panel-heading"><div><span className="eyebrow">BLOCK {String(index + 1).padStart(2, "0")}</span><h2>{block.title}</h2></div><button className="icon-button" onClick={onEdit} aria-label={`Edit ${block.title}`}><Icon name="edit" size={16}/></button></div>
    {block.kind === "note" && block.text ? <p className="note-text">{block.text}</p> : <div className="blank-content"><div className="placeholder-mark"><Icon name="cube" size={24}/></div><div className="placeholder-lines" aria-hidden="true"><span/><span/><span/></div><p>A little space for what comes next.</p><button className="text-button" onClick={onEdit}>Add content <Icon name="plus" size={14}/></button></div>}
    <div className="block-footer"><span>{block.kind === "blank" ? "Unassigned" : "Local draft"}</span><div className="block-order"><button className="icon-button" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move ${block.title} up`}><Icon name="up" size={14}/></button><button className="icon-button" disabled={index === total - 1} onClick={() => onMove(1)} aria-label={`Move ${block.title} down`}><Icon name="down" size={14}/></button></div></div>
  </section>;
}
type DashboardProps = { initialSnapshot?: Snapshot; dataWorkspaceUrl?: string };

export default class Dashboard extends React.Component<DashboardProps, State> {
  fileInput: HTMLInputElement | null = null;
  tableRequestId = 0;
  constructor(props: DashboardProps) {
    super(props); this.state = { screen: "workspace", platform: "all", provider: props.initialSnapshot ? "supabase" : "all", source: props.initialSnapshot?.resources.find(r => r.provider === "supabase")?.source || "all", search: "", chart: false,
      expanded: false, snapshot: props.initialSnapshot ? parseSnapshot(props.initialSnapshot) : null,
      layout: INITIAL_LAYOUT, dataWorkspace: null, tableRequest: null, modal: null, layoutTab: "controls", audienceTab: "data", storage: false, error: "", notice: "", importing: false };
  }
  componentDidMount() {
    try { const saved = localStorage.getItem(STORAGE); const layout = saved ? parseLayout(JSON.parse(saved)) : INITIAL_LAYOUT;
      localStorage.setItem(STORAGE, JSON.stringify(layout)); this.setState({ layout, storage: true }); }
    catch { this.setState({ storage: false, notice: "Local saving is unavailable. Changes will last for this session." }); }
  }
  persist = (layout: Layout) => {
    try { localStorage.setItem(STORAGE, JSON.stringify(layout)); this.setState({ layout, storage: true }); }
    catch { this.setState({ layout, storage: false, notice: "Changes are kept for this session only." }); }
  };
  updateSidebar = (patch: Partial<SidebarConfig>) => {
    this.persist({ ...this.state.layout, sidebar: { ...this.state.layout.sidebar, ...patch } });
  };
  collapseSidebar = (collapsed: boolean) => this.updateSidebar({ collapsed });
  receiveDataWorkspace = (dataWorkspace: DataWorkspaceState) => this.setState({ dataWorkspace });
  selectDataTable = (table: string) => {
    this.setState({ screen: "audiences", audienceTab: "data", tableRequest: { id: ++this.tableRequestId, table }, error: "", notice: "" });
  };
  selectProvider = (provider: string) => {
    const source = provider === "supabase" ? resourcesWithSnapshot(this.state.snapshot).find(r => r.provider === "supabase")?.source || "all" : "all";
    this.setState({ provider, source, chart: false, expanded: false, search: "" });
  };
  addBlock = (group: Group) => {
    if (this.state.layout[group].length >= 8) { this.setState({ notice: "Keep this view simple: up to eight blocks." }); return; }
    this.setState({ modal: { type: "block", group, draft: { id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title: group === "audiences" ? "Untitled audience" : "Untitled block", kind: "blank", text: "" } } });
  };
  updateDraft = (patch: Partial<Block>) => { const modal = this.state.modal; if (modal?.type === "block") this.setState({ modal: { ...modal, draft: { ...modal.draft, ...patch } } }); };
  saveBlock = () => {
    const modal = this.state.modal; if (modal?.type !== "block" || !modal.draft.title.trim()) return;
    const draft = { ...modal.draft, title: modal.draft.title.trim() }, existing = this.state.layout[modal.group];
    const blocks = existing.some(b => b.id === draft.id) ? existing.map(b => b.id === draft.id ? draft : b) : [...existing, draft];
    this.persist({ ...this.state.layout, [modal.group]: blocks }); this.setState({ modal: null, notice: "Draft saved on this device only." });
  };
  removeBlock = () => {
    const modal = this.state.modal; if (modal?.type !== "block") return;
    this.persist({ ...this.state.layout, [modal.group]: this.state.layout[modal.group].filter(b => b.id !== modal.draft.id) }); this.setState({ modal: null });
  };
  importFile = async (file?: File) => {
    if (!file) return; this.setState({ importing: true, error: "" });
    try {
      if (file.size > 1_000_000) throw new Error("Choose a snapshot smaller than 1 MB.");
      const snapshot = parseSnapshot(JSON.parse(await file.text()));
      this.setState({ snapshot, screen: this.state.screen === "audiences" ? "audiences" : "workspace", platform: "all", source: snapshot.resources.find(row => row.provider === "supabase")?.source || "all", provider: "all", search: "", chart: false, expanded: false, notice: "Snapshot loaded in this tab. Nothing was uploaded." });
    } catch (error) { this.setState({ error: error instanceof Error ? error.message : "Unable to open this snapshot." }); }
    finally { this.setState({ importing: false }); if (this.fileInput) this.fileInput.value = ""; }
  };
  exportLayout = () => {
    const blob = new Blob([JSON.stringify(this.state.layout, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = "olympus-layout.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  updateSuite = (patch: Partial<Layout["suite"]>) => {
    this.persist({ ...this.state.layout, suite: { ...this.state.layout.suite, ...patch } });
  };
  toggleSuiteTool = (tool: SuiteTool) => {
    const tools = this.state.layout.suite.tools;
    this.updateSuite({ tools: { ...tools, [tool]: !tools[tool] } });
  };
  renderModal() {
    const modal = this.state.modal; if (!modal) return null;
    const close = () => this.setState({ modal: null });
    if (modal.type === "resource") { const r = modal.resource; return <Modal title={r.name} onClose={close}>
      <span className="tag"><ProviderMark provider={r.provider}/>{PROVIDERS[r.provider]} · {r.kind}</span>
      <dl className="metadata"><dt>Source</dt><dd>{r.source}</dd><dt>Platform</dt><dd>{PLATFORMS.find(p => p.id === r.platform)?.name || "Not assigned"}</dd><dt>Stored rows</dt><dd>{r.count === null ? "Not available" : number.format(r.count)}</dd><dt>Retrieved</dt><dd>{r.capturedAt ? `${date(r.capturedAt)} · ${new Date(r.capturedAt).toISOString().slice(11, 16)} UTC` : "Reference only"}</dd></dl>
      <p className="detail-copy">{r.detail}</p>{r.kind === "table" && <div className="query-block"><span>Count query</span><code>{`select count(*) from public."${r.name.replaceAll('"', '""')}";`}</code></div>}<p className="muted">{r.kind === "table" ? "Only a row count is included. Individual records are not loaded. Database mappings are not inferred from table names." : "This is a resource reference, not a live connection or a health check."}</p>
      {r.url && <a className="button" href={r.url} target="_blank" rel="noopener noreferrer">Open in {PROVIDERS[r.provider]} <Icon name="out" size={14}/></a>}
    </Modal>; }
    if (modal.type === "reset") return <Modal title="Reset the layout?" onClose={close}><p className="detail-copy">This removes local drafts, restores the sidebar defaults and hides Suite tools. Imported data and your external platforms are not changed.</p><div className="modal-actions"><button className="button" onClick={close}>Keep layout</button><button className="button danger" onClick={() => { this.persist(INITIAL_LAYOUT); close(); }}>Reset layout</button></div></Modal>;
    const exists = this.state.layout[modal.group].some(b => b.id === modal.draft.id);
    return <Modal title={modal.group === "audiences" ? "Audience draft" : "Edit block"} onClose={close}><form onSubmit={event => { event.preventDefault(); this.saveBlock(); }}>
      <label className="field">Name<input required maxLength={60} value={modal.draft.title} onChange={event => this.updateDraft({ title: event.target.value })}/></label>
      <label className="field">Content type<select value={modal.draft.kind} onChange={event => this.updateDraft({ kind: event.target.value as Block["kind"] })}><option value="blank">Blank — decide later</option><option value="note">Note</option></select></label>
      {modal.draft.kind === "note" && <label className="field">Draft text<textarea rows={5} maxLength={4000} placeholder="Lorem ipsum dolor sit amet…" value={modal.draft.text} onChange={event => this.updateDraft({ text: event.target.value })}/></label>}
      <p className="muted">Saved on this device only. Not sent to any platform. Do not store confidential information in draft blocks.</p>
      <div className="modal-actions">{exists && <button type="button" className="text-button danger-text" onClick={this.removeBlock}><Icon name="trash" size={15}/>Remove</button>}<span className="spacer"/><button type="button" className="button" onClick={close}>Cancel</button><button type="submit" className="button primary" disabled={!modal.draft.title.trim()}>Save block</button></div>
    </form></Modal>;
  }
  render() {
    const s = this.state, all = resourcesWithSnapshot(s.snapshot);
    const scoped = filterResources(all, s.platform, s.provider, s.source), filtered = filterResources(scoped, "all", "all", "all", s.search);
    const visible = s.expanded ? filtered : filtered.slice(0, 6), maximum = chartMaximum(scoped);
    const sources = [...new Set(all.filter(r => r.provider === "supabase").map(r => r.source))];
    const audienceSource = sources.includes(s.source) ? s.source : sources[0] || "all";
    const audienceScoped = all.filter(row => row.provider === "supabase" && row.source === audienceSource);
    const audienceRows = filterResources(audienceScoped, "all", "all", "all", s.search);
    const audienceVisible = s.expanded ? audienceRows : audienceRows.slice(0, 6);
    const audienceHighlights = audienceScoped.slice(0, 3);
    const group: Group = s.screen === "audiences" ? "audiences" : "blocks";
    return <div className={`app-shell has-simple-sidebar ${s.layout.sidebar.collapsed ? "sidebar-is-collapsed" : ""}`} style={{ "--sidebar-size": s.layout.sidebar.width === "wide" ? "280px" : "240px", "--sidebar-space": s.layout.sidebar.collapsed ? "0px" : s.layout.sidebar.width === "wide" ? "280px" : "240px" } as React.CSSProperties}><a className="skip-link" href="#workspace-main">Skip to workspace</a>
      <WorkspaceSidebar screen={s.screen} config={s.layout.sidebar} suite={s.layout.suite} tools={SUITE_TOOLS} data={s.dataWorkspace}
        icon={(name, size) => <Icon name={name} size={size}/>}
        onCollapse={this.collapseSidebar} onSelectTable={this.selectDataTable}
        onNavigate={screen => this.setState({ screen, source: screen === "audiences" ? audienceSource : s.source, search: "", expanded: false, error: "", notice: "" })}
        onTool={name => this.setState({ notice: `${name} is visible as a test slot. It is not connected yet.` })}/>
      <div className="app-body"><header className="topbar"><div className="platform-control"><Icon name="grid" size={16}/><label className="sr-only" htmlFor="platform">Resource platform</label><select id="platform" disabled={s.screen !== "workspace"} title="Filters resource references only" value={s.platform} onChange={event => this.setState({ platform: event.target.value, source: "all", search: "", expanded: false })}><option value="all">All platforms</option>{PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div className="topbar-right"><span className="preview-tag">Design preview</span><span className="top-divider"/><span className="owner-avatar">Z</span><div className="owner">Zeus<small>Owner</small></div></div></header>
      <main id="workspace-main" tabIndex={-1} className={s.screen === "audiences" && s.audienceTab === "data" ? "data-workspace-main" : undefined}><div className="page-heading"><div><div className="eyebrow">{s.screen === "audiences" ? (s.audienceTab === "data" ? "DATA · DEMO WORKSPACE" : s.audienceTab === "vercel" ? "VERCEL · WEBSITE TRAFFIC" : s.audienceTab === "erd" ? "SUPABASE · DATABASE STRUCTURE" : "SUPABASE · SAVED SNAPSHOT") : "YOUR SPACE, STILL TAKING SHAPE"}</div><h1>{s.screen === "workspace" ? "Your workspace." : s.screen === "audiences" ? "Audiences." : "Make it yours."}</h1><p>{s.screen === "workspace" ? "A simple overview. Room to build on." : s.screen === "audiences" ? (s.audienceTab === "data" ? "Explore tables, connections and query drafts." : s.audienceTab === "vercel" ? "See how people use your platform." : s.audienceTab === "erd" ? "Explore your tables and their relationships." : "Compare stored table counts by project.") : "A few controls. Nothing complicated."}</p></div>
        <div className="page-actions">{(s.screen === "workspace" || (s.screen === "audiences" && s.audienceTab === "supabase")) && <button className="button" onClick={() => this.fileInput?.click()} disabled={s.importing}><Icon name="upload" size={16}/>{s.importing ? "Reading…" : "Import snapshot"}</button>}{s.screen === "workspace" && <button className="button primary" onClick={() => this.addBlock(group)}><Icon name="plus" size={16}/>Add block</button>}</div></div>
        <input className="sr-only" tabIndex={-1} type="file" accept=".json,application/json" ref={node => { this.fileInput = node; }} onChange={event => { void this.importFile(event.target.files?.[0]); }}/>
        {s.error && <div className="feedback error" role="alert"><Icon name="info"/>{s.error}<button className="icon-button" onClick={() => this.setState({ error: "" })} aria-label="Dismiss error"><Icon name="close" size={15}/></button></div>}
        {s.notice && <div className="feedback" role="status"><Icon name="check" size={16}/>{s.notice}<button className="icon-button" onClick={() => this.setState({ notice: "" })} aria-label="Dismiss notice"><Icon name="close" size={15}/></button></div>}
        {s.screen === "workspace" && <><div className="source-tabs" role="group" aria-label="Filter by source">{["all", "supabase", "github", "vercel"].map(provider => <button key={provider} aria-pressed={s.provider === provider} className={s.provider === provider ? "selected" : ""} onClick={() => this.selectProvider(provider)}>{provider !== "all" && <Icon name={provider === "supabase" ? "database" : provider === "github" ? "code" : "deploy"} size={15}/>}<span>{provider === "all" ? "All sources" : PROVIDERS[provider as Provider]}</span></button>)}<span className="source-tabs-caption">View only</span></div>
          <div className={`workspace-grid ${s.layout.blocks.length === 0 ? "no-blocks" : ""}`}><section className="panel resources-panel" aria-labelledby="resources-title"><div className="panel-heading"><div><h2 id="resources-title">Resources <span className="small-count">{scoped.length}</span></h2><p>{s.provider === "supabase" ? "Table counts, kept separate by database." : "One place to look. Each source stays its own."}</p></div>{s.provider === "supabase" && <div className="view-switch" aria-label="Visualisation"><button aria-label="Table view" aria-pressed={!s.chart} onClick={() => this.setState({ chart: false })}><Icon name="table" size={15}/></button><button aria-label="Bar chart view" aria-pressed={s.chart} onClick={() => this.setState({ chart: true })}><Icon name="bars" size={16}/></button></div>}</div>
            <div className="table-toolbar"><label className="search-input"><Icon name="search" size={16}/><span className="sr-only">Search resources</span><input placeholder="Find a resource…" value={s.search} onChange={event => this.setState({ search: event.target.value, expanded: false })}/>{s.search && <button className="icon-button" aria-label="Clear search" onClick={() => this.setState({ search: "" })}><Icon name="close" size={14}/></button>}</label>{s.provider === "supabase" && sources.length > 0 && <label className="database-select"><span className="sr-only">Database project</span><select value={s.source} onChange={event => this.setState({ source: event.target.value, expanded: false })}><option value="all">All databases</option>{sources.map(source => <option key={source}>{source}</option>)}</select></label>}</div>
            {visible.length > 0 ? <ResourceList rows={visible} chart={s.chart} maximum={maximum} onSelect={resource => this.setState({ modal: { type: "resource", resource } })}/> : <EmptyState title={s.search ? "No matching resources" : "Nothing added here yet"}>{s.search ? "Try a different name or clear your search." : s.platform !== "all" ? "No mapped resources for this selection. Unassigned database tables stay under All platforms." : "Import a snapshot to explore this source. No connection is assumed."}</EmptyState>}
            <div className="table-footer"><span>{visible.length} of {filtered.length} resources</span>{filtered.length > 6 && <button className="text-button" onClick={() => this.setState({ expanded: !s.expanded })}>{s.expanded ? "Show less" : "Show all"}<Icon name={s.expanded ? "up" : "down"} size={14}/></button>}<span className="table-readonly">Read-only</span></div>
          </section><div className="blocks-column">{s.layout.blocks.map((block, index) => <BlockPanel key={block.id} block={block} index={index} total={s.layout.blocks.length} onEdit={() => this.setState({ modal: { type: "block", group: "blocks", draft: { ...block } } })} onMove={direction => this.persist({ ...s.layout, blocks: moveBlock(s.layout.blocks, block.id, direction) })}/>)}{s.layout.blocks.length > 0 && s.layout.blocks.length < 8 && <button className="add-another" onClick={() => this.addBlock("blocks")}><Icon name="plus" size={16}/> Add another block</button>}</div></div>
          <div className="context-line"><Icon name="info" size={14}/><span>{s.snapshot ? "Imported tables remain unassigned until their platform links are confirmed." : "Start with references. Add data only when it is ready."}</span></div>
        </>}
        {s.screen === "audiences" && <div className="source-tabs" role="tablist" aria-label="Audience sources" onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const tabs = ["data", "supabase", "vercel", "erd"] as const;
          const audienceTab = tabs[event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (tabs.indexOf(s.audienceTab) + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
          this.setState({ audienceTab }, () => document.getElementById(`audience-tab-${audienceTab}`)?.focus());
        }}>{(["data", "supabase", "vercel", "erd"] as const).map(tab => <button key={tab} id={`audience-tab-${tab}`} role="tab" aria-controls={`audience-panel-${tab}`} aria-selected={s.audienceTab === tab} tabIndex={s.audienceTab === tab ? 0 : -1} className={s.audienceTab === tab ? "selected" : ""} onClick={() => this.setState({ audienceTab: tab, error: "", notice: "" })}>{tab === "data" ? "Data" : tab === "supabase" ? "Supabase" : tab === "vercel" ? "Vercel Analytics" : "ERD"}</button>)}</div>}
        <div hidden={s.screen !== "audiences" || s.audienceTab !== "data"} id="audience-panel-data" role="tabpanel" aria-labelledby="audience-tab-data">
          <DataWorkspace active={s.screen === "audiences" && s.audienceTab === "data"} docked={s.layout.suite.visible && s.layout.suite.tools["data-tables"]} selection={s.tableRequest} onState={this.receiveDataWorkspace} src={this.props.dataWorkspaceUrl || "/data-workspace/index.html?v=2"}/>
        </div>
        <div hidden={s.screen !== "audiences" || s.audienceTab !== "erd"} id="audience-panel-erd" role="tabpanel" aria-labelledby="audience-tab-erd"><SupabaseErd/></div>
        {s.screen === "audiences" && s.audienceTab === "vercel" && <div id="audience-panel-vercel" role="tabpanel" aria-labelledby="audience-tab-vercel"><VercelAnalytics/></div>}
        {s.screen === "audiences" && s.audienceTab === "supabase" && <div className="audiences-dashboard" id="audience-panel-supabase" role="tabpanel" aria-labelledby="audience-tab-supabase">
          <section className="audience-project-row" aria-label="Audience project"><label><span>Supabase project</span><select value={audienceSource} disabled={sources.length === 0} onChange={event => this.setState({ source: event.target.value, search: "", expanded: false })}>{sources.length === 0 ? <option value="all">No project loaded</option> : sources.map(source => <option key={source} value={source}>{source}</option>)}</select></label><span className="snapshot-state"><span className="neutral-dot"/>Snapshot · not live</span></section>
          {audienceScoped.length > 0 ? <>
            <div className="audience-totals" aria-label="Table counts">{audienceHighlights.map(resource => <article key={resource.id}><button className="audience-summary" onClick={() => this.setState({ modal: { type: "resource", resource } })}><span>{resource.name}</span><strong>{resource.count === null ? "—" : number.format(resource.count)}</strong><small>{resource.count === null ? "Count unavailable" : "Stored rows"}</small></button></article>)}</div>
            <section className="panel audience-data-panel" aria-labelledby="audience-tables-title"><div className="panel-heading"><div><h2 id="audience-tables-title">Supabase tables <span className="small-count">{audienceScoped.length}</span></h2><p>Exact stored rows from the selected project.</p></div></div><div className="table-toolbar"><label className="search-input"><Icon name="search" size={16}/><span className="sr-only">Search audience tables</span><input placeholder="Find a table…" value={s.search} onChange={event => this.setState({ search: event.target.value, expanded: false })}/>{s.search && <button className="icon-button" aria-label="Clear search" onClick={() => this.setState({ search: "" })}><Icon name="close" size={14}/></button>}</label></div>
              {audienceVisible.length ? <ResourceList rows={audienceVisible} chart maximum={chartMaximum(audienceScoped)} onSelect={resource => this.setState({ modal: { type: "resource", resource } })}/> : <EmptyState title="No matching tables">Try a different table name or clear your search.</EmptyState>}
              <div className="table-footer"><span>{audienceVisible.length} of {audienceRows.length} tables</span>{audienceRows.length > 6 && <button className="text-button" onClick={() => this.setState({ expanded: !s.expanded })}>{s.expanded ? "Show less" : "Show all"}<Icon name={s.expanded ? "up" : "down"} size={14}/></button>}<span className="table-readonly">Read-only</span></div>
            </section><div className="context-line"><Icon name="info" size={14}/><span>Counts stay separate per Supabase project. Clicking a table shows its source and count query.</span></div>
          </> : <section className="panel audience-empty"><EmptyState title="No Supabase snapshot loaded" action={<button className="button" onClick={() => this.fileInput?.click()}><Icon name="upload" size={16}/> Import snapshot</button>}>Import the saved Olympus data snapshot to view table counts by project. Nothing is uploaded or changed in Supabase.</EmptyState></section>}
        </div>}
        {s.screen === "layout" && <><div className="layout-tabs" role="tablist" aria-label="Layout sections"><button role="tab" aria-selected={s.layoutTab === "controls"} onClick={() => this.setState({ layoutTab: "controls" })}>Layout & data</button><button role="tab" aria-selected={s.layoutTab === "sidebar"} onClick={() => this.setState({ layoutTab: "sidebar" })}>Sidebar</button><button role="tab" aria-selected={s.layoutTab === "suite"} onClick={() => this.setState({ layoutTab: "suite" })}>Suite sidebar</button></div>
          {s.layoutTab === "controls" ? <section className="panel settings-panel" role="tabpanel"><div className="panel-heading"><div><h2>Layout & data</h2><p>Manage local drafts and the imported snapshot.</p></div></div><div className="setting-row"><div><h3>Local layout</h3><p>{s.storage ? "Blocks and draft text are saved on this device." : "Browser storage is unavailable. Session only."}</p></div><button className="button" onClick={this.exportLayout}>Export layout</button></div><div className="setting-row"><div><h3>Imported snapshot</h3><p>{s.snapshot ? `${s.snapshot.resources.length} references in memory. Not uploaded or persisted.` : "No snapshot loaded. Public repository references only."}</p></div><button className="button" disabled={!s.snapshot} onClick={() => this.setState({ snapshot: null, source: "all", provider: "all", search: "", chart: false, expanded: false, notice: "Snapshot cleared from this tab." })}>Clear snapshot</button></div><div className="setting-row"><div><h3>Start over</h3><p>Remove local drafts and restore one blank block.</p></div><button className="button" onClick={() => this.setState({ modal: { type: "reset" } })}>Reset layout</button></div><div className="settings-note"><Icon name="info" size={16}/><p>The Zeus owner label is part of the design, not authentication. Live Vercel analytics uses a separate owner password. Remote actions are unavailable.</p></div></section> : s.layoutTab === "sidebar" ? <SidebarSettings config={s.layout.sidebar} onChange={this.updateSidebar} onSuite={() => this.setState({ layoutTab: "suite" })}/> : <section className="panel settings-panel suite-settings" role="tabpanel"><div className="panel-heading"><div><h2>Suite sidebar</h2><p>A hidden place for small tools while Olympus is still being built.</p></div><label className="switch-control"><span>{s.layout.suite.visible ? "Shown" : "Hidden"}</span><input type="checkbox" checked={s.layout.suite.visible} onChange={() => this.updateSuite({ visible: !s.layout.suite.visible })}/><span className="switch-track" aria-hidden="true"><span/></span></label></div><div className="suite-intro"><Icon name="info" size={16}/><p>Turn the sidebar on only when you need it. Tools stay separate from the main navigation and can be enabled one by one.</p></div><div className="suite-tool-list">{SUITE_TOOLS.map(tool => <div className="suite-tool-row" key={tool.id}><span className="suite-tool-icon"><Icon name={tool.icon} size={17}/></span><div><h3>{tool.name}</h3><p>{tool.description}</p></div><label className="switch-control"><span className="sr-only">Show {tool.name}</span><input type="checkbox" checked={s.layout.suite.tools[tool.id]} onChange={() => this.toggleSuiteTool(tool.id)}/><span className="switch-track" aria-hidden="true"><span/></span></label></div>)}</div><div className="settings-note"><Icon name="bolt" size={16}/><p>Data tables opens the demo browser. The other tools remain test slots. Nothing changes on your connected platforms.</p></div></section>}
        </>}
        <footer className="workspace-footer"><span><span className="neutral-dot"/>{s.screen === "audiences" && s.audienceTab === "data" ? "Demo database · drafts only" : s.screen === "audiences" && s.audienceTab === "vercel" ? "Vercel Analytics · read-only" : s.screen === "audiences" && s.audienceTab === "erd" ? "Supabase ERD · read-only schema" : s.snapshot ? `Snapshot · ${date(s.snapshot.capturedAt)} · not live` : "Reference view · no live connections"}</span><span>{s.storage ? "Layout saved on this device" : "Session-only layout"}</span></footer>
      </main></div>{this.renderModal()}
    </div>;
  }
}
