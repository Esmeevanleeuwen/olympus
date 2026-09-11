"use client";
import * as React from "react";
import { FeatureId } from "../lib/features";
import { SuitePreferences, ToolPreference, orderedFeatures } from "../lib/suite-preferences";
import SuiteIcon from "./suite-icon";
export type ToolLibraryProps = {
  preferences: SuitePreferences; saved: boolean; ready: boolean;
  onPatch: (id: FeatureId, patch: Partial<Pick<ToolPreference, "enabled" | "showInSidebar">>) => void;
  onMove: (id: FeatureId, direction: -1 | 1) => void;
  onOpen: (id: FeatureId) => void; onReset: () => void;
};
export default class ToolLibrary extends React.Component<ToolLibraryProps, { search: string; confirmReset: boolean }> {
  state = { search: "", confirmReset: false };
  render() {
    const { preferences, saved, ready, onPatch, onMove, onOpen, onReset } = this.props;
    const all = orderedFeatures(preferences), query = this.state.search.trim().toLowerCase();
    const visible = all.filter(feature => `${feature.title} ${feature.description} ${feature.status}`.toLowerCase().includes(query));
    return <div className="tool-library">
      <p className="suite-copy">Keep what you need. Leave the rest out of the way.</p>
      <label className="suite-search"><span className="sr-only">Find a tool</span><input type="search" value={this.state.search} onChange={event => this.setState({ search: event.target.value })} placeholder="Find a tool…"/></label>
      <div className="suite-library-list">{visible.map(feature => {
        const preference = preferences.tools[feature.id], index = all.indexOf(feature);
        return <article className="suite-tool-card" key={feature.id} aria-label={feature.title}>
          <div className="suite-tool-heading"><span className="suite-tool-symbol"><SuiteIcon name={feature.icon}/></span><div><h3>{feature.title}</h3><span className={`suite-status ${feature.status}`}>{feature.status === "experimental" ? "Experimental" : "Placeholder"}</span></div></div>
          <p>{feature.description}</p>
          <div className="suite-toggle-row"><label><input type="checkbox" role="switch" checked={preference.enabled} disabled={!ready} aria-label={`Enable ${feature.title}`} onChange={event => onPatch(feature.id, { enabled: event.target.checked })}/><span>Enabled</span></label><label><input type="checkbox" checked={preference.showInSidebar} disabled={!ready} aria-label={`Show ${feature.title} in sidebar`} onChange={event => onPatch(feature.id, { showInSidebar: event.target.checked })}/><span>In sidebar</span></label></div>
          <div className="suite-card-actions"><div className="suite-order"><button type="button" className="icon-button" aria-label={`Move ${feature.title} up`} disabled={!ready || index === 0} onClick={() => onMove(feature.id, -1)}><SuiteIcon name="up" size={16}/></button><button type="button" className="icon-button" aria-label={`Move ${feature.title} down`} disabled={!ready || index === all.length - 1} onClick={() => onMove(feature.id, 1)}><SuiteIcon name="down" size={16}/></button></div><button type="button" className="button" disabled={!ready || !preference.enabled} onClick={() => onOpen(feature.id)} aria-label={`Open ${feature.title}`}>Open <SuiteIcon name="arrow" size={14}/></button></div>
        </article>;
      })}</div>
      {visible.length === 0 && <p className="suite-copy suite-no-results">No tools match this search.</p>}
      <p className="suite-helper">Hiding removes a shortcut. Disabling prevents opening. Neither deletes drafts or changes permissions.</p>
      <div className="suite-library-footer"><span role="status">{saved ? "Preferences saved on this device" : "Preferences are session-only"}</span>{!this.state.confirmReset && <button type="button" className="text-button" onClick={() => this.setState({ confirmReset: true })}>Reset preferences</button>}</div>
      {this.state.confirmReset && <div className="suite-confirm" role="group" aria-label="Reset suite preferences"><p>Restore the default tool switches and order? Scratchpad text, blocks and audience drafts stay untouched.</p><div><button type="button" className="button" onClick={() => this.setState({ confirmReset: false })}>Cancel</button><button type="button" className="button" onClick={() => { onReset(); this.setState({ confirmReset: false }); }}>Restore defaults</button></div></div>}
    </div>;
  }
}
