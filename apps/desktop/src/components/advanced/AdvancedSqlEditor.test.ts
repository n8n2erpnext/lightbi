import { describe, expect, it } from 'vitest';
import { buildProSqlSuggestions } from '../../lib/advanced-sql-suggestions';

const schema = {
  connectionId: 'test', connectionName: 'Test', database: 'demo', schemas: [{
    name: 'sales', tables: [{ name: 'orders', kind: 'table', columns: [
      { name: 'order_id', nativeType: 'varchar', nullable: false },
      { name: 'revenue', nativeType: 'numeric', nullable: true },
    ] }],
  }],
};

describe('Advanced SQL Pro suggestions', () => {
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
});
