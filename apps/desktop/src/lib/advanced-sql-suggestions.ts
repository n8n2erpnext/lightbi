import type { AdvancedConnection, AdvancedSchema } from './advanced-api';

export type SqlSuggestion = {
  label: string;
  detail: string;
  insertText: string;
  kind: 'schema' | 'table' | 'column' | 'snippet' | 'keyword' | 'function';
};

function quoteName(provider: AdvancedConnection['provider'] | 'duckdb', name: string): string {
  if (provider === 'mysql' || provider === 'mariadb') return `\`${name.replaceAll('`', '``')}\``;
  return `"${name.replaceAll('"', '""')}"`;
}

export function buildSqlLanguageSuggestions(provider: AdvancedConnection['provider'] | 'duckdb'): SqlSuggestion[] {
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'AS', 'DISTINCT', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
    'ON', 'GROUP BY', 'HAVING', 'ORDER BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'WITH', 'UNION ALL',
    'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AND', 'OR', 'NOT', 'IN', 'IS NULL', 'IS NOT NULL', 'BETWEEN',
  ];
  const functions = ['COUNT', 'COUNT DISTINCT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'NULLIF', 'CAST', 'ROUND', 'LOWER', 'UPPER', 'TRIM'];
  const pageClause = provider === 'sqlserver' ? '' : '\nLIMIT ${4:200}';
  const selectPrefix = provider === 'sqlserver' ? 'SELECT TOP (${4:200})' : 'SELECT';
  return [
    ...keywords.map(label => ({ label, detail: 'SQL keyword', insertText: label, kind: 'keyword' as const })),
    ...functions.map(label => ({
      label,
      detail: 'SQL function',
      insertText: label === 'COUNT DISTINCT' ? 'COUNT(DISTINCT ${1:column})' : `${label}(\${1:expression})`,
      kind: 'function' as const,
    })),
    { label: 'SELECT query', detail: 'Safe query template', insertText: `${selectPrefix} \${1:*}\nFROM \${2:table}\nWHERE \${3:condition}${pageClause};`, kind: 'snippet' },
    { label: 'GROUP BY query', detail: 'Aggregation template', insertText: `${selectPrefix} \${1:dimension}, COUNT(*) AS record_count\nFROM \${2:table}\nGROUP BY \${1:dimension}\nORDER BY record_count DESC${pageClause};`, kind: 'snippet' },
    { label: 'CASE expression', detail: 'Conditional expression', insertText: 'CASE\n  WHEN ${1:condition} THEN ${2:value}\n  ELSE ${3:fallback}\nEND', kind: 'snippet' },
    { label: 'IN filter', detail: 'List filter', insertText: 'IN (${1:value_1}, ${2:value_2})', kind: 'snippet' },
  ];
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
    const pageClause = provider === 'sqlserver' ? '' : '\nLIMIT ${4:200}';
    const selectPrefix = provider === 'sqlserver' ? 'SELECT TOP (${4:200})' : 'SELECT';
    const cteResult = provider === 'sqlserver'
      ? 'SELECT TOP (${3:200}) ${2:*}\nFROM source;'
      : 'SELECT ${2:*}\nFROM source\nLIMIT ${3:200};';
    suggestions.push(
      { label: 'SELECT source columns', detail: 'LightBI Pro schema template', insertText: `${selectPrefix} \${1:*}\nFROM ${qualified}\nWHERE \${2:condition}\nORDER BY \${3:column}${pageClause};`, kind: 'snippet' },
      { label: 'GROUP BY source', detail: 'LightBI Pro schema template', insertText: `${selectPrefix} \${1:dimension}, COUNT(*) AS record_count\nFROM ${qualified}\nGROUP BY \${1:dimension}\nORDER BY record_count DESC${pageClause};`, kind: 'snippet' },
      { label: 'CTE analysis', detail: 'LightBI Pro template', insertText: `WITH source AS (\n  SELECT *\n  FROM ${qualified}\n  WHERE \${1:condition}\n)\n${cteResult}`, kind: 'snippet' },
    );
  }
  return suggestions;
}
