/** Metadata only. A registered name is not a live integration or a permission. */
export const FEATURES = [
  { id: "scratchpad", title: "Scratchpad", description: "A small space for local notes.", status: "experimental", renderer: "scratchpad", icon: "note", defaultEnabled: true, defaultVisible: true },
  { id: "blank-tool", title: "Blank test tool", description: "An unassigned panel. Decide what belongs here later.", status: "placeholder", renderer: "placeholder", icon: "box", defaultEnabled: false, defaultVisible: false },
  { id: "data-inspector", title: "Data inspector", description: "Reserved for a focused resource view. No records loaded.", status: "placeholder", renderer: "placeholder", icon: "database", defaultEnabled: false, defaultVisible: false },
  { id: "api-sandbox", title: "API sandbox", description: "Reserved for later. Does not send requests.", status: "placeholder", renderer: "placeholder", icon: "code", defaultEnabled: false, defaultVisible: false },
  { id: "command-shelf", title: "Command shelf", description: "Reserved for later. Does not run commands.", status: "placeholder", renderer: "placeholder", icon: "bolt", defaultEnabled: false, defaultVisible: false },
] as const;
export type Feature = (typeof FEATURES)[number];
export type FeatureId = Feature["id"];
export type SuitePanel = "library" | FeatureId | null;
export function isFeatureId(id: unknown): id is FeatureId {
  return typeof id === "string" && FEATURES.some(feature => feature.id === id);
}
export function getFeature(id: FeatureId): Feature {
  return FEATURES.find(feature => feature.id === id)!;
}
