import { describe, expect, it } from 'vitest';
import { filterDrillThroughRows, getDrillThroughFilterSuggestions } from './drill-through-filter';

const rows = [
  { 'Ngưỡng tồn': 'ton>7ngay', 'BƯU CỤC HIỆN TẠI': 'HUBNBH', status: 'Chậm' },
  { 'Ngưỡng tồn': 'ton>7ngay', 'BƯU CỤC HIỆN TẠI': 'HBLSLS', status: 'Chậm' },
  { 'Ngưỡng tồn': 'ton3-7ngay', 'BƯU CỤC HIỆN TẠI': 'HUBNBH', status: 'Nhanh' },
];

describe('drill-through filters', () => {
  it('combines generic column filters with AND semantics', () => {
    const result = filterDrillThroughRows(rows, [
      { id: '1', column: 'Ngưỡng tồn', operator: 'equals', value: 'TON>7NGAY' },
      { id: '2', column: 'BƯU CỤC HIỆN TẠI', operator: 'equals', value: 'hubnbh' },
    ]);

    expect(result).toEqual([{ index: 0, row: rows[0] }]);
  });

  it('supports contains and not-equals without knowing the domain', () => {
    const result = filterDrillThroughRows(rows, [
      { id: '1', column: 'status', operator: 'contains', value: 'ch' },
      { id: '2', column: 'BƯU CỤC HIỆN TẠI', operator: 'not_equals', value: 'HBLSLS' },
    ]);

    expect(result.map(entry => entry.index)).toEqual([0]);
  });

  it('builds unique suggestions from source values', () => {
    expect(getDrillThroughFilterSuggestions(rows, 'BƯU CỤC HIỆN TẠI')).toEqual(['HBLSLS', 'HUBNBH']);
  });
});
