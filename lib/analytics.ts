export type TrafficCounts = { pageviews: number | null; visitors: number | null };
export type TrafficRow = TrafficCounts & { label: string };
export type AnalyticsProject = { id: string; name: string };
export type AnalyticsProjects = { projects: AnalyticsProject[]; defaultProjectId: string | null; teamId: string };
export type AnalyticsReport = {
  project: AnalyticsProject;
  period: { days: 7 | 30; since: string; until: string; environment: "production" };
  totals: TrafficCounts;
  daily: TrafficRow[];
  pages: TrafficRow[];
  referrers: TrafficRow[];
  updatedAt: string;
};

export function selectAnalyticsProject(catalog: AnalyticsProjects, rememberedId: string | null): string | null {
  return catalog.projects.find(project => project.id === rememberedId)?.id
    ?? catalog.projects.find(project => project.id === catalog.defaultProjectId)?.id
    ?? catalog.projects[0]?.id ?? null;
}

export function analyticsPeriod(days: 7 | 30, now = new Date()): AnalyticsReport["period"] {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { days, since: start.toISOString(), until: now.toISOString(), environment: "production" };
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function count(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("Invalid analytics count");
  return value;
}
export function analyticsRows(input: unknown, dimension: "timestamp" | "requestPath" | "referrerHostname" | "environment"): TrafficRow[] {
  if (!object(input) || !Array.isArray(input.data) || input.data.length > 101) throw new Error("Invalid analytics response");
  return input.data.map(value => {
    if (!object(value)) throw new Error("Invalid analytics row");
    const raw = value[dimension];
    let label: string;
    if (dimension === "referrerHostname" && (raw === null || raw === "")) label = "Direct / unknown";
    else if (typeof raw === "string" && raw.length > 0 && raw.length <= 2048) label = raw;
    else throw new Error("Missing analytics dimension");
    if (dimension === "timestamp") {
      if (!Number.isFinite(Date.parse(label))) throw new Error("Invalid analytics date");
      label = new Date(label).toISOString();
    }
    return { label, pageviews: count(value.pageviews), visitors: count(value.visitors) };
  });
}

// Never add grouped visitors together: one visitor can appear in multiple groups.
export function periodTotals(rows: TrafficRow[]): TrafficCounts {
  if (rows.length === 0) return { pageviews: 0, visitors: 0 };
  if (rows.length !== 1 || rows[0].label !== "production") throw new Error("Unexpected analytics environment");
  return { pageviews: rows[0].pageviews, visitors: rows[0].visitors };
}
