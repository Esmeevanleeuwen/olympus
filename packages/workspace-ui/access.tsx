"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CLOSED_FLAGS, DEFAULT_PREFERENCES, effectivePreferences, flagsFor, normalizePreferences, type FeatureAccess, type Flags, type Platform, type SidebarPreferences } from "./model";

type WorkspaceAccess = {
  rows: FeatureAccess[]; flags: Flags; preferences: SidebarPreferences; userId: string | null; owner: boolean;
  ready: boolean; error: string; saving: boolean; collapsed: boolean; setCollapsed: (value: boolean) => void;
  savePreferences: (value: SidebarPreferences) => Promise<void>; refresh: () => Promise<void>;
};
const AccessContext = createContext<WorkspaceAccess | null>(null);

export function WorkspaceAccessProvider({ client, platform, children, initialRows = [] }: { client: SupabaseClient; platform: Platform; children: ReactNode; initialRows?: FeatureAccess[] }) {
  const [rows, setRows] = useState<FeatureAccess[]>(initialRows);
  const [preferences, setPreferences] = useState<SidebarPreferences>(DEFAULT_PREFERENCES);
  const [userId, setUserId] = useState<string | null>(null);
  const [owner, setOwner] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [collapsed, updateCollapsed] = useState(false);
  const saveLock = useRef(false);
  const generation = useRef(0);
  const flags = flagsFor(rows, platform);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    const { data, error: readError } = await client.from("suite_feature_access").select("platform_id,feature_id,enabled,revision,updated_at");
    if (current !== generation.current) return;
    if (readError) { setRows([]); setError("Platforminstellingen zijn niet bereikbaar. Extra functies zijn tijdelijk uitgeschakeld."); }
    else { setRows((data ?? []) as FeatureAccess[]); setError(""); }
    setReady(true);
  }, [client]);
  useEffect(() => {
    let active = true;
    let identityVersion = 0;
    async function identity() {
      const version = ++identityVersion;
      const { data: { user } } = await client.auth.getUser();
      if (!active || version !== identityVersion) return;
      const id = user && !user.is_anonymous ? user.id : null;
      setUserId(id); setOwner(false); setPreferences(DEFAULT_PREFERENCES);
      if (!id) return;
      const [role, saved] = await Promise.all([
        client.from("user_roles").select("role").eq("user_id", id).maybeSingle(),
        client.from("suite_sidebar_preferences").select("feature_id,value").eq("user_id", id).eq("platform_id", platform),
      ]);
      if (!active || version !== identityVersion) return;
      setOwner(role.data?.role === "owner");
      const width = saved.data?.find(item => item.feature_id === "sidebar.customize")?.value?.width;
      const shortcuts = saved.data?.find(item => item.feature_id === "sidebar.shortcuts")?.value?.shortcuts;
      setPreferences(normalizePreferences({ width, shortcuts }));
    }
    void refresh(); void identity();
    const { data: listener } = client.auth.onAuthStateChange(() => { setTimeout(() => { if (active) void identity(); }, 0); });
    const poll = () => { if (document.visibilityState === "visible") void refresh(); };
    const interval = window.setInterval(poll, 20_000);
    window.addEventListener("focus", poll);
    return () => { active = false; generation.current++; listener.subscription.unsubscribe(); clearInterval(interval); window.removeEventListener("focus", poll); };
  }, [client, platform, refresh]);
  useEffect(() => {
    try { updateCollapsed((localStorage.getItem(`olympus.sidebar.v1:${platform}:${userId ?? "guest"}`) ?? (window.matchMedia("(max-width: 760px)").matches ? "closed" : "open")) === "closed"); } catch { /* Session-only when storage is blocked. */ }
  }, [platform, userId]);
  function setCollapsed(value: boolean) {
    updateCollapsed(value);
    try { localStorage.setItem(`olympus.sidebar.v1:${platform}:${userId ?? "guest"}`, value ? "closed" : "open"); } catch { /* The control still works without storage. */ }
  }
  async function savePreferences(next: SidebarPreferences) {
    if (saveLock.current) return;
    if (!userId) throw new Error("Log in om je sidebarvoorkeuren op te slaan.");
    const value = normalizePreferences(next);
    const changes: { user_id: string; platform_id: Platform; feature_id: string; value: object }[] = [];
    if (value.width !== effectivePreferences(preferences, flags).width) {
      if (!flags["sidebar.customize"]) throw new Error("Sidebar aanpassen is uitgeschakeld voor dit platform.");
      changes.push({ user_id: userId, platform_id: platform, feature_id: "sidebar.customize", value: { width: value.width } });
    }
    if (JSON.stringify(value.shortcuts) !== JSON.stringify(effectivePreferences(preferences, flags).shortcuts)) {
      if (!flags["sidebar.shortcuts"]) throw new Error("Snelkoppelingen zijn uitgeschakeld voor dit platform.");
      changes.push({ user_id: userId, platform_id: platform, feature_id: "sidebar.shortcuts", value: { shortcuts: value.shortcuts } });
    }
    if (!changes.length) return;
    saveLock.current = true; setSaving(true);
    try {
      const { error: writeError } = await client.from("suite_sidebar_preferences").upsert(changes, { onConflict: "user_id,platform_id,feature_id" });
      if (writeError) { await refresh(); throw new Error("Opslaan is geweigerd. Controleer of je nog bent ingelogd en de functie aan staat."); }
      setPreferences(previous => ({ width: flags["sidebar.customize"] ? value.width : previous.width, shortcuts: flags["sidebar.shortcuts"] ? value.shortcuts : previous.shortcuts }));
    } finally { saveLock.current = false; setSaving(false); }
  }
  return <AccessContext.Provider value={{ rows, flags: ready || initialRows.length ? flags : CLOSED_FLAGS, preferences: effectivePreferences(preferences, flags), userId, owner, ready, error, saving, collapsed, setCollapsed, savePreferences, refresh }}>{children}</AccessContext.Provider>;
}
export function useWorkspaceAccess() {
  const context = useContext(AccessContext);
  if (!context) throw new Error("WorkspaceAccessProvider ontbreekt.");
  return context;
}
