"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "olympus-suite-scratchpad-v01";

function Icon({ name }: { name: "edit" | "close" }) {
  const path = name === "edit"
    ? <><path d="m15 5 4 4M4 20l5-1L21 7a2.8 2.8 0 0 0-4-4L5 15z"/></>
    : <path d="m6 6 12 12M6 18 18 6"/>;
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{path}</svg>;
}

function readNote() {
  try { return (localStorage.getItem(STORAGE_KEY) ?? "").slice(0, 20000); }
  catch { return ""; }
}

function saveNote(value: string) {
  try { localStorage.setItem(STORAGE_KEY, value.slice(0, 20000)); }
  catch { /* Keep session state when storage is unavailable. */ }
}

export default function ScratchpadShell() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const input = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setNote(readNote());
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    if (!sidebar) return;

    const handleClick = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLElement>(".suite-nav-item,.suite-shortcut");
      if (!button) return;
      const label = (button.textContent || button.getAttribute("aria-label") || "").toLowerCase();
      if (!label.includes("scratchpad")) return;
      setOpen(true);
      requestAnimationFrame(() => input.current?.focus());
    };

    sidebar.addEventListener("click", handleClick);
    return () => sidebar.removeEventListener("click", handleClick);
  }, []);

  if (!mounted || !open) return null;

  return createPortal(
    <aside className="olympus-scratchpad-panel" role="dialog" aria-modal="false" aria-labelledby="olympus-scratchpad-title">
      <header className="olympus-scratchpad-header">
        <div><span>SUITE TOOL</span><h2 id="olympus-scratchpad-title">Scratchpad</h2></div>
        <button type="button" aria-label="Close scratchpad" onClick={() => setOpen(false)}><Icon name="close"/></button>
      </header>
      <div className="olympus-scratchpad-body">
        <p><Icon name="edit"/> Temporary notes for this workspace.</p>
        <textarea ref={input} maxLength={20000} placeholder="Write something…" value={note} onChange={event => {
          const value = event.target.value;
          setNote(value);
          saveNote(value);
        }}/>
      </div>
      <footer className="olympus-scratchpad-footer">
        <span>Saved on this device</span>
        <button type="button" onClick={() => { setNote(""); saveNote(""); input.current?.focus(); }}>Clear</button>
      </footer>
    </aside>, document.body
  );
}
