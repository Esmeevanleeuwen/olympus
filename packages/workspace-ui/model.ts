export const PLATFORMS = ["olympus", "meridian"] as const;
export type Platform = typeof PLATFORMS[number];
export const FEATURES = [
  { id: "sidebar.customize", title: "Sidebar aanpassen", description: "Kies een compacte of ruime sidebar.", platforms: PLATFORMS },
  { id: "sidebar.search", title: "Zoeken in het menu", description: "Vind een pagina zonder door het menu te bladeren.", platforms: PLATFORMS },
  { id: "sidebar.shortcuts", title: "Eigen snelkoppelingen", description: "Zet veelgebruikte pagina’s bovenaan.", platforms: PLATFORMS },
] as const;
export type FeatureId = typeof FEATURES[number]["id"];
export type FeatureAccess = { platform_id: Platform; feature_id: string; enabled: boolean; revision: number; updated_at: string };
export type Flags = Record<FeatureId, boolean>;
export const CLOSED_FLAGS: Flags = { "sidebar.customize": false, "sidebar.search": false, "sidebar.shortcuts": false };
export function flagsFor(rows: FeatureAccess[], platform: Platform): Flags {
  return Object.fromEntries(FEATURES.map(feature => [feature.id,
    feature.platforms.includes(platform) && rows.some(row => row.platform_id === platform && row.feature_id === feature.id && row.enabled === true)
  ])) as Flags;
}
export type SidebarPreferences = { width: "compact" | "wide"; shortcuts: string[] };
export const DEFAULT_PREFERENCES: SidebarPreferences = { width: "compact", shortcuts: [] };
export function normalizePreferences(value: unknown): SidebarPreferences {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return { width: data.width === "wide" ? "wide" : "compact", shortcuts: Array.isArray(data.shortcuts)
    ? [...new Set(data.shortcuts.filter((id): id is string => typeof id === "string" && /^[a-zA-Z0-9/_-]{1,100}$/.test(id)))].slice(0, 12) : [] };
}
export function effectivePreferences(preferences: SidebarPreferences, flags: Flags): SidebarPreferences {
  return { width: flags["sidebar.customize"] ? preferences.width : "compact", shortcuts: flags["sidebar.shortcuts"] ? preferences.shortcuts : [] };
}
