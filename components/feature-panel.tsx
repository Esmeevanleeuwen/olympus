"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import { FeatureId, SuitePanel, getFeature } from "../lib/features";
import ToolLibrary, { ToolLibraryProps } from "./tool-library";
import type { ScratchpadProps } from "./features/scratchpad";
import SuiteIcon from "./suite-icon";

function LoadingTool() { return <p className="suite-copy" role="status">Opening tool…</p>; }
// Static import paths allow Next.js to split optional tools into separate chunks.
const Scratchpad = dynamic<ScratchpadProps>(() => import("./features/scratchpad"), { loading: LoadingTool });
const Placeholder = dynamic(() => import("./features/placeholder"), { loading: LoadingTool });
class ToolBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="suite-confirm" role="alert"><p>This tool could not open. Your drafts are kept separately.</p><button type="button" className="button" onClick={() => this.setState({ failed: false })}>Try again</button></div> : this.props.children;
  }
}
type Props = {
  panel: Exclude<SuitePanel, null>; library: ToolLibraryProps; scratchpad: ScratchpadProps;
  onClose: () => void; onLibrary: () => void; onHide: (id: FeatureId) => void; onDisable: (id: FeatureId) => void;
};
/** One dialog, modeless on desktop and modal on small screens. Content unmounts on close. */
export default class FeaturePanel extends React.Component<Props> {
  node: HTMLDialogElement | null = null;
  opener: HTMLElement | null = null;
  media: MediaQueryList | null = null;
  cancel = (event: Event) => { event.preventDefault(); this.props.onClose(); };
  focusHeading = () => this.node?.querySelector<HTMLElement>(".suite-panel-title")?.focus({ preventScroll: true });
  present = () => {
    if (!this.node || !this.media) return;
    if (this.node.open) this.node.close();
    this.node.setAttribute("aria-modal", this.media.matches ? "true" : "false");
    if (this.media.matches) this.node.showModal(); else this.node.show();
    this.focusHeading();
  };
  componentDidMount() {
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.media = window.matchMedia("(max-width: 1100px)");
    this.media.addEventListener("change", this.present);
    this.node?.addEventListener("cancel", this.cancel);
    this.present();
  }
  componentDidUpdate(previous: Props) { if (previous.panel !== this.props.panel) this.focusHeading(); }
  componentWillUnmount() {
    this.media?.removeEventListener("change", this.present);
    this.node?.removeEventListener("cancel", this.cancel);
    this.node?.close();
    // Wait for React to remove a hidden/disabled opener before choosing a fallback.
    const opener = this.opener;
    queueMicrotask(() => {
      if (document.querySelector("dialog:modal")) return;
      if (opener?.isConnected && opener.getClientRects().length && !opener.matches(":disabled")) opener.focus({ preventScroll: true });
      else document.getElementById("suite-all-tools")?.focus({ preventScroll: true });
    });
  }
  render() {
    const { panel, library, scratchpad, onClose, onLibrary, onHide, onDisable } = this.props;
    const feature = panel === "library" ? null : getFeature(panel);
    return <dialog id="suite-panel" className="suite-panel" aria-labelledby="suite-panel-title" ref={node => { this.node = node; }} onKeyDown={event => {
      if (event.key === "Tab" && this.media?.matches && this.node) {
        const items = Array.from(this.node.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]'
        )).filter(item => item.getClientRects().length > 0 && !item.closest("[hidden]"));
        const first = items[0], last = items[items.length - 1], active = document.activeElement;
        if (!first) { event.preventDefault(); this.focusHeading(); }
        else if (event.shiftKey && (active === first || active === this.node.querySelector(".suite-panel-title") || !this.node.contains(active))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (active === last || !this.node.contains(active))) {
          event.preventDefault(); first.focus();
        }
      }
      if (event.key === "Escape" && !this.media?.matches) { event.preventDefault(); event.stopPropagation(); onClose(); }
    }} onClick={event => {
      if (event.target !== this.node || !this.node || !this.media?.matches) return;
      const bounds = this.node.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}>
      <header className="suite-panel-heading"><div><span className="suite-eyebrow">{feature ? "SUITE / TOOL" : "SUITE / LIBRARY"}</span><h2 id="suite-panel-title" className="suite-panel-title" tabIndex={-1}>{feature?.title || "All tools"}</h2></div><button type="button" className="icon-button" aria-label="Close tool panel" onClick={onClose}><SuiteIcon name="close"/></button></header>
      {feature && <div className="suite-tool-toolbar"><button type="button" className="text-button" onClick={onLibrary}>← All tools</button><span className={`suite-status ${feature.status}`}>{feature.status === "experimental" ? "Experimental" : "Placeholder"}</span></div>}
      <div className="suite-panel-content">
        {feature ? <ToolBoundary key={feature.id}>{feature.renderer === "scratchpad" ? <Scratchpad {...scratchpad}/> : <Placeholder/>}</ToolBoundary> : <ToolLibrary {...library}/>}
      </div>
      {feature && <footer className="suite-panel-footer"><button type="button" className="text-button" disabled={!library.preferences.tools[feature.id].showInSidebar} onClick={() => onHide(feature.id)}>Hide shortcut</button><button type="button" className="text-button" onClick={() => onDisable(feature.id)}>Disable tool</button></footer>}
    </dialog>;
  }
}
