import type { AdvancedConnection, AdvancedSchema } from './advanced-api';

export type SqlSuggestion = {
  label: string;
  detail: string;
  insertText: string;
  kind: 'schema' | 'table' | 'column' | 'snippet';
};

function quoteName(provider: AdvancedConnection['provider'] | 'duckdb', name: string): string {
  if (provider === 'mysql' || provider === 'mariadb') return `\`${name.replaceAll('`', '``')}\``;
  return `"${name.replaceAll('"', '""')}"`;
}

export function buildProSqlSuggestions(
  schema: AdvancedSchema | null,
  provider: AdvancedConnection['provider'] | 'duckdb',
): SqlSuggestion[] {
  if (!schema) return [];
  const suggestions: SqlSuggestion[] = [];
  for (const schemaNode of schema.schemas) {
    suggestions.push({ label: schemaNode.name, detail: 'Schema', insertText: quoteName(provider, schemaNode.name), kind: 'schema' });
    for (const table of schemaNode.tables) {
      const qualified = schemaNode.name && schemaNode.name !== 'workspace'
        ? `${quoteName(provider, schemaNode.name)}.${quoteName(provider, table.name)}`
        : quoteName(provider, table.name);
      suggestions.push({ label: table.name, detail: `Table · ${schemaNode.name}`, insertText: qualified, kind: 'table' });
      for (const column of table.columns) {
        suggestions.push({
          label: column.name,
          detail: `${column.nativeType || 'Column'} · ${schemaNode.name}.${table.name}`,
          insertText: quoteName(provider, column.name),
          kind: 'column',
        });
      }
    }
  }
  const firstTable = schema.schemas.flatMap(node => node.tables.map(table => ({ schema: node.name, table })))[0];
  if (firstTable) {
    const qualified = firstTable.schema && firstTable.schema !== 'workspace'
      ? `${quoteName(provider, firstTable.schema)}.${quoteName(provider, firstTable.table.name)}`
      : quoteName(provider, firstTable.table.name);
    suggestions.push(
      { label: 'SELECT columns', detail: 'LightBI Pro template', insertText: `SELECT \${1:*}\nFROM ${qualified}\nWHERE \${2:condition}\nORDER BY \${3:column}\nLIMIT \${4:200};`, kind: 'snippet' },
      { label: 'GROUP BY summary', detail: 'LightBI Pro template', insertText: `SELECT \${1:dimension}, COUNT(*) AS record_count\nFROM ${qualified}\nGROUP BY \${1:dimension}\nORDER BY record_count DESC\nLIMIT \${2:50};`, kind: 'snippet' },
      { label: 'CTE analysis', detail: 'LightBI Pro template', insertText: `WITH source AS (\n  SELECT *\n  FROM ${qualified}\n  WHERE \${1:condition}\n)\nSELECT \${2:*}\nFROM source\nLIMIT \${3:200};`, kind: 'snippet' },
    );
  }
  return suggestions;
}
