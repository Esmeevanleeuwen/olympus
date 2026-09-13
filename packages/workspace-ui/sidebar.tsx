"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { effectivePreferences, type Flags, type SidebarPreferences } from "./model";

export type SidebarItem = { id: string; label: string; icon?: ReactNode; href?: string; active?: boolean; onSelect?: () => void };
type Props = {
  id: string; brand: ReactNode; label: string; items: SidebarItem[]; footer?: ReactNode; children?: ReactNode;
  collapsed: boolean; onCollapse: (value: boolean) => void; flags: Flags; preferences: SidebarPreferences;
  onPreferences: (value: SidebarPreferences) => Promise<void>; saving?: boolean; canSave?: boolean;
};

export function SharedSidebar({ id, brand, label, items, footer, children, collapsed, onCollapse, flags, preferences, onPreferences, saving, canSave = true }: Props) {
  const toggle = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const effective = effectivePreferences(preferences, flags);
  const query = flags["sidebar.search"] ? search.trim().toLocaleLowerCase() : "";
  const visible = items.filter(item => item.label.toLocaleLowerCase().includes(query));
  const pinned = visible.filter(item => effective.shortcuts.includes(item.id));
  const open = !collapsed;
  useEffect(() => {
    if (!open && sidebar.current?.contains(document.activeElement)) toggle.current?.focus({ preventScroll: true });
  }, [open]);
  const close = () => { onCollapse(true); toggle.current?.focus({ preventScroll: true }); };
  function navigate(item: SidebarItem) {
    item.onSelect?.();
    if (window.matchMedia("(max-width: 760px)").matches) close();
  }
  async function save(value: SidebarPreferences) {
    setError("");
    try { await onPreferences(value); } catch (cause) { setError(cause instanceof Error ? cause.message : "Opslaan is niet gelukt. Probeer opnieuw."); }
  }
  function entry(item: SidebarItem, shortcut = false) {
    const content = <>{item.icon}<span>{item.label}</span></>;
    return <div className="os-nav-row" key={`${shortcut ? "pin-" : ""}${item.id}`}>
      {item.href ? <a href={item.href} className="os-nav-item" aria-current={item.active ? "page" : undefined} onClick={() => navigate(item)}>{content}</a>
        : <button type="button" className="os-nav-item" aria-current={item.active ? "page" : undefined} onClick={() => navigate(item)}>{content}</button>}
      {flags["sidebar.shortcuts"] && canSave && <button type="button" className="os-pin" disabled={saving || (!effective.shortcuts.includes(item.id) && effective.shortcuts.length >= 12)}
        aria-label={`${effective.shortcuts.includes(item.id) ? "Verwijder" : "Bewaar"} ${item.label} als snelkoppeling`} aria-pressed={effective.shortcuts.includes(item.id)}
        onClick={() => void save({ ...preferences, shortcuts: effective.shortcuts.includes(item.id) ? effective.shortcuts.filter(key => key !== item.id) : [...effective.shortcuts, item.id] })}>☆</button>}
    </div>;
  }
  return <>
    <button ref={toggle} type="button" className={`os-toggle ${open ? "is-open" : "is-closed"}`} aria-expanded={open} aria-controls={id}
      aria-label={open ? "Sidebar sluiten" : "Sidebar openen"} onClick={() => onCollapse(open)}>{open ? "‹" : "›"}</button>
    {open && <button type="button" className="os-backdrop" tabIndex={-1} aria-label="Sidebar sluiten" onClick={close} />}
    <aside ref={sidebar} id={id} className={`os-sidebar ${open ? "is-open" : "is-closed"}`} aria-label={label} inert={!open} aria-hidden={!open}
      onKeyDown={event => { if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); close(); } }}>
      <div className="os-brand">{brand}</div>
      <div className="os-scroll">
        {flags["sidebar.search"] && <label className="os-search"><span className="os-sr-only">Zoeken in het menu</span><input type="search" placeholder="Zoek een pagina…" value={search} onChange={event => setSearch(event.target.value)} /></label>}
        {pinned.length > 0 && <><p className="os-label">Snelkoppelingen</p><nav aria-label="Snelkoppelingen">{pinned.map(item => entry(item, true))}</nav></>}
        <p className="os-label">{label}</p><nav aria-label={label}>{visible.map(item => entry(item))}</nav>
        {visible.length === 0 && <p className="os-note" role="status">Geen pagina gevonden.</p>}
        {children}
        {flags["sidebar.customize"] && canSave && <details className="os-settings"><summary>Sidebar aanpassen</summary>
          <label>Breedte<select value={effective.width} disabled={saving} onChange={event => void save({ ...preferences, width: event.target.value as SidebarPreferences["width"] })}><option value="compact">Compact</option><option value="wide">Ruim</option></select></label>
        </details>}
        {saving && <p className="os-note" role="status">Opslaan…</p>}{error && <p className="os-note" role="alert">{error}</p>}
      </div><div className="os-footer">{footer}</div>
    </aside>
  </>;
}
