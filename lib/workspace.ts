export type Provider = "supabase" | "github" | "vercel";
export type Resource = {
  id: string; name: string; provider: Provider; kind: "table" | "repository" | "project";
  source: string; platform: string | null; detail: string; count: number | null;
  capturedAt: string | null; url: string | null;
};
export type Block = { id: string; title: string; kind: "blank" | "note"; text: string };
export type Snapshot = { version: 1; capturedAt: string; resources: Resource[] };
export type SuiteTool = "scratchpad" | "data-inspector" | "api-sandbox" | "command-shelf";
export type SuiteConfig = { visible: boolean; tools: Record<SuiteTool, boolean> };
export type SidebarConfig = { collapsed: boolean; dataTables: boolean; search: boolean; counts: boolean };
export type Layout = { blocks: Block[]; audiences: Block[]; suite: SuiteConfig; sidebar: SidebarConfig };
export const PLATFORMS = [

  
  { id: "meridian", name: "Meridian", repo: "perspectief" },
  { id: "aegora", name: "Aegora", repo: "aegora" },
  { id: "phosphoros", name: "Phosphoros", repo: "Phosphoros" },
  { id: "civiora", name: "Civiora", repo: "Civiora" },
  { id: "unity", name: "Unity", repo: "unity-" }
] as const;
export const SEED: Resource[] = PLATFORMS.map(p => ({
  id: `github:${p.repo}`, name: p.repo, provider: "github", kind: "repository",
  source: "Esmeevanleeuwen", platform: p.id, detail: "Public repository reference",
  count: null, capturedAt: null, url: `https://github.com/Esmeevanleeuwen/${p.repo}`
}));
export const PROVIDERS: Record<Provider, string> = { supabase: "Supabase", github: "GitHub", vercel: "Vercel" };
export const INITIAL_LAYOUT: Layout = {
  blocks: [{ id: "initial-block", title: "Untitled block", kind: "blank", text: "" }],
  audiences: [],
  sidebar: { collapsed: false, dataTables: true, search: true, counts: true },
  suite: {
    visible: false,
    tools: { scratchpad: true, "data-inspector": false, "api-sandbox": false, "command-shelf": false }
  }
};
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function text(value: unknown, max = 160): value is string { return typeof value === "string" && value.length <= max; }
function validDate(value: unknown): value is string { return text(value, 40) && Number.isFinite(Date.parse(value)); }
export function safeUrl(value: unknown): string | null {
  if (value == null) return null;
  if (!text(value, 600)) throw new Error("A resource link is invalid.");
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !["github.com", "vercel.com", "supabase.com"].includes(url.hostname) || url.username || url.password)
      throw new Error();
    return url.href;
  } catch { throw new Error("Resource links must use HTTPS on GitHub, Vercel or Supabase."); }
}
// Allowlisted fields only: never retain API keys, SQL, records or arbitrary imported markup.
export function parseSnapshot(input: unknown): Snapshot {
  if (!object(input) || input.version !== 1 || !validDate(input.capturedAt) || !Array.isArray(input.resources) || input.resources.length > 300)
    throw new Error("Choose an Olympus snapshot (version 1, up to 300 resources).");
  const ids = new Set<string>();
  const resources: Resource[] = input.resources.map(row => {
    if (!object(row) || !text(row.id) || !row.id || ids.has(row.id) || !text(row.name) || !row.name ||
      !["supabase", "github", "vercel"].includes(String(row.provider)) || !["table", "repository", "project"].includes(String(row.kind)) ||
      !text(row.source) || !text(row.detail, 500) || !(row.platform === null || PLATFORMS.some(p => p.id === row.platform)) ||
      !(row.count === null || (typeof row.count === "number" && Number.isSafeInteger(row.count) && row.count >= 0)) ||
      !(row.capturedAt === null || validDate(row.capturedAt))) throw new Error("A snapshot resource is incomplete or invalid.");
    if ((row.provider === "supabase" && row.kind !== "table") || (row.provider === "github" && row.kind !== "repository") ||
      (row.provider === "vercel" && row.kind !== "project") || (row.provider !== "supabase" && row.count !== null))
      throw new Error("This preview only charts exact Supabase table counts.");
    ids.add(row.id);
    return { id: row.id, name: row.name, provider: row.provider as Provider, kind: row.kind as Resource["kind"],
      source: row.source, detail: row.detail, platform: row.platform as string | null, count: row.count as number | null,
      capturedAt: row.capturedAt as string | null, url: safeUrl(row.url) };
  });
  return { version: 1, capturedAt: input.capturedAt, resources };
}
export function parseLayout(input: unknown): Layout {
  if (!object(input)) throw new Error("Invalid layout.");
  const parseBlocks = (value: unknown): Block[] => {
    if (!Array.isArray(value) || value.length > 8) throw new Error("Use at most eight blocks.");
    const ids = new Set<string>();
    return value.map(item => {
      if (!object(item) || !text(item.id, 100) || !item.id || ids.has(item.id) || !text(item.title, 60) || !item.title.trim() ||
        !["blank", "note"].includes(String(item.kind)) || !text(item.text, 4000)) throw new Error("Invalid block.");
      ids.add(item.id);
      return { id: item.id, title: item.title, kind: item.kind as Block["kind"], text: item.text };
    });
  };
  const suiteInput = object(input.suite) ? input.suite : INITIAL_LAYOUT.suite;
  const toolsInput = object(suiteInput.tools) ? suiteInput.tools : INITIAL_LAYOUT.suite.tools;
  const suite: SuiteConfig = {
    visible: typeof suiteInput.visible === "boolean" ? suiteInput.visible : false,
    tools: {
      scratchpad: typeof toolsInput.scratchpad === "boolean" ? toolsInput.scratchpad : true,
      "data-inspector": typeof toolsInput["data-inspector"] === "boolean" ? toolsInput["data-inspector"] : false,
      "api-sandbox": typeof toolsInput["api-sandbox"] === "boolean" ? toolsInput["api-sandbox"] : false,
      "command-shelf": typeof toolsInput["command-shelf"] === "boolean" ? toolsInput["command-shelf"] : false
    }
  };
  const sidebarInput = object(input.sidebar) ? input.sidebar : {};
  const sidebar: SidebarConfig = {
    collapsed: typeof sidebarInput.collapsed === "boolean" ? sidebarInput.collapsed : false,
    dataTables: typeof sidebarInput.dataTables === "boolean" ? sidebarInput.dataTables : true,
    search: typeof sidebarInput.search === "boolean" ? sidebarInput.search : true,
    counts: typeof sidebarInput.counts === "boolean" ? sidebarInput.counts : true
  };
  return { blocks: parseBlocks(input.blocks), audiences: parseBlocks(input.audiences), suite, sidebar };
}
export function resourcesWithSnapshot(snapshot: Snapshot | null): Resource[] {
  const map = new Map(SEED.map(row => [row.id, row]));
  for (const row of snapshot?.resources ?? []) map.set(row.id, row);
  return [...map.values()];
}
export function filterResources(rows: Resource[], platform: string, provider: string, source: string, search = ""): Resource[] {
  const q = search.trim().toLowerCase();
  return rows.filter(row => (platform === "all" || row.platform === platform) &&
    (provider === "all" || row.provider === provider) && (source === "all" || row.source === source) &&
    (!q || `${row.name} ${row.source} ${row.detail} ${row.provider}`.toLowerCase().includes(q)));
}
export function chartMaximum(rows: Resource[]): number { return Math.max(1, ...rows.map(row => row.count ?? 0)); }
export function moveBlock(blocks: Block[], id: string, direction: -1 | 1): Block[] {
  const result = [...blocks], i = result.findIndex(block => block.id === id), j = i + direction;
  if (i < 0 || j < 0 || j >= result.length) return result;
  [result[i], result[j]] = [result[j], result[i]]; return result;
}
