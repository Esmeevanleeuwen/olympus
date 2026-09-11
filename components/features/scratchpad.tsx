"use client";
import * as React from "react";
import { MAX_NOTE_LENGTH } from "../../lib/suite-preferences";
export type ScratchpadProps = { text: string; saved: boolean; recovery: boolean; onChange: (text: string) => void; onReset: () => void };
export default class Scratchpad extends React.Component<ScratchpadProps, { confirmReset: boolean }> {
  state = { confirmReset: false };
  render() {
    const { text, saved, recovery, onChange, onReset } = this.props;
    return <div className="suite-scratchpad"><p className="suite-copy">A place to think while you work.</p>
      {recovery && <p className="suite-warning" role="status">Saved text could not be read and has not been overwritten. Edits are session-only. Reset this tool to start a new saved draft.</p>}
      <label className="suite-note-field" htmlFor="suite-note">Your note<textarea id="suite-note" maxLength={MAX_NOTE_LENGTH} rows={12} placeholder="Start with a thought…" value={text} onChange={event => onChange(event.target.value)} aria-describedby="suite-note-privacy"/></label>
      <div className="suite-note-status"><span role="status">{saved ? "Saved on this device" : "Session only · not saved"}</span><span>{text.length.toLocaleString("en-GB")} / {MAX_NOTE_LENGTH.toLocaleString("en-GB")}</span></div>
      <p id="suite-note-privacy" className="suite-helper">Workspace-wide, not tied to a platform. Nothing is sent to a service. This is not secure storage for passwords or private data.</p>
      {!this.state.confirmReset ? <button type="button" className="text-button" disabled={!text && !recovery} onClick={() => this.setState({ confirmReset: true })}>Reset this tool</button> : <div className="suite-confirm" role="group" aria-label="Reset scratchpad"><p>Clear this scratchpad only? Your other tools and workspace drafts stay untouched.</p><div><button type="button" className="button" onClick={() => this.setState({ confirmReset: false })}>Keep note</button><button type="button" className="button danger" onClick={() => { onReset(); this.setState({ confirmReset: false }); }}>Clear scratchpad</button></div></div>}
    </div>;
  }
}
