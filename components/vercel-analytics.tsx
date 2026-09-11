"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { selectAnalyticsProject, type AnalyticsProjects, type AnalyticsReport, type TrafficRow } from "../lib/analytics";

const number = new Intl.NumberFormat("en-GB");
const value = (count: number | null) => count === null ? "—" : number.format(count);
const date = (timestamp: string) => new Date(timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function TrafficList({ title, rows }: { title: string; rows: TrafficRow[] }) {
  return <section className="panel traffic-list"><div className="panel-heading"><h2>{title}</h2></div>
    {rows.length ? <div className="traffic-table-wrap"><table><thead><tr><th scope="col">{title === "Popular pages" ? "Page" : "Source"}</th><th scope="col">Views</th><th scope="col">Visitors</th></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={`${row.label}-${index}`}><th scope="row">{row.label}</th><td>{value(row.pageviews)}</td><td>{value(row.visitors)}</td></tr>)}</tbody></table></div>
      : <p className="traffic-empty">No entries reported for this period.</p>}
  </section>;
}

export function TrafficChart({ report }: { report: AnalyticsReport }) {
  const days = Array.from({ length: report.period.days }, (_, index) => {
    const day = new Date(report.period.since);
    day.setUTCDate(day.getUTCDate() + index);
    const label = day.toISOString();
    const found = report.daily.find(row => row.label.slice(0, 10) === label.slice(0, 10));
    return { label, pageviews: found?.pageviews ?? null, visitors: found?.visitors ?? null };
  });
  const maximum = Math.max(1, ...days.map(day => day.pageviews ?? 0));
  return <section className="panel traffic-chart-panel"><div className="panel-heading"><div><h2>Daily page views</h2><p>{date(report.period.since)} – {date(report.period.until)} · UTC · today is still in progress</p></div></div>
    {report.daily.length ? <><div className="traffic-chart-scroll"><div className="traffic-chart" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(34px, 1fr))` }} aria-hidden="true">
      {days.map(day => <div className="traffic-day" key={day.label} title={`${date(day.label)}: ${day.pageviews === null ? "Not reported" : `${number.format(day.pageviews)} page views`}`}>
        <span className="traffic-day-count">{value(day.pageviews)}</span><div className="traffic-bar-track">{day.pageviews === null ? <span className="traffic-unknown">—</span> : <span className="traffic-bar" style={{ height: `${day.pageviews / maximum * 100}%` }}/>}</div><span>{new Date(day.label).getUTCDate()}</span>
      </div>)}
    </div></div><details className="traffic-daily-values"><summary>View daily values</summary><table><thead><tr><th scope="col">Date (UTC)</th><th scope="col">Views</th><th scope="col">Visitors</th></tr></thead><tbody>{days.map(day => <tr key={day.label}><th scope="row">{date(day.label)}</th><td>{value(day.pageviews)}</td><td>{value(day.visitors)}</td></tr>)}</tbody></table></details></>
      : <p className="traffic-empty">No daily traffic was reported for this period.</p>}
    <p className="traffic-footnote">Bars start at zero. A dash means the value was not reported.</p>
  </section>;
}

export default function VercelAnalytics() {
  const [days, setDays] = useState<7 | 30>(7);
  const [catalog, setCatalog] = useState<AnalyticsProjects | null>(null);
  const [projectId, setProjectId] = useState("");
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [status, setStatus] = useState<"loading" | "locked" | "ready" | "error" | "setup" | "empty">("loading");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  const selection = useRef<{ teamId: string; projectId: string } | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async (chosenProjectId?: string) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setStatus("loading"); setError(""); setReport(null);
    try {
      // Re-read the list on refresh, so newly added or removed projects are reflected.
      const projectsResponse = await fetch("/api/vercel-analytics/projects", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
      const projectsBody = await projectsResponse.json();
      if (controller.signal.aborted) return;
      if (!projectsResponse.ok) {
        setCatalog(null); setProjectId("");
        if (projectsResponse.status === 401) { setStatus("locked"); return; }
        setStatus(projectsBody.code === "owner_setup" || projectsBody.code === "setup_required" ? "setup" : "error");
        setError(projectsBody.error || "Vercel projects could not be loaded."); return;
      }
      const available = projectsBody as AnalyticsProjects;
      setCatalog(available);
      const preferenceKey = `olympus:vercel-project:${available.teamId}`;
      let rememberedId: string | null = chosenProjectId ?? (selection.current?.teamId === available.teamId ? selection.current.projectId : null);
      if (!rememberedId) { try { rememberedId = localStorage.getItem(preferenceKey); } catch { /* Preferences are optional. */ } }
      const selectedId = selectAnalyticsProject(available, rememberedId);
      setProjectId(selectedId ?? "");
      if (!selectedId) { setStatus("empty"); return; }
      selection.current = { teamId: available.teamId, projectId: selectedId };
      try { localStorage.setItem(preferenceKey, selectedId); } catch { /* Analytics still works when storage is disabled. */ }
      const response = await fetch(`/api/vercel-analytics?${new URLSearchParams({ days: String(days), projectId: selectedId })}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
      const body = await response.json();
      if (controller.signal.aborted) return;
      if (response.status === 401) { setCatalog(null); setProjectId(""); setStatus("locked"); return; }
      if (!response.ok) {
        setStatus(body.code === "owner_setup" || body.code === "setup_required" ? "setup" : "error");
        setError(body.error || "Analytics could not be loaded."); return;
      }
      if (body.project?.id !== selectedId) throw new Error("The report did not match the selected project.");
      setReport(body as AnalyticsReport); setStatus("ready");
    } catch {
      if (!controller.signal.aborted) { setError("Olympus could not load analytics. Check the connection and try again."); setStatus("error"); }
    }
  }, [days]);

  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; activeRequest.current?.abort(); }; }, [load]);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/vercel-analytics/session", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const body = await response.json();
      if (!mounted.current) return;
      if (!response.ok) { setError(body.error || "Analytics could not be unlocked."); return; }
      setPassword(""); await load();
    } catch { if (mounted.current) setError("Olympus could not sign you in. Try again."); }
    finally { if (mounted.current) setSubmitting(false); }
  }
  async function lock() {
    activeRequest.current?.abort(); setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/vercel-analytics/session", { method: "DELETE", credentials: "same-origin" });
      if (!mounted.current) return;
      if (!response.ok) throw new Error();
      setReport(null); setCatalog(null); setProjectId(""); setPassword(""); setStatus("locked");
    } catch { if (mounted.current) setError("Analytics could not be locked. Try again."); }
    finally { if (mounted.current) setSubmitting(false); }
  }

  return <div className="vercel-analytics">
    <div className="traffic-controls"><label>Vercel project<select disabled={!catalog?.projects.length || status === "loading" || submitting} value={projectId} onChange={event => { setProjectId(event.target.value); void load(event.target.value); }}>
      {!catalog?.projects.length && <option value="">{status === "empty" ? "No projects available" : "Connect to load projects"}</option>}
      {catalog?.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
    </select></label>
      <label>Period<select value={days} disabled={status === "loading" || submitting} onChange={event => setDays(event.target.value === "30" ? 30 : 7)}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option></select></label>
      <span className="traffic-environment">Production</span><button className="button" disabled={status === "loading" || submitting} onClick={() => void load(projectId || undefined)}>{status === "loading" ? "Loading…" : "Refresh"}</button>
      {catalog && <button className="text-button" disabled={status === "loading" || submitting} onClick={() => void lock()}>Lock analytics</button>}
    </div>
    {status === "loading" && <div className="panel traffic-message" role="status">Loading your Vercel analytics…</div>}
    {status === "locked" && <section className="panel traffic-unlock"><h2>Private analytics</h2><p>Enter your Olympus owner password to view traffic.</p><form onSubmit={unlock}>
      <label className="field">Owner password<input type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={event => setPassword(event.target.value)}/></label>
      <button className="button primary" type="submit" disabled={submitting}>{submitting ? "Unlocking…" : "Unlock analytics"}</button>
    </form><p className="traffic-footnote">Use the password set for Olympus, rather than your Vercel token.</p></section>}
    {error && <div className="panel traffic-message" role="alert"><h2>{status === "setup" ? "Connection setup needed" : "Unable to load analytics"}</h2><p>{error}</p>{status === "setup" && <p className="traffic-footnote">Connection settings belong in the Olympus project’s .env.local file beside package.json, or its hosting environment settings.</p>}</div>}
    {status === "empty" && <section className="panel traffic-message" role="status"><h2>No projects available</h2><p>Your Vercel token did not return any projects for the connected team. Check its team access, then refresh.</p></section>}
    {status === "ready" && report && <>
      {report.totals.pageviews === 0 && report.daily.length === 0 && <section className="panel traffic-message" role="status"><h2>No traffic reported</h2><p>Vercel returned no production traffic for {report.project.name} in this period. Check that Web Analytics is collecting visits on this platform, or choose another period.</p></section>}
      <div className="traffic-totals"><article><span>Visitors</span><strong>{value(report.totals.visitors)}</strong><small>Selected period · production</small></article><article><span>Page views</span><strong>{value(report.totals.pageviews)}</strong><small>Selected period · production</small></article></div>
      <TrafficChart report={report}/><div className="traffic-breakdowns"><TrafficList title="Popular pages" rows={report.pages}/><TrafficList title="Traffic sources" rows={report.referrers}/></div>
      <p className="traffic-footnote">A visitor can appear on several pages or sources. Grouped visitor counts are not added together. “Others” follows Vercel’s grouping.</p>
      <div className="traffic-source"><span>{report.project.name} · Updated {new Date(report.updatedAt).toLocaleString("en-GB", { timeZone: "UTC" })} UTC</span><a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">Open Vercel ↗</a></div>
    </>}
  </div>;
}
