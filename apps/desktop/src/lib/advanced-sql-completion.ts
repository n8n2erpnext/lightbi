import type { AdvancedConnection, AdvancedSchema, AdvancedTableNode } from './advanced-api';
import { buildSqlLanguageSuggestions, type SqlSuggestion } from './advanced-sql-suggestions';

export type SqlCompletionContextKind = 'qualified_column' | 'table' | 'column' | 'post_source' | 'generic';
export type SqlContextualSuggestion = SqlSuggestion & {
  filterText?: string;
  sortText: string;
  preselect?: boolean;
};
export type SqlCompletionResult = {
  context: SqlCompletionContextKind;
  prefix: string;
  suggestions: SqlContextualSuggestion[];
};

type Provider = AdvancedConnection['provider'] | 'duckdb';
type SourceRef = { schemaName: string; table: AdvancedTableNode; alias: string | null };

const MAX_SUGGESTIONS = 300;
const SQL_RESERVED = new Set([
  'where', 'join', 'left', 'right', 'inner', 'outer', 'full', 'cross', 'on', 'group', 'order',
  'having', 'limit', 'offset', 'union', 'except', 'intersect', 'as', 'select', 'from',
]);

function token(value: string): string {
  return value.trim().replace(/^(?:"|`|\[)|(?:"|`|\])$/g, '').toLocaleLowerCase();
}

function quoteName(provider: Provider, name: string): string {
  if (provider === 'mysql' || provider === 'mariadb') return `\`${name.replaceAll('`', '``')}\``;
  if (provider === 'sqlserver') return `[${name.replaceAll(']', ']]')}]`;
  return `"${name.replaceAll('"', '""')}"`;
}

function currentPrefix(beforeCursor: string): string {
  return beforeCursor.match(/[A-Za-z_][A-Za-z0-9_$]*$/)?.[0] ?? '';
}

function currentLine(beforeCursor: string): string {
  return beforeCursor.slice(beforeCursor.lastIndexOf('\n') + 1);
}

function inStringOrComment(beforeCursor: string): boolean {
  const line = currentLine(beforeCursor);
  let singleQuoted = false;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '-' && line[index + 1] === '-' && !singleQuoted) return true;
    if (line[index] !== "'") continue;
    if (singleQuoted && line[index + 1] === "'") { index += 1; continue; }
    singleQuoted = !singleQuoted;
  }
  return singleQuoted;
}

function flattenTables(schema: AdvancedSchema | null): Array<{ schemaName: string; table: AdvancedTableNode }> {
  return schema?.schemas.flatMap(schemaNode => schemaNode.tables.map(table => ({ schemaName: schemaNode.name, table }))) ?? [];
}

function findTable(schema: AdvancedSchema | null, rawRef: string): { schemaName: string; table: AdvancedTableNode } | null {
  const parts = rawRef.split('.').map(part => token(part));
  const tableName = parts.at(-1) ?? '';
  const schemaName = parts.length > 1 ? parts.at(-2) ?? '' : '';
  return flattenTables(schema).find(item => token(item.table.name) === tableName
    && (!schemaName || token(item.schemaName) === schemaName)) ?? null;
}

function sourceReferences(beforeCursor: string, schema: AdvancedSchema | null): SourceRef[] {
  if (!schema) return [];
  const identifier = '(?:"[^"]+"|`[^`]+`|\\[[^\\]]+\\]|[A-Za-z_][A-Za-z0-9_$.-]*)';
  const pattern = new RegExp(`\\b(?:FROM|JOIN)\\s+(${identifier}(?:\\s*\\.\\s*${identifier})?)(?:\\s+(?:AS\\s+)?([A-Za-z_][A-Za-z0-9_$]*))?`, 'giu');
  const output: SourceRef[] = [];
  for (const match of beforeCursor.matchAll(pattern)) {
    const found = findTable(schema, match[1].replace(/\s+/g, ''));
    if (!found) continue;
    const candidateAlias = match[2] && !SQL_RESERVED.has(match[2].toLocaleLowerCase()) ? match[2] : null;
    if (!output.some(item => item.schemaName === found.schemaName && item.table.name === found.table.name && item.alias === candidateAlias)) {
      output.push({ ...found, alias: candidateAlias });
    }
  }
  return output;
}

function qualifiedTarget(beforeCursor: string, sources: SourceRef[]): { source: SourceRef; prefix: string } | null {
  const match = beforeCursor.match(/([A-Za-z_][A-Za-z0-9_$]*)\.([A-Za-z_][A-Za-z0-9_$]*)?$/);
  if (!match) return null;
  const qualifier = match[1].toLocaleLowerCase();
  const source = sources.find(item => item.alias?.toLocaleLowerCase() === qualifier || item.table.name.toLocaleLowerCase() === qualifier);
  return source ? { source, prefix: match[2] ?? '' } : null;
}

function tableContext(line: string): boolean {
  return /\b(?:FROM|JOIN)\s+(?:"[^"]*"|`[^`]*`|\[[^\]]*\]|[A-Za-z0-9_.$-]*)$/iu.test(line);
}

function columnContext(line: string): boolean {
  const lastClause = [...line.matchAll(/\b(SELECT|WHERE|ON|HAVING|GROUP\s+BY|ORDER\s+BY|FROM|JOIN)\b/giu)].at(-1)?.[1]?.toLocaleUpperCase();
  return Boolean(lastClause && !['FROM', 'JOIN'].includes(lastClause));
}

function schemaSuggestions(schema: AdvancedSchema, provider: Provider): SqlContextualSuggestion[] {
  return schema.schemas.map((node, index) => ({
    label: node.name, detail: 'Schema', insertText: quoteName(provider, node.name), kind: 'schema',
    filterText: node.name, sortText: `020_${String(index).padStart(4, '0')}_${node.name}`,
  }));
}

function tableSuggestions(schema: AdvancedSchema, provider: Provider): SqlContextualSuggestion[] {
  return flattenTables(schema).map(({ schemaName, table }, index) => ({
    label: table.name,
    detail: `${table.kind || 'table'} · ${schemaName}`,
    insertText: schemaName && schemaName !== 'workspace' ? `${quoteName(provider, schemaName)}.${quoteName(provider, table.name)}` : quoteName(provider, table.name),
    kind: 'table', filterText: `${table.name} ${schemaName}.${table.name}`,
    sortText: `010_${String(index).padStart(4, '0')}_${table.name}`,
    preselect: index === 0,
  }));
}

function columnsForSources(sources: SourceRef[], schema: AdvancedSchema | null, provider: Provider): SqlContextualSuggestion[] {
  const effective = sources.length ? sources : flattenTables(schema).map(item => ({ ...item, alias: null }));
  const qualify = effective.length > 1;
  const output: SqlContextualSuggestion[] = [];
  for (const [sourceIndex, source] of effective.entries()) {
    const qualifier = source.alias || source.table.name;
    for (const [columnIndex, column] of source.table.columns.entries()) {
      output.push({
        label: qualify ? `${qualifier}.${column.name}` : column.name,
        detail: `${column.nativeType || 'column'} · ${source.schemaName}.${source.table.name}`,
        insertText: qualify ? `${qualifier}.${quoteName(provider, column.name)}` : quoteName(provider, column.name),
        kind: 'column', filterText: `${column.name} ${qualifier}.${column.name}`,
        sortText: `010_${String(sourceIndex).padStart(3, '0')}_${String(columnIndex).padStart(4, '0')}_${column.name}`,
        preselect: sourceIndex === 0 && columnIndex === 0,
      });
    }
  }
  return output;
}

function qualifiedColumns(source: SourceRef, provider: Provider): SqlContextualSuggestion[] {
  return source.table.columns.map((column, index) => ({
    label: column.name,
    detail: `${column.nativeType || 'column'} · ${source.schemaName}.${source.table.name}`,
    insertText: quoteName(provider, column.name), kind: 'column', filterText: column.name,
    sortText: `000_${String(index).padStart(4, '0')}_${column.name}`, preselect: index === 0,
  }));
}

function languageSuggestions(provider: Provider, mode: 'post_source' | 'generic' | 'column'): SqlContextualSuggestion[] {
  const postSource = ['WHERE', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET'];
  return buildSqlLanguageSuggestions(provider).map((item, index) => {
    const boosted = mode === 'post_source' && postSource.includes(item.label);
    const columnFunction = mode === 'column' && item.kind === 'function';
    const tier = boosted ? '000' : columnFunction ? '040' : item.kind === 'keyword' ? '100' : item.kind === 'function' ? '120' : '200';
    return { ...item, filterText: item.label, sortText: `${tier}_${String(index).padStart(4, '0')}_${item.label}`, preselect: boosted && item.label === 'WHERE' };
  });
}

function dedupe(items: SqlContextualSuggestion[]): SqlContextualSuggestion[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = `${item.kind}:${item.label}:${item.insertText}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((left, right) => left.sortText.localeCompare(right.sortText)).slice(0, MAX_SUGGESTIONS);
}

export function buildContextualSqlCompletions({
  beforeCursor, documentText = beforeCursor, provider, schema, schemaSuggestionsEnabled,
}: {
  beforeCursor: string;
  documentText?: string;
  provider: Provider;
  schema: AdvancedSchema | null;
  schemaSuggestionsEnabled: boolean;
}): SqlCompletionResult {
  const prefix = currentPrefix(beforeCursor);
  if (provider === 'mongodb' || inStringOrComment(beforeCursor)) return { context: 'generic', prefix, suggestions: [] };
  const sources = schemaSuggestionsEnabled ? sourceReferences(documentText, schema) : [];
  const qualified = schemaSuggestionsEnabled ? qualifiedTarget(beforeCursor, sources) : null;
  if (qualified) return { context: 'qualified_column', prefix: qualified.prefix, suggestions: dedupe(qualifiedColumns(qualified.source, provider)) };

  const line = currentLine(beforeCursor);
  if (schemaSuggestionsEnabled && schema && tableContext(line)) {
    return { context: 'table', prefix, suggestions: dedupe([...tableSuggestions(schema, provider), ...schemaSuggestions(schema, provider)]) };
  }
  if (columnContext(line)) {
    const contextualColumns = schemaSuggestionsEnabled ? columnsForSources(sources, schema, provider) : [];
    return { context: 'column', prefix, suggestions: dedupe([...contextualColumns, ...languageSuggestions(provider, 'column')]) };
  }
  if (sources.length && /^\s*[A-Za-z_][A-Za-z0-9_ ]*$/u.test(line)) {
    return { context: 'post_source', prefix, suggestions: dedupe(languageSuggestions(provider, 'post_source')) };
  }
  const genericSchema = schemaSuggestionsEnabled && schema ? [...tableSuggestions(schema, provider), ...schemaSuggestions(schema, provider)] : [];
  return { context: 'generic', prefix, suggestions: dedupe([...languageSuggestions(provider, 'generic'), ...genericSchema]) };
}
