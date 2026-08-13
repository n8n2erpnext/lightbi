export const ADVANCED_TABS_STORAGE_KEY = 'lightbi.advanced.tabs.v1';
export const ADVANCED_HISTORY_STORAGE_KEY = 'lightbi.advanced.history.v1';

export type PersistedAdvancedTab = {
  id: string;
  title: string;
  sql: string;
  limit: number;
};

export type AdvancedHistoryEntry = {
  id: string;
  sql: string;
  database: string;
  executedAt: string;
  executionMs: number;
  rowCount: number;
  successful: boolean;
  error?: string;
};

const DEFAULT_SQL = 'SELECT current_database() AS database, current_user AS user_name, now() AS server_time';
const VALID_LIMITS = new Set([100, 200, 500, 1000]);

export function createAdvancedId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `advanced-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createAdvancedTab(index: number, initial?: Partial<PersistedAdvancedTab>): PersistedAdvancedTab {
  return {
    id: initial?.id || createAdvancedId(),
    title: initial?.title?.trim() || `Query ${index}`,
    sql: initial?.sql ?? DEFAULT_SQL,
    limit: VALID_LIMITS.has(initial?.limit ?? 0) ? initial!.limit! : 200,
  };
}

export function serializeAdvancedTabs(tabs: PersistedAdvancedTab[]): string {
  return JSON.stringify(tabs.slice(0, 12).map(tab => ({
    id: tab.id,
    title: tab.title,
    sql: tab.sql.length <= 100_000 ? tab.sql : '',
    limit: VALID_LIMITS.has(tab.limit) ? tab.limit : 200,
  })));
}

export function restoreAdvancedTabs(raw: string | null): PersistedAdvancedTab[] {
  if (!raw) return [createAdvancedTab(1)];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [createAdvancedTab(1)];
    const tabs = parsed.slice(0, 12).flatMap((value, index) => {
      if (!value || typeof value !== 'object') return [];
      const candidate = value as Partial<PersistedAdvancedTab>;
      if (typeof candidate.id !== 'string' || typeof candidate.sql !== 'string') return [];
      return [createAdvancedTab(index + 1, candidate)];
    });
    return tabs.length > 0 ? tabs : [createAdvancedTab(1)];
  } catch {
    return [createAdvancedTab(1)];
  }
}

export function restoreAdvancedHistory(raw: string | null): AdvancedHistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(entry => entry && typeof entry === 'object' && typeof entry.sql === 'string').slice(0, 100) as AdvancedHistoryEntry[];
  } catch {
    return [];
  }
}

export function prependAdvancedHistory(
  history: AdvancedHistoryEntry[],
  entry: AdvancedHistoryEntry
): AdvancedHistoryEntry[] {
  return [entry, ...history].slice(0, 100);
}

export function splitAdvancedStatements(sql: string, maxStatements = 5): string[] {
  const statements: string[] = [];
  let start = 0;
  let quote: "'" | '"' | '`' | null = null;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; index += 1; } continue; }
    if (quote) {
      if (char === quote && next === quote) { index += 1; continue; }
      if (char === quote && sql[index - 1] !== '\\') quote = null;
      continue;
    }
    if (char === '-' && next === '-') { lineComment = true; index += 1; continue; }
    if (char === '/' && next === '*') { blockComment = true; index += 1; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === ';') {
      const statement = sql.slice(start, index).trim();
      if (statement) statements.push(statement);
      start = index + 1;
      if (statements.length >= maxStatements) break;
    }
  }
  if (statements.length < maxStatements) {
    const tail = sql.slice(start).trim();
    if (tail) statements.push(tail);
  }
  return statements.slice(0, maxStatements);
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function advancedResultToCsv(columns: Array<{ name: string }>, rows: unknown[][]): string {
  return [columns.map(column => csvCell(column.name)).join(','), ...rows.map(row => row.map(csvCell).join(','))].join('\r\n');
}
