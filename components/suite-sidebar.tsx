"use client";
import * as React from "react";
import { FeatureId, SuitePanel } from "../lib/features";
import { SuitePreferences, visibleFeatures } from "../lib/suite-preferences";
import SuiteIcon from "./suite-icon";

type Props = { preferences: SuitePreferences; active: SuitePanel; ready: boolean; onOpen: (panel: Exclude<SuitePanel, null>) => void; onCollapse: () => void };
export default function SuiteSidebar({ preferences, active, ready, onOpen, onCollapse }: Props) {
  const tools = visibleFeatures(preferences);
  return <section className="suite-sidebar" aria-label="Optional tools">
    <div className="suite-section-heading"><span>SUITE</span><button type="button" className="icon-button" aria-label={preferences.collapsed ? "Expand suite" : "Collapse suite"} aria-expanded={!preferences.collapsed} aria-controls="suite-shortcuts" disabled={!ready} onClick={onCollapse}><SuiteIcon name={preferences.collapsed ? "down" : "up"} size={15}/></button></div>
    <div id="suite-shortcuts" hidden={preferences.collapsed}>
      {tools.map(tool => <button key={tool.id} type="button" className={`suite-shortcut ${active === tool.id ? "is-active" : ""}`} disabled={!ready || !preferences.tools[tool.id].enabled} aria-pressed={active === tool.id} aria-controls="suite-panel" title={!preferences.tools[tool.id].enabled ? "Disabled. Enable in All tools." : tool.description} onClick={() => onOpen(tool.id as FeatureId)}><SuiteIcon name={tool.icon} size={17}/><span>{tool.title}</span><span className="suite-shortcut-dot" aria-hidden="true"/></button>)}
      {tools.length === 0 && <p className="suite-sidebar-empty">Your tools can live here.</p>}
    </div>
    <button id="suite-all-tools" type="button" className={`suite-shortcut suite-library-link ${active === "library" ? "is-active" : ""}`} aria-pressed={active === "library"} aria-controls="suite-panel" disabled={!ready} onClick={() => onOpen("library")}><SuiteIcon name="library" size={17}/><span>All tools</span><SuiteIcon name="arrow" size={14}/></button>
  </section>;
}
