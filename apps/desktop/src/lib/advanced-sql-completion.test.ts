import { describe, expect, it } from 'vitest';
import type { AdvancedSchema } from './advanced-api';
import { buildContextualSqlCompletions } from './advanced-sql-completion';

const schema: AdvancedSchema = {
  connectionId: 'test', connectionName: 'Test', database: 'demo', schemas: [{
    name: 'sales', tables: [
      { name: 'orders', kind: 'table', columns: [
        { name: 'order_id', nativeType: 'varchar', nullable: false },
        { name: 'customer_id', nativeType: 'varchar', nullable: false },
        { name: 'revenue', nativeType: 'numeric', nullable: true },
      ] },
      { name: 'customers', kind: 'table', columns: [
        { name: 'customer_id', nativeType: 'varchar', nullable: false },
        { name: 'customer_name', nativeType: 'varchar', nullable: true },
      ] },
    ],
  }],
};

const complete = (beforeCursor: string, nextSchema = schema, documentText = beforeCursor) => buildContextualSqlCompletions({
  beforeCursor, documentText, provider: 'postgresql', schema: nextSchema, schemaSuggestionsEnabled: true,
});

describe('Advanced SQL contextual completion', () => {
  it('prioritizes tables and schemas immediately after FROM or JOIN', () => {
    const result = complete('SELECT *\nFROM ord');
    expect(result.context).toBe('table');
    expect(result.prefix).toBe('ord');
    expect(result.suggestions[0]).toMatchObject({ kind: 'table', label: 'orders' });
    expect(result.suggestions.find(item => item.label === 'orders')?.insertText).toBe('"sales"."orders"');
    expect(result.suggestions.some(item => item.kind === 'column')).toBe(false);
  });

  it('prioritizes columns from the referenced source in SELECT and WHERE contexts', () => {
    const select = complete('SELECT rev', schema, 'SELECT rev\nFROM sales.orders');
    expect(select.context).toBe('column');
    expect(select.suggestions.find(item => item.label === 'revenue')).toMatchObject({ kind: 'column', insertText: '"revenue"' });
    const where = complete('SELECT * FROM sales.orders\nWHERE cust');
    expect(where.context).toBe('column');
    expect(where.suggestions.some(item => item.label === 'customer_id' && item.kind === 'column')).toBe(true);
  });

  it('resolves alias-qualified completion to only the aliased table', () => {
    const result = complete('SELECT o.\nFROM sales.orders o\nJOIN sales.customers c ON o.customer_id = c.customer_id\nWHERE o.');
    expect(result.context).toBe('qualified_column');
    expect(result.suggestions.map(item => item.label)).toEqual(['order_id', 'customer_id', 'revenue']);
    expect(result.suggestions.every(item => item.detail.includes('sales.orders'))).toBe(true);
    expect(result.suggestions.some(item => item.label === 'customer_name')).toBe(false);
  });

  it('qualifies ambiguous columns when multiple sources are in scope', () => {
    const result = complete('SELECT \nFROM sales.orders o\nJOIN sales.customers c ON o.customer_id = c.customer_id\nWHERE ');
    expect(result.context).toBe('column');
    expect(result.suggestions.some(item => item.label === 'o.customer_id' && item.insertText === 'o."customer_id"')).toBe(true);
    expect(result.suggestions.some(item => item.label === 'c.customer_id' && item.insertText === 'c."customer_id"')).toBe(true);
  });

  it('boosts post-source clauses instead of flooding the next line with table names', () => {
    const result = complete('SELECT *\nFROM sales.orders o\nW');
    expect(result.context).toBe('post_source');
    expect(result.suggestions[0]).toMatchObject({ kind: 'keyword', label: 'WHERE', preselect: true });
    expect(result.suggestions.some(item => item.kind === 'table')).toBe(false);
  });

  it('does not interrupt typing inside SQL strings or line comments', () => {
    expect(complete("SELECT * FROM sales.orders WHERE customer_name = 'Ada").suggestions).toEqual([]);
    expect(complete('SELECT * FROM sales.orders -- rev').suggestions).toEqual([]);
  });

  it('uses the current schema snapshot and never retains stale tables', () => {
    const refreshed: AdvancedSchema = { ...schema, schemas: [{ name: 'sales', tables: [schema.schemas[0].tables[1]] }] };
    const result = complete('SELECT * FROM ', refreshed);
    expect(result.suggestions.some(item => item.label === 'customers')).toBe(true);
    expect(result.suggestions.some(item => item.label === 'orders')).toBe(false);
  });

  it('keeps schema metadata gated while retaining contextual SQL language suggestions', () => {
    const result = buildContextualSqlCompletions({ beforeCursor: 'SELECT ', provider: 'postgresql', schema, schemaSuggestionsEnabled: false });
    expect(result.suggestions.some(item => item.kind === 'column' || item.kind === 'table' || item.kind === 'schema')).toBe(false);
    expect(result.suggestions.some(item => item.kind === 'function' && item.label === 'COUNT')).toBe(true);
  });
});
