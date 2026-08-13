import { describe, expect, it } from 'vitest';
import { buildDrillThroughSql, resolveDrillThroughPoint, rowsToCsv } from './drill-through-export';

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

  it('resolves a canonical chart dimension to its physical source column', () => {
    const point = resolveDrillThroughPoint(
      { dimensionField: 'time_period', value: '2026-06-01 18:15', label: '01/06/2026 18:15' },
      [{ canonicalId: 'time_period', physicalColumn: 'OrderDate', role: 'time', confidence: 96 }],
      ['OrderID', 'OrderDate', 'Revenue'],
    );

    expect(point.sourceDimensionField).toBe('OrderDate');
    expect(buildDrillThroughSql(point)).toContain('CAST("orderdate" AS VARCHAR)');
    expect(buildDrillThroughSql(point)).not.toContain('CAST("time_period" AS VARCHAR)');
  });

  it('uses the only governed time binding for a generic time_period result', () => {
    const point = resolveDrillThroughPoint(
      { dimensionField: 'time_period', value: 1_632_009_600_000, label: '20/09/2021' },
      [{ canonicalId: 'document.issue_date', physicalColumn: 'NGÀY XUẤT', role: 'time', confidence: 91 }],
      ['MÃ PHIẾU XUẤT', 'NGÀY XUẤT'],
    );

    expect(point.sourceDimensionField).toBe('NGÀY XUẤT');
    expect(buildDrillThroughSql(point)).toContain('CAST("ngày xuất" AS VARCHAR)');
  });

  it('reconciles an already-normalized chart field with the exact physical workbook header', () => {
    const normalizedChartField = 'Thời gian tồn'.normalize('NFD');
    const point = resolveDrillThroughPoint(
      {
        dimensionField: 'inventory.age',
        sourceDimensionField: normalizedChartField,
        value: 0.86,
        label: '0.86',
      },
      [{
        canonicalId: 'inventory.age',
        physicalColumn: ' Thời gian tồn ',
        role: 'measure',
        confidence: 96,
      }],
      ['Mã phiếu gửi', ' Thời gian tồn ', 'Thời gian tác động'],
    );

    expect(point.sourceDimensionField).toBe(' Thời gian tồn ');
    expect(buildDrillThroughSql(point)).toContain('CAST("thời gian tồn" AS VARCHAR)');
    expect(buildDrillThroughSql(point)).not.toContain(normalizedChartField);
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
