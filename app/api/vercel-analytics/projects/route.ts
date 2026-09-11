import { isOwner, ownerPassword, privateJson } from "../../../../lib/server/analytics-access";
import { AnalyticsError, listVercelProjects } from "../../../../lib/server/vercel-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!ownerPassword()) return privateJson({ code: "owner_setup", error: "Set OLYMPUS_OWNER_PASSWORD to a unique password of at least 20 characters, then restart Olympus." }, 503);
  if (!isOwner(request)) return privateJson({ code: "unauthorized", error: "Unlock analytics with your Olympus owner password." }, 401);
  if (new URL(request.url).search) return privateJson({ code: "invalid_request", error: "The connected team is set in Olympus’s server settings." }, 400);
  const started = Date.now();
  try {
    const catalog = await listVercelProjects();
    console.info(JSON.stringify({ event: "analytics_projects", status: 200, count: catalog.projects.length, durationMs: Date.now() - started }));
    return privateJson(catalog);
  } catch (error) {
    const known = error instanceof AnalyticsError;
    const status = known ? error.status : 500;
    console.error(JSON.stringify({ event: "analytics_projects", status, code: known ? error.code : "internal", durationMs: Date.now() - started }));
    return privateJson({ code: known ? error.code : "internal", error: known ? error.message : "Vercel projects could not be loaded." }, status);
  }
}
