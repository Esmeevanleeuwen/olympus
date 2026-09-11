"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Theme = "dark" | "light";
type Mounts = { search: HTMLElement; bottom: HTMLElement } | null;

const STORAGE_KEY = "olympus-sidebar-shell-v01";

function Icon({ name, size = 17 }: { name: "search" | "close" | "moon" | "sun" | "collapse" | "expand"; size?: number }) {
  const path = {
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    moon: <path d="M20 15.5A8.4 8.4 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
    collapse: <><path d="m14 7-5 5 5 5"/><path d="M19 4v16"/></>,
    expand: <><path d="m10 7 5 5-5 5"/><path d="M5 4v16"/></>
  }[name];
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{path}</svg>;
}

function readVisualState(): { collapsed: boolean; theme: Theme } {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as { collapsed?: unknown; theme?: unknown } | null;
    return { collapsed: saved?.collapsed === true, theme: saved?.theme === "light" ? "light" : "dark" };
  } catch { return { collapsed: false, theme: "dark" }; }
}

function saveVisualState(collapsed: boolean, theme: Theme) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ collapsed, theme })); } catch { /* Visual preferences can be session-only. */ }
}

function applyFeatureFilter(query: string) {
  const q = query.trim().toLowerCase();
  const sidebar = document.querySelector<HTMLElement>(".sidebar");
  if (!sidebar) return;
  const items = sidebar.querySelectorAll<HTMLElement>(".nav-item,.suite-nav-item,.suite-shortcut");
  items.forEach(item => {
    if (item.closest(".olympus-shell-controls")) return;
    const text = (item.textContent || item.getAttribute("title") || item.getAttribute("aria-label") || "").toLowerCase();
    item.hidden = !!q && !text.includes(q);
  });
  sidebar.querySelectorAll<HTMLElement>(".nav-label").forEach(label => {
    const owner = label.parentElement;
    if (!owner || !q) { label.hidden = false; return; }
    const visible = [...owner.querySelectorAll<HTMLElement>(".nav-item,.suite-nav-item,.suite-shortcut")].some(item => !item.hidden);
    label.hidden = !visible;
  });
}

export default function SidebarShell() {
  const [mounts, setMounts] = useState<Mounts>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const state = readVisualState();
    setCollapsed(state.collapsed); setTheme(state.theme);
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.classList.toggle("olympus-sidebar-collapsed", state.collapsed);

    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    if (!sidebar) return;
    sidebar.classList.add("olympus-sidebar-enhanced");

    const search = document.createElement("div");
    search.className = "olympus-sidebar-search-mount olympus-shell-controls";
    const bottom = document.createElement("div");
    bottom.className = "olympus-sidebar-bottom-mount olympus-shell-controls";

    const brand = sidebar.querySelector(".brand");
    if (brand?.parentElement === sidebar) brand.insertAdjacentElement("afterend", search);
    else sidebar.prepend(search);
    sidebar.append(bottom);
    setMounts({ search, bottom });

    const observer = new MutationObserver(() => applyFeatureFilter(query));
    observer.observe(sidebar, { childList: true, subtree: true });
    return () => { observer.disconnect(); search.remove(); bottom.remove(); sidebar.classList.remove("olympus-sidebar-enhanced"); };
  }, []);

  useEffect(() => { applyFeatureFilter(query); }, [query]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("olympus-sidebar-collapsed", collapsed);
    saveVisualState(collapsed, theme);
  }, [collapsed, theme]);

  const searchPortal = useMemo(() => mounts?.search ? createPortal(
    <div className="olympus-feature-search" onClick={() => { if (collapsed) { setCollapsed(false); requestAnimationFrame(() => inputRef.current?.focus()); } }}>
      <Icon name="search"/>
      <input ref={inputRef} aria-label="Search sidebar features" placeholder="Search features…" value={query} onChange={event => setQuery(event.target.value)}/>
      {!!query && !collapsed && <button type="button" aria-label="Clear sidebar search" onClick={event => { event.stopPropagation(); setQuery(""); inputRef.current?.focus(); }}><Icon name="close" size={13}/></button>}
    </div>, mounts.search) : null, [collapsed, mounts, query]);

  const bottomPortal = useMemo(() => mounts?.bottom ? createPortal(
    <div className="olympus-sidebar-utility-stack">
      <button type="button" className="olympus-theme-toggle" aria-pressed={theme === "dark"} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
        <Icon name={theme === "dark" ? "moon" : "sun"}/><span className="olympus-sidebar-label">Dark mode</span><span className="olympus-theme-switch" aria-hidden="true"><span/></span>
      </button>
      <button type="button" className="olympus-collapse-toggle" aria-pressed={collapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(!collapsed)}>
        <Icon name={collapsed ? "expand" : "collapse"}/><span className="olympus-sidebar-label">{collapsed ? "Expand" : "Collapse"}</span>
      </button>
    </div>, mounts.bottom) : null, [collapsed, mounts, theme]);

  return <>{searchPortal}{bottomPortal}</>;
}
