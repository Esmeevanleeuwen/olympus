import { FEATURES, Feature, FeatureId, SuitePanel, isFeatureId } from "./features";

export const SUITE_KEY = "olympus-suite-v1";
export const DRAFTS_KEY = "olympus-suite-drafts-v1";
export const LEGACY_LAYOUT_KEY = "olympus-layout-v02";
export const MAX_NOTE_LENGTH = 4000;
export type ToolPreference = { enabled: boolean; showInSidebar: boolean; order: number };
export type SuitePreferences = { version: 1; collapsed: boolean; tools: Record<FeatureId, ToolPreference> };
export type SuiteDrafts = { version: 1; scratchpad: string };
export type StoragePort = Pick<Storage, "getItem" | "setItem">;
export type StoredSuite = {
  preferences: SuitePreferences; drafts: SuiteDrafts;
  preferencesSaved: boolean; draftsSaved: boolean;
  preferencesWritable: boolean; draftsWritable: boolean;
};
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function defaultPreferences(): SuitePreferences {
  return {
    version: 1, collapsed: false,
    tools: Object.fromEntries(FEATURES.map((feature, order) => [feature.id, {
      enabled: feature.defaultEnabled, showInSidebar: feature.defaultVisible, order,
    }])) as Record<FeatureId, ToolPreference>,
  };
}
export function emptyDrafts(): SuiteDrafts { return { version: 1, scratchpad: "" }; }
export function parsePreferences(value: unknown): SuitePreferences {
  if (!record(value) || value.version !== 1 || !record(value.tools)) throw new Error("Unsupported suite preferences.");
  const result = defaultPreferences();
  result.collapsed = typeof value.collapsed === "boolean" ? value.collapsed : false;
  for (const feature of FEATURES) {
    const input = Object.prototype.hasOwnProperty.call(value.tools, feature.id) ? value.tools[feature.id] : undefined;
    if (!record(input)) continue;
    const fallback = result.tools[feature.id];
    result.tools[feature.id] = {
      enabled: typeof input.enabled === "boolean" ? input.enabled : fallback.enabled,
      showInSidebar: typeof input.showInSidebar === "boolean" ? input.showInSidebar : fallback.showInSidebar,
      order: typeof input.order === "number" && Number.isSafeInteger(input.order) && input.order >= 0 && input.order <= 10000 ? input.order : fallback.order,
    };
  }
  // Removed/unknown IDs are ignored. Newly registered IDs retain safe defaults.
  orderedFeatures(result).forEach((feature, index) => { result.tools[feature.id].order = index; });
  return result;
}
export function parseDrafts(value: unknown): SuiteDrafts {
  if (!record(value) || value.version !== 1 || typeof value.scratchpad !== "string" || value.scratchpad.length > MAX_NOTE_LENGTH)
    throw new Error("Unsupported suite drafts.");
  return { version: 1, scratchpad: value.scratchpad };
}
/** Read only the old visibility flags; never copy blocks, snapshots or credentials. */
export function migrateLegacyLayout(value: unknown): SuitePreferences {
  const result = defaultPreferences();
  if (!record(value) || !record(value.suite)) return result;
  if (typeof value.suite.visible === "boolean") result.collapsed = !value.suite.visible;
  const tools = value.suite.tools;
  if (record(tools)) for (const feature of FEATURES) {
    const enabled = tools[feature.id];
    if (Object.prototype.hasOwnProperty.call(tools, feature.id) && typeof enabled === "boolean") {
      result.tools[feature.id] = { ...result.tools[feature.id], enabled, showInSidebar: enabled };
    }
  }
  return result;
}
export function orderedFeatures(preferences: SuitePreferences): Feature[] {
  return [...FEATURES].sort((a, b) => preferences.tools[a.id].order - preferences.tools[b.id].order);
}
export function visibleFeatures(preferences: SuitePreferences): Feature[] {
  return orderedFeatures(preferences).filter(feature => preferences.tools[feature.id].showInSidebar);
}
export function patchTool(preferences: SuitePreferences, id: FeatureId, patch: Partial<Pick<ToolPreference, "enabled" | "showInSidebar">>): SuitePreferences {
  if (!isFeatureId(id)) return preferences;
  return parsePreferences({ ...preferences, tools: { ...preferences.tools, [id]: { ...preferences.tools[id], ...patch } } });
}
export function moveTool(preferences: SuitePreferences, id: FeatureId, direction: -1 | 1): SuitePreferences {
  const ordered = orderedFeatures(preferences).map(feature => feature.id);
  const from = ordered.indexOf(id), to = from + direction;
  if (from < 0 || to < 0 || to >= ordered.length) return preferences;
  [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
  return { ...preferences, tools: Object.fromEntries(ordered.map((key, order) => [key, { ...preferences.tools[key], order }])) as SuitePreferences["tools"] };
}
export function canOpen(preferences: SuitePreferences, id: unknown): id is FeatureId {
  return isFeatureId(id) && preferences.tools[id].enabled;
}
/** Hiding an active shortcut closes its panel; an already-hidden tool can still be opened from the library. */
export function panelAfterPreferenceChange(panel: SuitePanel, before: SuitePreferences, after: SuitePreferences): SuitePanel {
  if (!panel || panel === "library") return panel;
  if (!canOpen(after, panel)) return null;
  if (before.tools[panel].showInSidebar && !after.tools[panel].showInSidebar) return null;
  return panel;
}
export function savePreferences(storage: StoragePort | null, preferences: SuitePreferences): boolean {
  try { if (!storage) return false; storage.setItem(SUITE_KEY, JSON.stringify(parsePreferences(preferences))); return true; }
  catch { return false; }
}
export function saveDrafts(storage: StoragePort | null, drafts: SuiteDrafts): boolean {
  try { if (!storage) return false; storage.setItem(DRAFTS_KEY, JSON.stringify(parseDrafts(drafts))); return true; }
  catch { return false; }
}
export function readSuite(storage: StoragePort | null): StoredSuite {
  const state: StoredSuite = { preferences: defaultPreferences(), drafts: emptyDrafts(), preferencesSaved: false, draftsSaved: false, preferencesWritable: true, draftsWritable: true };
  if (!storage) return state;
  try {
    const raw = storage.getItem(SUITE_KEY);
    if (raw !== null) {
      if (raw.length > 32000) throw new Error("Oversized preferences.");
      state.preferences = parsePreferences(JSON.parse(raw));
    } else {
      const legacy = storage.getItem(LEGACY_LAYOUT_KEY);
      // Invalid legacy content is not a reason to erase that old record.
      try { if (legacy && legacy.length < 150000) state.preferences = migrateLegacyLayout(JSON.parse(legacy)); } catch { /* use defaults */ }
    }
    state.preferencesSaved = savePreferences(storage, state.preferences);
  } catch { state.preferencesWritable = false; }
  try {
    const raw = storage.getItem(DRAFTS_KEY);
    if (raw !== null) {
      if (raw.length > 30000) throw new Error("Oversized drafts.");
      state.drafts = parseDrafts(JSON.parse(raw));
    }
    state.draftsSaved = saveDrafts(storage, state.drafts);
  } catch { state.draftsWritable = false; }
  return state;
}
