"use client";

import * as React from "react";
import Link from "next/link";

type Viewport = "desktop" | "tablet" | "mobile";
type Density = "compact" | "comfortable" | "spacious";
type ModuleId = "heading" | "sourcebar" | "workspace" | "context";
type FeatureId = "shell" | "sidebar" | "topbar" | "main" | "heading" | "sourcebar" | "resources" | "blocks" | "context" | "footer";

type Feature = {
  id: FeatureId;
  name: string;
  kind: string;
  description: string;
  file: string;
  selector: string;
  group: "Frame" | "Page" | "Content";
  canHide?: boolean;
};

type BuilderDraft = {
  sidebarWidth: number;
  gap: number;
  radius: number;
  scale: number;
  density: Density;
  hidden: FeatureId[];
  modules: ModuleId[];
};

const STORAGE = "olympus-builder-lab-v01";
const DEFAULT_DRAFT: BuilderDraft = {
  sidebarWidth: 208,
  gap: 20,
  radius: 12,
  scale: 100,
  density: "comfortable",
  hidden: [],
  modules: ["heading", "sourcebar", "workspace", "context"]
};

const FEATURES: Feature[] = [
  { id: "shell", name: "App shell", kind: "Frame", description: "The root layout that keeps navigation and the current screen together.", file: "components/dashboard.tsx", selector: ".app-shell", group: "Frame" },
  { id: "sidebar", name: "Sidebar", kind: "Navigation", description: "Main navigation and the optional Suite test tools.", file: "components/dashboard.tsx", selector: ".sidebar", group: "Frame", canHide: true },
  { id: "topbar", name: "Top bar", kind: "Navigation", description: "Platform selector, preview state and owner marker.", file: "components/dashboard.tsx", selector: ".topbar", group: "Frame", canHide: true },
  { id: "main", name: "Main canvas", kind: "Container", description: "The central area where each Olympus screen is rendered.", file: "components/dashboard.tsx", selector: "main#workspace-main", group: "Page" },
  { id: "heading", name: "Page heading", kind: "Module", description: "Eyebrow, title, description and page actions.", file: "components/dashboard.tsx", selector: ".page-heading", group: "Page", canHide: true },
  { id: "sourcebar", name: "Source tabs", kind: "Module", description: "Filters the resource view by Supabase, GitHub or Vercel.", file: "components/dashboard.tsx", selector: ".source-tabs", group: "Page", canHide: true },
  { id: "resources", name: "Resources panel", kind: "Feature", description: "Searchable resource table with source filters and detail inspection.", file: "components/dashboard.tsx", selector: ".resources-panel", group: "Content", canHide: true },
  { id: "blocks", name: "Draft blocks", kind: "Feature", description: "Local note and blank blocks stored in the browser layout.", file: "components/dashboard.tsx", selector: ".blocks-column", group: "Content", canHide: true },
  { id: "context", name: "Context line", kind: "Module", description: "Small explanatory status line underneath the main workspace.", file: "components/dashboard.tsx", selector: ".context-line", group: "Page", canHide: true },
  { id: "footer", name: "Workspace footer", kind: "Module", description: "Shows whether the current view is live, snapshot-based or local only.", file: "components/dashboard.tsx", selector: ".workspace-footer", group: "Page", canHide: true }
];

const MODULE_LABELS: Record<ModuleId, string> = {
  heading: "Page heading",
  sourcebar: "Source tabs",
  workspace: "Workspace grid",
  context: "Context line"
};

const FILES = [
  ["components/dashboard.tsx", "Main dashboard structure and interaction"],
  ["app/globals.css", "Global layout, spacing and visual system"],
  ["lib/workspace.ts", "Resource, layout and snapshot data model"],
  ["components/vercel-analytics.tsx", "Vercel traffic screen and analytics UI"]
] as const;

function clamp(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function parseDraft(value: unknown): BuilderDraft {
  if (!value || typeof value !== "object") return DEFAULT_DRAFT;
  const draft = value as Partial<BuilderDraft>;
  const density: Density = draft.density === "compact" || draft.density === "spacious" ? draft.density : "comfortable";
  const hidden = Array.isArray(draft.hidden) ? draft.hidden.filter((id): id is FeatureId => FEATURES.some(feature => feature.id === id)) : [];
  const modules = Array.isArray(draft.modules)
    ? draft.modules.filter((id): id is ModuleId => ["heading", "sourcebar", "workspace", "context"].includes(String(id)))
    : DEFAULT_DRAFT.modules;
  return {
    sidebarWidth: clamp(draft.sidebarWidth, 160, 280, DEFAULT_DRAFT.sidebarWidth),
    gap: clamp(draft.gap, 8, 36, DEFAULT_DRAFT.gap),
    radius: clamp(draft.radius, 0, 24, DEFAULT_DRAFT.radius),
    scale: clamp(draft.scale, 85, 115, DEFAULT_DRAFT.scale),
    density,
    hidden,
    modules: modules.length === 4 ? modules : DEFAULT_DRAFT.modules
  };
}

function FeatureButton({ feature, selected, onSelect }: { feature: Feature; selected: boolean; onSelect: () => void }) {
  return <button className={`feature-button ${selected ? "selected" : ""}`} onClick={onSelect}>
    <span className="feature-dot"/>
    <span><strong>{feature.name}</strong><small>{feature.selector}</small></span>
    <span className="feature-kind">{feature.kind}</span>
  </button>;
}

export default function BuilderLab() {
  const [selected, setSelected] = React.useState<FeatureId>("resources");
  const [viewport, setViewport] = React.useState<Viewport>("desktop");
  const [draft, setDraft] = React.useState<BuilderDraft>(DEFAULT_DRAFT);
  const [ready, setReady] = React.useState(false);
  const [dragged, setDragged] = React.useState<ModuleId | null>(null);
  const [notice, setNotice] = React.useState("");

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE);
      if (saved) setDraft(parseDraft(JSON.parse(saved)));
    } catch {
      setNotice("Local storage is unavailable. This draft will last only for this tab.");
    } finally {
      setReady(true);
    }
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE, JSON.stringify(draft)); }
    catch { /* Session-only fallback. */ }
  }, [draft, ready]);

  const feature = FEATURES.find(item => item.id === selected) || FEATURES[0];
  const changed = JSON.stringify(draft) !== JSON.stringify(DEFAULT_DRAFT);
  const hidden = (id: FeatureId) => draft.hidden.includes(id);
  const densityPadding = draft.density === "compact" ? 12 : draft.density === "spacious" ? 24 : 18;
  const previewSidebar = viewport === "mobile" ? Math.min(72, draft.sidebarWidth) : viewport === "tablet" ? Math.min(150, draft.sidebarWidth) : draft.sidebarWidth;
  const deviceWidth = viewport === "desktop" ? 1040 : viewport === "tablet" ? 760 : 390;

  const previewStyle = {
    "--builder-sidebar": `${previewSidebar}px`,
    "--builder-gap": `${draft.gap}px`,
    "--builder-radius": `${draft.radius}px`,
    "--builder-padding": `${densityPadding}px`,
    "--builder-scale": String(draft.scale / 100)
  } as React.CSSProperties;

  const update = (patch: Partial<BuilderDraft>) => setDraft(current => ({ ...current, ...patch }));
  const toggleVisibility = () => {
    if (!feature.canHide) return;
    update({ hidden: hidden(feature.id) ? draft.hidden.filter(id => id !== feature.id) : [...draft.hidden, feature.id] });
  };
  const moveModule = (target: ModuleId) => {
    if (!dragged || dragged === target) return;
    const next = [...draft.modules];
    const from = next.indexOf(dragged), to = next.indexOf(target);
    next.splice(from, 1); next.splice(to, 0, dragged);
    update({ modules: next }); setDragged(null);
  };
  const reset = () => {
    setDraft(DEFAULT_DRAFT); setViewport("desktop"); setSelected("resources"); setNotice("Builder draft reset. Nothing in the dashboard source was changed.");
  };
  const exportDraft = () => {
    const payload = { version: 1, createdAt: new Date().toISOString(), scope: "preview-only", draft };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = "olympus-builder-draft.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Test configuration exported. It still does not write to the dashboard source.");
  };

  const select = (id: FeatureId) => (event: React.MouseEvent) => { event.stopPropagation(); setSelected(id); };

  const renderModule = (module: ModuleId) => {
    const wrapper = (child: React.ReactNode) => <div key={module} className="sortable-module" draggable onDragStart={() => setDragged(module)} onDragOver={event => event.preventDefault()} onDrop={() => moveModule(module)}>
      <span className="drag-handle" title="Drag to reorder">⋮⋮</span>{child}
    </div>;
    if (module === "heading") return wrapper(hidden("heading") ? null : <button className={`mock-heading selectable ${selected === "heading" ? "selected" : ""}`} onClick={select("heading")}>
      <span className="mock-eyebrow">YOUR SPACE, STILL TAKING SHAPE</span><strong>Your workspace.</strong><small>A simple overview. Room to build on.</small>
    </button>);
    if (module === "sourcebar") return wrapper(hidden("sourcebar") ? null : <button className={`mock-tabs selectable ${selected === "sourcebar" ? "selected" : ""}`} onClick={select("sourcebar")}><span className="active">All sources</span><span>Supabase</span><span>GitHub</span><span>Vercel</span></button>);
    if (module === "context") return wrapper(hidden("context") ? null : <button className={`mock-context selectable ${selected === "context" ? "selected" : ""}`} onClick={select("context")}>ⓘ Start with references. Add data only when it is ready.</button>);
    return wrapper(<div className="mock-grid">
      {!hidden("resources") && <button className={`mock-panel mock-resources selectable ${selected === "resources" ? "selected" : ""}`} onClick={select("resources")}>
        <div className="mock-panel-head"><span><strong>Resources</strong><small>One place to look. Each source stays its own.</small></span><span>⌕</span></div>
        <div className="mock-search">Find a resource…</div>
        {["Aegora", "Phosphoros", "Civiora", "Meridian"].map((name, index) => <div className="mock-row" key={name}><span className="row-mark"/><span><strong>{name}</strong><small>{index % 2 ? "GitHub repository" : "Supabase table"}</small></span><span className="row-count">{index % 2 ? "repo" : `${18 + index * 7}`}</span></div>)}
      </button>}
      {!hidden("blocks") && <button className={`mock-blocks selectable ${selected === "blocks" ? "selected" : ""}`} onClick={select("blocks")}>
        <span className="mock-eyebrow">BLOCK 01</span><strong>Untitled block</strong><div className="mock-placeholder"><span>◇</span><i/><i/><i/></div><small>Local draft</small>
      </button>}
    </div>);
  };

  return <div className="builder-lab">
    <header className="builder-header">
      <div><Link href="/" className="back-link">← Olympus</Link><span className="builder-separator"/> <strong>Builder Lab</strong><span className="test-badge">TEST ONLY</span></div>
      <div className="builder-actions"><button onClick={reset}>Reset</button><button className="primary" onClick={exportDraft}>Export draft</button></div>
    </header>

    <div className="workflow-strip" aria-label="Builder workflow"><span className="done">1 · Select feature</span><span className="active">2 · Inspect origin</span><span>3 · Customize preview</span><span>4 · Write to source later</span></div>
    {notice && <div className="builder-notice">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}

    <div className="builder-grid">
      <aside className="feature-map">
        <div className="pane-title"><span>FEATURE MAP</span><strong>What exists</strong><small>Select a feature to see where it comes from.</small></div>
        {(["Frame", "Page", "Content"] as const).map(group => <div className="feature-group" key={group}><span>{group}</span>{FEATURES.filter(item => item.group === group).map(item => <FeatureButton key={item.id} feature={item} selected={selected === item.id} onSelect={() => setSelected(item.id)}/>)}</div>)}
        <div className="file-map"><span>FILES</span>{FILES.map(([file, description]) => <a key={file} href={`https://github.com/Esmeevanleeuwen/olympus/blob/main/${file}`} target="_blank" rel="noopener noreferrer"><strong>{file}</strong><small>{description}</small></a>)}</div>
      </aside>

      <section className="canvas-pane">
        <div className="canvas-toolbar"><div><strong>Live canvas</strong><span>Changes happen here only.</span></div><div className="viewport-switch">{(["desktop", "tablet", "mobile"] as Viewport[]).map(size => <button key={size} className={viewport === size ? "active" : ""} onClick={() => setViewport(size)}>{size}</button>)}</div></div>
        <div className="canvas-scroll"><div className="device-frame" style={{ width: deviceWidth }}>
          <div className="mock-shell selectable" style={previewStyle} onClick={select("shell")} data-selected={selected === "shell" ? "true" : undefined}>
            {!hidden("sidebar") && <button className={`mock-sidebar selectable ${selected === "sidebar" ? "selected" : ""}`} onClick={select("sidebar")}><strong>⚡ OLYMPUS</strong><small>A shared perspective.</small><span>Overview</span><span>Audiences</span><span>Builder Lab</span><span>Layout</span></button>}
            <div className="mock-body">
              {!hidden("topbar") && <button className={`mock-topbar selectable ${selected === "topbar" ? "selected" : ""}`} onClick={select("topbar")}><span>▦ All platforms</span><span>Design preview · Zeus</span></button>}
              <button className={`mock-main selectable ${selected === "main" ? "selected" : ""}`} onClick={select("main")}>
                {draft.modules.map(renderModule)}
                {!hidden("footer") && <span className={`mock-footer selectable ${selected === "footer" ? "selected" : ""}`} onClick={select("footer")}>● Reference view · no live connections <i/> Layout saved on this device</span>}
              </button>
            </div>
          </div>
        </div></div>
        <div className="canvas-help"><span>Click anything in the preview to inspect it.</span><span>Drag the four page modules by the ⋮⋮ handle to change their order.</span></div>
      </section>

      <aside className="inspector-pane">
        <div className="pane-title"><span>INSPECTOR</span><strong>{feature.name}</strong><small>{feature.description}</small></div>
        <div className="inspect-card"><span>WHAT</span><dl><dt>Type</dt><dd>{feature.kind}</dd><dt>Selector</dt><dd><code>{feature.selector}</code></dd></dl></div>
        <div className="inspect-card"><span>WHERE</span><a className="source-link" href={`https://github.com/Esmeevanleeuwen/olympus/blob/main/${feature.file}`} target="_blank" rel="noopener noreferrer"><strong>{feature.file}</strong><small>Open source file ↗</small></a><p>Visual rules mainly live in <code>app/globals.css</code>.</p></div>

        <div className="inspect-card controls"><span>ADJUST · PREVIEW ONLY</span>
          {feature.canHide && <label className="switch-row"><span><strong>Show element</strong><small>Hide it only inside this Builder Lab.</small></span><input type="checkbox" checked={!hidden(feature.id)} onChange={toggleVisibility}/></label>}
          <label><span>Sidebar width <b>{draft.sidebarWidth}px</b></span><input type="range" min="160" max="280" value={draft.sidebarWidth} onChange={event => update({ sidebarWidth: Number(event.target.value) })}/></label>
          <label><span>Panel gap <b>{draft.gap}px</b></span><input type="range" min="8" max="36" value={draft.gap} onChange={event => update({ gap: Number(event.target.value) })}/></label>
          <label><span>Corner radius <b>{draft.radius}px</b></span><input type="range" min="0" max="24" value={draft.radius} onChange={event => update({ radius: Number(event.target.value) })}/></label>
          <label><span>UI scale <b>{draft.scale}%</b></span><input type="range" min="85" max="115" value={draft.scale} onChange={event => update({ scale: Number(event.target.value) })}/></label>
          <label><span>Density</span><select value={draft.density} onChange={event => update({ density: event.target.value as Density })}><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></select></label>
        </div>

        <div className="draft-state"><span className={changed ? "changed" : ""}/><div><strong>{changed ? "Unsaved source idea" : "Default preview"}</strong><small>{ready ? "Saved locally as a test configuration." : "Loading local draft…"}</small></div></div>
        <button className="future-action" disabled>Write changes to source <span>LATER</span></button>
        <p className="safety-copy">Nothing here edits GitHub, Supabase, Vercel or the real Olympus layout. This is the safe layer before we build the real inspect-and-edit workflow.</p>
      </aside>
    </div>

    <style jsx>{`
      .builder-lab{min-height:100vh;background:#0e0f11;color:#f3f3f6}.builder-header{height:66px;border-bottom:1px solid #282a32;background:#101114;display:flex;align-items:center;justify-content:space-between;padding:0 22px;position:sticky;top:0;z-index:20}.builder-header>div{display:flex;align-items:center;gap:10px}.back-link{color:#b7aef5;font-size:12px}.builder-separator{width:1px;height:22px;background:#30323a}.builder-header strong{font-size:13px;font-weight:600}.test-badge{font-size:9px;letter-spacing:.8px;border:1px solid #4a4360;background:#282531;color:#d8d0ff;padding:4px 7px;border-radius:5px}.builder-actions button,.canvas-toolbar button,.future-action{border:1px solid #353740;background:#18191e;color:#d8d9e2;border-radius:7px;min-height:34px;padding:7px 10px;font-size:10px}.builder-actions .primary{background:#b7aef5;border-color:#b7aef5;color:#211b35;font-weight:600}.workflow-strip{height:39px;display:flex;align-items:center;gap:24px;padding:0 22px;border-bottom:1px solid #24262d;background:#121317;color:#6f7280;font-size:9px;letter-spacing:.4px;white-space:nowrap;overflow-x:auto}.workflow-strip .done{color:#9b97b0}.workflow-strip .active{color:#d5cdf9}.builder-notice{margin:14px 18px 0;border:1px solid #3c384b;background:#211e2b;color:#d5ccec;border-radius:8px;padding:9px 12px;display:flex;align-items:center;justify-content:space-between;font-size:11px}.builder-notice button{border:0;background:transparent;color:#aaa6b7;font-size:17px}.builder-grid{display:grid;grid-template-columns:260px minmax(0,1fr) 300px;min-height:calc(100vh - 105px)}.feature-map,.inspector-pane{background:#111215;min-width:0;padding:20px 16px;overflow:auto}.feature-map{border-right:1px solid #282a32}.inspector-pane{border-left:1px solid #282a32}.pane-title{display:flex;flex-direction:column;gap:5px;padding:0 5px 17px}.pane-title>span,.feature-group>span,.file-map>span,.inspect-card>span{font-size:8px;letter-spacing:1.4px;color:#777b8b}.pane-title strong{font-size:15px;font-weight:560}.pane-title small{font-size:10px;line-height:1.6;color:#858896}.feature-group{border-top:1px solid #25272e;padding-top:13px;margin-top:5px}.feature-group>span{display:block;padding:0 6px 8px}.feature-button{width:100%;min-height:48px;border:1px solid transparent;background:transparent;color:#a6a8b3;border-radius:8px;padding:8px 8px;display:grid;grid-template-columns:8px minmax(0,1fr) auto;align-items:center;gap:8px;text-align:left}.feature-button:hover{background:#18191e;color:#eeeef3}.feature-button.selected{background:#282531;border-color:#3a3447;color:#e2dcfb}.feature-dot{width:5px;height:5px;border-radius:50%;background:#5c5f6b}.feature-button.selected .feature-dot{background:#b7aef5}.feature-button strong{display:block;font-size:11px;font-weight:520}.feature-button small{display:block;margin-top:2px;color:#696c79;font-size:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.feature-kind{font-size:8px;color:#747786}.file-map{border-top:1px solid #25272e;margin-top:18px;padding-top:14px}.file-map>span{display:block;padding:0 6px 8px}.file-map a{display:block;padding:9px 7px;border-radius:7px}.file-map a:hover{background:#18191e}.file-map strong{display:block;color:#c6c6d0;font-size:9px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}.file-map small{display:block;color:#696c79;font-size:8px;margin-top:4px;line-height:1.45}.canvas-pane{min-width:0;background:#0c0d0f;display:flex;flex-direction:column}.canvas-toolbar{height:58px;border-bottom:1px solid #24262d;background:#101114;display:flex;align-items:center;justify-content:space-between;padding:0 18px}.canvas-toolbar>div:first-child{display:flex;align-items:baseline;gap:9px}.canvas-toolbar strong{font-size:12px}.canvas-toolbar span{font-size:9px;color:#777b8b}.viewport-switch{display:flex;gap:4px}.canvas-toolbar button{min-height:29px;padding:5px 8px;color:#7f818d;background:#14151a}.canvas-toolbar button.active{background:#2b2835;color:#ddd6fb;border-color:#4a435b}.canvas-scroll{flex:1;overflow:auto;padding:28px;display:flex;align-items:flex-start;justify-content:center}.device-frame{max-width:100%;transition:width .2s ease;box-shadow:0 20px 70px rgba(0,0,0,.35)}.mock-shell{display:flex;min-height:610px;background:#0e0f11;border:1px solid #30323a;transform:scale(var(--builder-scale));transform-origin:top center;transition:transform .15s}.selectable{cursor:pointer;position:relative}.selectable.selected,.mock-shell[data-selected=true]{outline:2px solid #b7aef5!important;outline-offset:-2px;box-shadow:inset 0 0 0 1px rgba(183,174,245,.25)}.mock-sidebar{width:var(--builder-sidebar);flex:none;background:#111215;border:0;border-right:1px solid #282a32;color:#9ea0ac;text-align:left;padding:26px 16px;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:8px;border-radius:0}.mock-sidebar strong{color:#e2e2e8;font-size:11px;letter-spacing:1.2px;margin-bottom:0}.mock-sidebar small{font-size:7px;color:#676a77;margin-bottom:28px}.mock-sidebar span{display:block;border-radius:6px;padding:9px 10px;font-size:9px}.mock-sidebar span:nth-of-type(3){background:#282531;color:#dcd5fc}.mock-body{min-width:0;flex:1}.mock-topbar{width:100%;height:56px;border:0;border-bottom:1px solid #282a32;border-radius:0;background:#101114;color:#8d8f9b;padding:0 20px;display:flex;justify-content:space-between;font-size:8px}.mock-main{display:block;width:100%;text-align:left;border:0;background:#0e0f11;color:#f0f0f3;border-radius:0;padding:calc(var(--builder-padding) + 6px);min-height:552px}.sortable-module{position:relative}.drag-handle{position:absolute;left:-17px;top:7px;color:#555965;font-size:10px;cursor:grab;z-index:3}.mock-heading{display:flex;flex-direction:column;align-items:flex-start;width:100%;background:transparent;border:0;color:#f1f1f4;padding:0 0 var(--builder-padding);text-align:left}.mock-heading strong{font-size:22px;font-weight:540;letter-spacing:-.7px;margin:4px 0}.mock-heading small{font-size:8px;color:#7e818d}.mock-eyebrow{font-size:6px;letter-spacing:1.2px;color:#646875}.mock-tabs{width:100%;border:0;border-bottom:1px solid #282a32;border-radius:0;background:transparent;display:flex;justify-content:flex-start;gap:18px;padding:0 0 10px;margin-bottom:var(--builder-padding);color:#717480;font-size:8px}.mock-tabs span.active{color:#d8d1fb}.mock-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(130px,31%);gap:var(--builder-gap);align-items:start}.mock-panel,.mock-blocks{border:1px solid #282a32;border-radius:var(--builder-radius);background:#15161a;color:#dfe0e5;overflow:hidden}.mock-panel{padding:0;text-align:left}.mock-panel-head{display:flex;justify-content:space-between;padding:var(--builder-padding);align-items:flex-start}.mock-panel-head strong{font-size:10px}.mock-panel-head small{display:block;font-size:7px;color:#6f7280;margin-top:3px}.mock-search{margin:0 var(--builder-padding) 10px;border:1px solid #2c2e36;background:#101115;border-radius:5px;padding:7px 9px;color:#5e626f;font-size:7px}.mock-row{border-top:1px solid #25272e;padding:9px var(--builder-padding);display:grid;grid-template-columns:18px minmax(0,1fr) auto;gap:8px;align-items:center}.row-mark{width:17px;height:17px;border-radius:5px;background:#23252d;border:1px solid #343640}.mock-row strong{font-size:8px}.mock-row small{display:block;font-size:6px;color:#626571;margin-top:2px}.row-count{font-size:7px;color:#aaa7b9}.mock-blocks{display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:var(--builder-padding);min-height:250px}.mock-blocks>strong{font-size:10px;margin:5px 0 14px}.mock-placeholder{width:100%;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#6f697f}.mock-placeholder span{font-size:24px}.mock-placeholder i{display:block;width:50%;height:3px;background:#292a31;border-radius:3px}.mock-placeholder i:nth-of-type(2){width:68%}.mock-placeholder i:nth-of-type(3){width:38%}.mock-blocks>small{width:100%;border-top:1px solid #25272e;padding-top:9px;color:#666a76;font-size:7px}.mock-context{border:0;background:transparent;color:#6e717d;font-size:7px;padding:var(--builder-padding) 0 0;text-align:left}.mock-footer{display:flex;align-items:center;width:100%;border-top:1px solid #22242a;margin-top:28px;padding-top:13px;color:#5f626e;font-size:6px}.mock-footer i{flex:1}.canvas-help{border-top:1px solid #24262d;background:#101114;padding:10px 18px;display:flex;justify-content:space-between;gap:18px;color:#686b77;font-size:8px}.inspect-card{border-top:1px solid #25272e;padding:15px 5px}.inspect-card>span{display:block;margin-bottom:10px}.inspect-card dl{display:grid;grid-template-columns:60px 1fr;gap:7px 10px;margin:0;font-size:9px}.inspect-card dt{color:#6e717d}.inspect-card dd{margin:0;color:#c6c7d0;overflow-wrap:anywhere}.inspect-card code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:#bdb7da;font-size:8px}.source-link{display:block;background:#17181d;border:1px solid #2c2e36;border-radius:7px;padding:10px}.source-link strong{display:block;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:9px;overflow-wrap:anywhere}.source-link small{display:block;color:#7e8090;font-size:8px;margin-top:4px}.inspect-card p{font-size:8px;color:#747784;line-height:1.6;margin:8px 1px 0}.controls label{display:block;margin-top:13px}.controls label>span{display:flex;justify-content:space-between;color:#9b9daa;font-size:8px;margin-bottom:5px}.controls label b{font-weight:500;color:#c4c0d8}.controls input[type=range]{width:100%;min-height:0;padding:0;border:0;background:transparent;accent-color:#b7aef5}.controls select{width:100%;min-height:32px;padding:6px 8px;background:#101115;border:1px solid #30323a;font-size:9px}.controls .switch-row{display:flex;align-items:center;justify-content:space-between;border:1px solid #2b2d35;background:#17181d;border-radius:7px;padding:9px}.controls .switch-row>span{display:block;margin:0}.switch-row strong{display:block;font-size:9px}.switch-row small{display:block;color:#6e717d;margin-top:3px;font-size:7px}.switch-row input{width:16px;height:16px;min-height:0}.draft-state{display:flex;gap:9px;align-items:center;border-top:1px solid #25272e;margin-top:3px;padding:15px 5px}.draft-state>span{width:7px;height:7px;border-radius:50%;background:#626570}.draft-state>span.changed{background:#b7aef5}.draft-state strong{display:block;font-size:9px}.draft-state small{display:block;color:#6d707c;font-size:7px;margin-top:3px}.future-action{width:100%;justify-content:space-between;color:#5f626d;background:#15161a}.future-action span{font-size:7px;border:1px solid #33353d;padding:2px 4px;border-radius:4px}.safety-copy{font-size:8px;line-height:1.65;color:#676a76;margin:10px 4px 0}.future-action:disabled{opacity:.65;cursor:not-allowed}
      @media(max-width:1180px){.builder-grid{grid-template-columns:220px minmax(0,1fr)}.inspector-pane{grid-column:1/-1;border-left:0;border-top:1px solid #282a32;display:grid;grid-template-columns:1fr 1fr;gap:0 20px}.inspector-pane>.pane-title,.inspector-pane>.draft-state,.inspector-pane>.future-action,.inspector-pane>.safety-copy{grid-column:1/-1}}
      @media(max-width:760px){.builder-header{padding:0 12px}.builder-actions button:first-child{display:none}.workflow-strip{padding:0 12px}.builder-grid{display:block}.feature-map{border-right:0;border-bottom:1px solid #282a32;max-height:none}.canvas-scroll{padding:16px;justify-content:flex-start}.canvas-toolbar{padding:0 12px}.canvas-toolbar>div:first-child span{display:none}.canvas-help{flex-direction:column}.inspector-pane{display:block;border-top:1px solid #282a32}.device-frame{min-width:390px}.test-badge{display:none}}
    `}</style>
  </div>;
}
