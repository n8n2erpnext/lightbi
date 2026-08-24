import { describe, expect, it } from 'vitest';
import { buildProSqlSuggestions, buildSqlLanguageSuggestions } from '../../lib/advanced-sql-suggestions';

const schema = {
  connectionId: 'test', connectionName: 'Test', database: 'demo', schemas: [{
    name: 'sales', tables: [{ name: 'orders', kind: 'table', columns: [
      { name: 'order_id', nativeType: 'varchar', nullable: false },
      { name: 'revenue', nativeType: 'numeric', nullable: true },
    ] }],
  }],
};

describe('Advanced SQL Pro suggestions', () => {
  it('provides SQL keywords, functions and safe templates for every tier', () => {
    const suggestions = buildSqlLanguageSuggestions('duckdb');
    expect(suggestions.some(item => item.kind === 'keyword' && item.label === 'WHERE')).toBe(true);
    expect(suggestions.some(item => item.kind === 'function' && item.label === 'COUNT')).toBe(true);
    expect(suggestions.some(item => item.kind === 'snippet' && item.label === 'SELECT query')).toBe(true);
  });

  it('derives suggestions from the connected schema without dataset-specific rules', () => {
    const suggestions = buildProSqlSuggestions(schema, 'postgresql');
    expect(suggestions.some(item => item.kind === 'table' && item.label === 'orders' && item.insertText === '"sales"."orders"')).toBe(true);
    expect(suggestions.some(item => item.kind === 'column' && item.label === 'revenue')).toBe(true);
    expect(suggestions.some(item => item.kind === 'snippet' && item.insertText.includes('"sales"."orders"'))).toBe(true);
  });

  it('uses the active SQL dialect when quoting names', () => {
    const suggestions = buildProSqlSuggestions(schema, 'mysql');
    expect(suggestions.find(item => item.label === 'orders')?.insertText).toBe('`sales`.`orders`');
  });

  it('uses TOP instead of LIMIT for SQL Server templates', () => {
    const suggestions = buildProSqlSuggestions(schema, 'sqlserver');
    const template = suggestions.find(item => item.label === 'SELECT source columns')?.insertText ?? '';
    expect(template).toContain('SELECT TOP');
    expect(template).not.toContain('LIMIT');
  });
});
