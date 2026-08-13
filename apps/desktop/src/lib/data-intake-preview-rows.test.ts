import { describe, it, expect } from 'vitest';
import { createPreviewRows } from './data-intake-preview-rows';

describe('createPreviewRows', () => {

  it('1. object rows capped to 1000', () => {
    const rows = Array.from({ length: 1500 }).map((_, i) => ({ id: i }));
    const result = createPreviewRows(rows, ['id']);
    expect(result).toHaveLength(1000);
    expect(result[0].id).toBe(0);
    expect(result[999].id).toBe(999);
  });

  it('2. array rows normalized using columns', () => {
    const rows = [
      ["A", "S1"],
      ["B", "S2"]
    ];
    const columns = ["route", "shipment"];
    const result = createPreviewRows(rows, columns);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ route: "A", shipment: "S1" });
    expect(result[1]).toEqual({ route: "B", shipment: "S2" });
  });

  it('3. original rows not mutated', () => {
    const original = [{ val: 1 }];
    const result = createPreviewRows(original, ['val']);
    result[0].val = 2; // mutate result
    expect(original[0].val).toBe(1); // original untouched
  });

  it('4. rows_count may be greater than previewRows.length', () => {
    const rows = Array.from({ length: 1500 }).map((_, i) => ({ id: i }));
    const result = createPreviewRows(rows, ['id'], 100);
    expect(result).toHaveLength(100);
    expect(rows).toHaveLength(1500); // represents rows_count > previewRows.length
  });

  it('5. empty rows returns []', () => {
    expect(createPreviewRows([], ['id'])).toEqual([]);
    expect(createPreviewRows(null as any, ['id'])).toEqual([]);
  });

  it('6. invalid rows handled safely', () => {
    const rows = [
      { id: 1 },
      null, // invalid
      "string", // invalid
      [2] // array mix
    ];
    const result = createPreviewRows(rows, ['id']);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ id: 1 });
    expect(result[1]).toEqual({});
    expect(result[2]).toEqual({});
    expect(result[3]).toEqual({ id: 2 });
  });

});
