import { describe, expect, it } from 'vitest';
import { buildDrillThroughSql, rowsToCsv } from './drill-through-export';

describe('drill-through export', () => {
  it('builds a safe DuckDB filter for a clicked chart segment', () => {
    const sql = buildDrillThroughSql({
      dimensionField: 'Ngưỡng tồn',
      value: 'ton>24h',
      label: 'ton>24h',
      measureField: 'row_count',
      measureValue: 67,
    }, 67);

    expect(sql).toContain('FROM __LIGHTBI_PREVIEW_TABLE__');
    expect(sql).toContain('"ngưỡng tồn"');
    expect(sql).toContain("TRIM(CAST(\"ngưỡng tồn\" AS VARCHAR)) = 'ton>24h'");
    expect(sql).toContain('LIMIT 67');
  });

  it('escapes CSV cells and protects spreadsheet formulas', () => {
    const csv = rowsToCsv(
      ['Mã đơn', 'Ghi chú'],
      [
        { 'Mã đơn': '=CMD', 'Ghi chú': 'ton>24h' },
        { 'Mã đơn': 'A"1', 'Ghi chú': null },
      ]
    );

    expect(csv).toBe('"Mã đơn","Ghi chú"\r\n"\'=CMD","ton>24h"\r\n"A""1",');
  });
});
