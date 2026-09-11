import { isOwner, ownerPassword, privateJson } from "../../../lib/server/analytics-access";
import { AnalyticsError, readVercelAnalytics } from "../../../lib/server/vercel-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!ownerPassword()) return privateJson({ code: "owner_setup", error: "Set OLYMPUS_OWNER_PASSWORD to a unique password of at least 20 characters, then restart Olympus." }, 503);
  if (!isOwner(request)) return privateJson({ code: "unauthorized", error: "Unlock analytics with your Olympus owner password." }, 401);
  const url = new URL(request.url);
  const days = url.searchParams.get("days") ?? "7";
  if ((days !== "7" && days !== "30") || url.searchParams.getAll("days").length > 1) return privateJson({ code: "invalid_range", error: "Choose 7 or 30 days." }, 400);
  const projectId = url.searchParams.get("projectId") ?? undefined;
  if ((projectId !== undefined && !/^prj_[a-zA-Z0-9]+$/.test(projectId)) || url.searchParams.getAll("projectId").length > 1 || [...url.searchParams.keys()].some(key => key !== "days" && key !== "projectId")) return privateJson({ code: "invalid_project", error: "Choose a project from the list." }, 400);
  const started = Date.now();
  try {
    const report = await readVercelAnalytics(days === "7" ? 7 : 30, fetch, new Date(), projectId);
    console.info(JSON.stringify({ event: "analytics_read", status: 200, days: Number(days), durationMs: Date.now() - started }));
    return privateJson(report);
  } catch (error) {
    const known = error instanceof AnalyticsError;
    const status = known ? error.status : 500;
    console.error(JSON.stringify({ event: "analytics_read", status, code: known ? error.code : "internal", durationMs: Date.now() - started }));
    return privateJson({ code: known ? error.code : "internal", error: known ? error.message : "Analytics could not be loaded." }, status);
  }
}
