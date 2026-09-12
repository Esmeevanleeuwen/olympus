export type DataTableInfo = { name: string; rows: number; fields: number };
export type DataWorkspaceState = { tables: DataTableInfo[]; selected: string; view: string };
export type TableRequest = { id: number; table: string };

/** The frame shares table metadata only, never record contents or SQL. */
export function parseDataWorkspaceState(value: unknown): DataWorkspaceState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const message = value as Record<string, unknown>;
  if (message.type !== "olympus:data-state" || !Array.isArray(message.tables) || message.tables.length > 100 ||
    typeof message.selected !== "string" || !["data", "structure", "connections", "latest", "builder"].includes(String(message.view))) return null;
  const tables: DataTableInfo[] = [], names = new Set<string>();
  for (const item of message.tables) {
    if (!item || typeof item !== "object" || typeof item.name !== "string" || !/^[a-z_][a-z0-9_]{0,62}$/.test(item.name) || names.has(item.name) ||
      !Number.isSafeInteger(item.rows) || item.rows < 0 || !Number.isSafeInteger(item.fields) || item.fields < 0) return null;
    names.add(item.name);
    tables.push({ name: item.name, rows: item.rows, fields: item.fields });
  }
  if (!names.has(message.selected)) return null;
  return { tables, selected: message.selected, view: String(message.view) };
}
