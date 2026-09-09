"use client";

import * as React from "react";
import { Block, Layout, Resource, Snapshot, Provider, PLATFORMS, PROVIDERS, INITIAL_LAYOUT,
  parseSnapshot, parseLayout, resourcesWithSnapshot, filterResources, chartMaximum, moveBlock } from "../lib/workspace";

type Group = "blocks" | "audiences";
type ModalState = { type: "resource"; resource: Resource } | { type: "block"; group: Group; draft: Block } | { type: "reset" } | null;
type State = { screen: "workspace" | "audiences" | "layout"; platform: string; provider: string; source: string;
  search: string; chart: boolean; expanded: boolean; snapshot: Snapshot | null; layout: Layout; modal: ModalState;
  storage: boolean; error: string; notice: string; importing: boolean };
const STORAGE = "olympus-layout-v02";
const number = new Intl.NumberFormat("en-GB");
const date = (value: string | null) => value ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value)) : "Not a live reading";
const icons: Record<string, React.ReactNode> = {
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
export default class Dashboard extends React.Component<{ initialSnapshot?: Snapshot }, State> {
  fileInput: HTMLInputElement | null = null;
  constructor(props: { initialSnapshot?: Snapshot }) {
    super(props); this.state = { screen: "workspace", platform: "all", provider: props.initialSnapshot ? "supabase" : "all", source: props.initialSnapshot?.resources.find(r => r.provider === "supabase")?.source || "all", search: "", chart: false,
      expanded: false, snapshot: props.initialSnapshot ? parseSnapshot(props.initialSnapshot) : null,
      layout: INITIAL_LAYOUT, modal: null, storage: false, error: "", notice: "", importing: false };
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
      this.setState({ snapshot, screen: "workspace", platform: "all", source: "all", provider: "all", search: "", chart: false, expanded: false, notice: "Snapshot loaded in this tab. Nothing was uploaded." });
    } catch (error) { this.setState({ error: error instanceof Error ? error.message : "Unable to open this snapshot." }); }
    finally { this.setState({ importing: false }); if (this.fileInput) this.fileInput.value = ""; }
  };
  exportLayout = () => {
    const blob = new Blob([JSON.stringify(this.state.layout, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = "olympus-layout.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  renderModal() {
    const modal = this.state.modal; if (!modal) return null;
    const close = () => this.setState({ modal: null });
    if (modal.type === "resource") { const r = modal.resource; return <Modal title={r.name} onClose={close}>
      <span className="tag"><ProviderMark provider={r.provider}/>{PROVIDERS[r.provider]} · {r.kind}</span>
      <dl className="metadata"><dt>Source</dt><dd>{r.source}</dd><dt>Platform</dt><dd>{PLATFORMS.find(p => p.id === r.platform)?.name || "Not assigned"}</dd><dt>Stored rows</dt><dd>{r.count === null ? "Not available" : number.format(r.count)}</dd><dt>Retrieved</dt><dd>{r.capturedAt ? `${date(r.capturedAt)} · ${new Date(r.capturedAt).toISOString().slice(11, 16)} UTC` : "Reference only"}</dd></dl>
      <p className="detail-copy">{r.detail}</p><p className="muted">{r.kind === "table" ? "Only a row count is included. Individual records are not loaded. Database mappings are not inferred from table names." : "This is a resource reference, not a live connection or a health check."}</p>
      {r.url && <a className="button" href={r.url} target="_blank" rel="noopener noreferrer">Open in {PROVIDERS[r.provider]} <Icon name="out" size={14}/></a>}
    </Modal>; }
    if (modal.type === "reset") return <Modal title="Reset the layout?" onClose={close}><p className="detail-copy">This removes local block and audience drafts. Imported data and your external platforms are not changed.</p><div className="modal-actions"><button className="button" onClick={close}>Keep layout</button><button className="button danger" onClick={() => { this.persist(INITIAL_LAYOUT); close(); }}>Reset local drafts</button></div></Modal>;
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
    const group: Group = s.screen === "audiences" ? "audiences" : "blocks";
    return <div className="app-shell"><a className="skip-link" href="#workspace-main">Skip to workspace</a>
      <aside className="sidebar"><div className="brand"><span className="brand-mark"><Icon name="bolt" size={24}/></span><span>OLYMPUS<small>A shared perspective.</small></span></div>
        <div className="nav-label">WORKSPACE</div><nav aria-label="Main navigation">{([
          ["workspace", "grid", "Overview"], ["audiences", "people", "Audiences"], ["layout", "sliders", "Layout"]] as const).map(([screen, icon, label]) => <button key={screen} className={`nav-item ${s.screen === screen ? "active" : ""}`} aria-current={s.screen === screen ? "page" : undefined} onClick={() => this.setState({ screen, error: "", notice: "" })}><Icon name={icon}/><span>{label}</span>{s.screen === screen && <span className="nav-dot"/>}</button>)}</nav>
        <div className="sidebar-bottom"><span className="tiny-square"/><span>Design foundation<small>Version 0.2 · no live actions</small></span></div>
      </aside>
      <div className="app-body"><header className="topbar"><div className="platform-control"><Icon name="grid" size={16}/><label className="sr-only" htmlFor="platform">Resource platform</label><select id="platform" disabled={s.screen !== "workspace"} title="Filters resource references only" value={s.platform} onChange={event => this.setState({ platform: event.target.value, source: "all", search: "", expanded: false })}><option value="all">All platforms</option>{PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div className="topbar-right"><span className="preview-tag">Design preview</span><span className="top-divider"/><span className="owner-avatar">Z</span><div className="owner">Zeus<small>Owner</small></div></div></header>
      <main id="workspace-main" tabIndex={-1}><div className="page-heading"><div><div className="eyebrow">YOUR SPACE, STILL TAKING SHAPE</div><h1>{s.screen === "workspace" ? "Your workspace." : s.screen === "audiences" ? "Your audiences." : "Make it yours."}</h1><p>{s.screen === "workspace" ? "A simple overview. Room to build on." : s.screen === "audiences" ? "Start with a name. Define the rest later." : "A few controls. Nothing complicated."}</p></div>
        <div className="page-actions"><button className="button" onClick={() => this.fileInput?.click()} disabled={s.importing}><Icon name="upload" size={16}/>{s.importing ? "Reading…" : "Import snapshot"}</button>{s.screen !== "layout" && <button className="button primary" onClick={() => this.addBlock(group)}><Icon name="plus" size={16}/>{s.screen === "audiences" ? "Add draft" : "Add block"}</button>}</div></div>
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
        {s.screen === "audiences" && <><p className="section-caption">Workspace-wide drafts · not measured audiences or platform assignments</p>{s.layout.audiences.length === 0 ? <section className="panel audience-empty"><EmptyState title="Nothing defined yet" action={<button className="button" onClick={() => this.addBlock("audiences")}><Icon name="plus" size={16}/> Create a draft</button>}>Leave this open for now, or add a blank audience block. No profiles or numbers are generated.</EmptyState></section> : <div className="audience-grid">{s.layout.audiences.map((block, index) => <BlockPanel key={block.id} block={block} index={index} total={s.layout.audiences.length} onEdit={() => this.setState({ modal: { type: "block", group: "audiences", draft: { ...block } } })} onMove={direction => this.persist({ ...s.layout, audiences: moveBlock(s.layout.audiences, block.id, direction) })}/>)}</div>}</>}
        {s.screen === "layout" && <section className="panel settings-panel"><div className="panel-heading"><div><h2>Layout & data</h2><p>This preview does not connect to external accounts.</p></div></div><div className="setting-row"><div><h3>Local layout</h3><p>{s.storage ? "Blocks and draft text are saved on this device." : "Browser storage is unavailable. Session only."}</p></div><button className="button" onClick={this.exportLayout}>Export layout</button></div><div className="setting-row"><div><h3>Imported snapshot</h3><p>{s.snapshot ? `${s.snapshot.resources.length} references in memory. Not uploaded or persisted.` : "No snapshot loaded. Public repository references only."}</p></div><button className="button" disabled={!s.snapshot} onClick={() => this.setState({ snapshot: null, source: "all", provider: "all", search: "", chart: false, expanded: false, notice: "Snapshot cleared from this tab." })}>Clear snapshot</button></div><div className="setting-row"><div><h3>Start over</h3><p>Remove local drafts and restore one blank block.</p></div><button className="button" onClick={() => this.setState({ modal: { type: "reset" } })}>Reset layout</button></div><div className="settings-note"><Icon name="info" size={16}/><p>The Zeus owner label is part of the design, not authentication. Private live data and remote actions require a separate secure implementation.</p></div></section>}
        <footer className="workspace-footer"><span><span className="neutral-dot"/>{s.snapshot ? `Snapshot · ${date(s.snapshot.capturedAt)} · not live` : "Reference view · no live connections"}</span><span>{s.storage ? "Layout saved on this device" : "Session-only layout"}</span></footer>
      </main></div>{this.renderModal()}
    </div>;
  }
}
