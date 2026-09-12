"use client";

import { useEffect, useRef, useState } from "react";
import { parseDataWorkspaceState, type DataWorkspaceState, type TableRequest } from "../lib/data-workspace-bridge";

type Props = { active: boolean; src: string; docked: boolean; selection: TableRequest | null; onState: (state: DataWorkspaceState) => void };

/** Keep the workspace alive across navigation; exchange metadata with its own frame only. */
export default function DataWorkspace({ active, src, docked, selection, onState }: Props) {
  const [opened, setOpened] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => { if (active || docked) setOpened(true); }, [active, docked]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const state = parseDataWorkspaceState(event.data);
      if (state) onState(state);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [onState]);
  useEffect(() => {
    if (loadVersion) frame.current?.contentWindow?.postMessage({ type: "olympus:data-host", docked }, window.location.origin);
  }, [loadVersion, docked]);
  useEffect(() => {
    if (loadVersion && selection) frame.current?.contentWindow?.postMessage({ type: "olympus:data-select", table: selection.table, id: selection.id }, window.location.origin);
  }, [loadVersion, selection]);

  if (!opened) return null;
  return <section className="data-workspace-frame" aria-label="Demo data workspace" aria-busy={!loadVersion}>
    {!loadVersion && <p className="data-workspace-loading" role="status">Opening data workspace…</p>}
    <iframe ref={frame} src={src} title="Data workspace — tables, structure, connections and latest changes"
      onLoad={() => setLoadVersion(version => version + 1)} allow="clipboard-write"/>
  </section>;
}
