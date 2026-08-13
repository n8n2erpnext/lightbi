import { describe, expect, it } from 'vitest';
import { buildDrillBreakdowns } from './drill-through-analysis';

describe('drill-through business breakdowns', () => {
  it('finds useful secondary business dimensions without depending on a sample filename or value', () => {
    const rows = [
      { 'Aging bucket': '3-7 days', 'Current branch': 'North', Status: 'Waiting', 'Order ID': 'A-1' },
      { 'Aging bucket': '3-7 days', 'Current branch': 'North', Status: 'Waiting', 'Order ID': 'A-2' },
      { 'Aging bucket': '3-7 days', 'Current branch': 'South', Status: 'Escalated', 'Order ID': 'A-3' },
    ];

    const result = buildDrillBreakdowns(Object.keys(rows[0]), rows, 'Aging bucket');

    expect(result.map(item => item.column)).toEqual(['Current branch', 'Status']);
    expect(result[0].items).toEqual([
      { label: 'North', count: 2, share: 2 / 3 },
      { label: 'South', count: 1, share: 1 / 3 },
    ]);
  });

  it('does not present high-cardinality document identities as management breakdowns', () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({
      Bucket: 'Selected',
      'Shipment ID': `S-${index}`,
      Route: index % 2 ? 'R-1' : 'R-2',
    }));

    const result = buildDrillBreakdowns(Object.keys(rows[0]), rows, 'Bucket');

    expect(result.map(item => item.column)).toEqual(['Route']);
  });
});
