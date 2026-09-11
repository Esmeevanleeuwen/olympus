import { analyticsPeriod, analyticsRows, periodTotals, selectAnalyticsProject, type AnalyticsProject, type AnalyticsProjects, type AnalyticsReport } from "../analytics";

export class AnalyticsError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) { super(message); }
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function connection(fetcher: typeof fetch) {
  const token = process.env.OLYMPUS_VERCEL_TOKEN?.trim();
  const teamId = process.env.OLYMPUS_VERCEL_TEAM_ID?.trim();
  if (!token || !teamId || token === "PASTE_YOUR_TOKEN_HERE") {
    throw new AnalyticsError("setup_required", "Add the Vercel token and team ID to Olympus’s server settings, then restart it.", 503);
  }
  if (!/^team_[a-zA-Z0-9]+$/.test(teamId)) {
    throw new AnalyticsError("setup_required", "Check the Vercel team ID in Olympus’s server settings.", 503);
  }
  async function query(path: string, params: Record<string, string> = {}): Promise<unknown> {
    const url = new URL(path, "https://api.vercel.com");
    url.search = new URLSearchParams({ teamId: teamId!, ...params }).toString();
    let response: Response;
    try {
      response = await fetcher(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000) });
    } catch { throw new AnalyticsError("upstream_unavailable", "Vercel did not respond. Try again shortly.", 502); }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new AnalyticsError("vercel_access", "Vercel denied access. Check the token’s team access and the project’s Analytics settings.", 502);
      if (response.status === 429) throw new AnalyticsError("rate_limited", "Vercel’s request limit was reached. Wait a moment before refreshing.", 429);
      if (response.status === 400) throw new AnalyticsError("vercel_request", "Vercel could not return this report. Try 7 days and check the available Analytics history.", 502);
      if (response.status === 404) throw new AnalyticsError("vercel_project", "Vercel could not find this project or its Analytics data. Check the connection settings.", 502);
      throw new AnalyticsError("upstream_unavailable", "Vercel’s analytics service is unavailable. Try again shortly.", 502);
    }
    try { return await response.json(); }
    catch { throw new AnalyticsError("invalid_response", "Vercel returned an unreadable response.", 502); }
  }
  return { teamId, query };
}

export async function listVercelProjects(fetcher: typeof fetch = fetch): Promise<AnalyticsProjects> {
  const { teamId, query } = connection(fetcher);
  const projects = new Map<string, AnalyticsProject>();
  const cursors = new Set<string>();
  let from: string | undefined;
  for (let page = 0; page < 10; page++) {
    const body = await query("/v10/projects", { limit: "100", ...(from ? { from } : {}) });
    const rows = Array.isArray(body) ? body : object(body) ? body.projects : null;
    if (!Array.isArray(rows) || rows.length > 100) throw new AnalyticsError("invalid_response", "Vercel returned an unreadable project list.", 502);
    for (const row of rows) {
      if (!object(row) || typeof row.id !== "string" || !/^prj_[a-zA-Z0-9]+$/.test(row.id) || typeof row.name !== "string" || !row.name || row.name.length > 256 || typeof row.accountId !== "string") {
        throw new AnalyticsError("invalid_response", "Vercel returned an incomplete project.", 502);
      }
      // Do not allow a project returned for another account into this team's scope.
      if (row.accountId === teamId) projects.set(row.id, { id: row.id, name: row.name });
    }
    const pagination = object(body) ? body.pagination : undefined;
    if (pagination !== undefined && !object(pagination)) throw new AnalyticsError("invalid_response", "Vercel returned unreadable project pagination.", 502);
    const next = object(pagination) ? pagination.next : null;
    if (next === null || next === undefined) {
      const catalog = { teamId, projects: [...projects.values()].sort((a, b) => a.name.localeCompare(b.name)), defaultProjectId: process.env.OLYMPUS_VERCEL_PROJECT_ID?.trim() || null };
      return { ...catalog, defaultProjectId: selectAnalyticsProject(catalog, null) };
    }
    if ((typeof next !== "string" || !next || next.length > 2048) && (typeof next !== "number" || !Number.isSafeInteger(next) || next < 0)) {
      throw new AnalyticsError("invalid_response", "Vercel returned unreadable project pagination.", 502);
    }
    from = String(next);
    if (cursors.has(from)) throw new AnalyticsError("invalid_response", "Vercel repeated a page of projects. Try again shortly.", 502);
    cursors.add(from);
  }
  throw new AnalyticsError("project_limit", "This team has too many projects to load in one request.", 502);
}

export async function readVercelAnalytics(days: 7 | 30, fetcher: typeof fetch = fetch, now = new Date(), requestedProjectId?: string): Promise<AnalyticsReport> {
  if (requestedProjectId !== undefined && !/^prj_[a-zA-Z0-9]+$/.test(requestedProjectId)) throw new AnalyticsError("invalid_project", "Choose a project from the list.", 400);
  const catalog = await listVercelProjects(fetcher);
  const projectId = requestedProjectId ?? catalog.defaultProjectId;
  const project = catalog.projects.find(item => item.id === projectId);
  if (!project) throw new AnalyticsError("unknown_project", "This project is not available in your connected Vercel team. Refresh the project list or choose another project.", 404);
  const { query } = connection(fetcher);
  const period = analyticsPeriod(days, now);
  const aggregate = (by: string, limit: number) => query("/v1/query/web-analytics/visits/aggregate", {
    projectId: projectId!, by, since: period.since, until: period.until,
    filter: "environment eq 'production'", limit: String(limit)
  });
  const [totals, daily, pages, referrers] = await Promise.all([
    aggregate("environment", 1), aggregate("day", 100), aggregate("requestPath", 10), aggregate("referrerHostname", 10)
  ]);
  try {
    return {
      project, period,
      totals: periodTotals(analyticsRows(totals, "environment")),
      daily: analyticsRows(daily, "timestamp").sort((a, b) => a.label.localeCompare(b.label)),
      pages: analyticsRows(pages, "requestPath"), referrers: analyticsRows(referrers, "referrerHostname"),
      updatedAt: now.toISOString()
    };
  } catch { throw new AnalyticsError("invalid_response", "Vercel’s report was incomplete or had an unexpected format. No counts have been substituted.", 502); }
}
