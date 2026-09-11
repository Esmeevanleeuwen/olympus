import { analyticsPeriod, analyticsRows, periodTotals, type AnalyticsReport } from "../analytics";

export class AnalyticsError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) { super(message); }
}
export async function readVercelAnalytics(days: 7 | 30, fetcher: typeof fetch = fetch, now = new Date()): Promise<AnalyticsReport> {
  const token = process.env.OLYMPUS_VERCEL_TOKEN?.trim();
  const projectId = process.env.OLYMPUS_VERCEL_PROJECT_ID?.trim();
  const teamId = process.env.OLYMPUS_VERCEL_TEAM_ID?.trim();
  if (!token || !projectId || !teamId || token === "PASTE_YOUR_TOKEN_HERE") {
    throw new AnalyticsError("setup_required", "Add the Vercel token, project ID and team ID to Olympus’s server settings, then restart it.", 503);
  }
  if (!/^prj_[a-zA-Z0-9]+$/.test(projectId) || !/^team_[a-zA-Z0-9]+$/.test(teamId)) {
    throw new AnalyticsError("setup_required", "Check the Vercel project and team IDs in Olympus’s server settings.", 503);
  }
  const period = analyticsPeriod(days, now);
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
  const aggregate = (by: string, limit: number) => query("/v1/query/web-analytics/visits/aggregate", {
    projectId: projectId!, by, since: period.since, until: period.until,
    filter: "environment eq 'production'", limit: String(limit)
  });
  const [project, totals, daily, pages, referrers] = await Promise.all([
    query(`/v9/projects/${projectId}`), aggregate("environment", 1), aggregate("day", 100), aggregate("requestPath", 10), aggregate("referrerHostname", 10)
  ]);
  try {
    if (!project || typeof project !== "object" || !("id" in project) || project.id !== projectId || !("name" in project) || typeof project.name !== "string") throw new Error("Invalid project");
    return {
      project: { id: projectId, name: project.name }, period,
      totals: periodTotals(analyticsRows(totals, "environment")),
      daily: analyticsRows(daily, "timestamp").sort((a, b) => a.label.localeCompare(b.label)),
      pages: analyticsRows(pages, "requestPath"), referrers: analyticsRows(referrers, "referrerHostname"),
      updatedAt: now.toISOString()
    };
  } catch { throw new AnalyticsError("invalid_response", "Vercel’s report was incomplete or had an unexpected format. No counts have been substituted.", 502); }
}
