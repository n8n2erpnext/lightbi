import { describe, it, expect } from 'vitest';
import { mapSemanticFields } from './semantic-fields';
import type { ColumnProfile } from './column-profiler';

function mockProfiles(columns: string[], overrides: Record<string, Partial<ColumnProfile>> = {}): ColumnProfile[] {
  return columns.map(col => ({
    name: col,
    dataType: "string",
    distinctCount: 10,
    nullPercent: 0,
    topValues: [],
    isIdentifier: false,
    isCategorical: false,
    ...overrides[col]
  }));
}

describe('Semantic Engine Architecture', () => {
  it('maps semantic fields with confidence', () => {
    const columns = [
      "Ngày báo cáo",
      "Tuyến xe",
      "Tên lái xe",
      "Đánh giá",
      "Mã tài kiện"
    ];
    
    const mapping = mapSemanticFields(mockProfiles(columns, {
      "Mã tài kiện": { isIdentifier: true }
    }));
    
    const timeField = mapping.find(f => f.name === "Ngày báo cáo");
    expect(timeField?.semanticTag).toBe("report_date");
    expect(timeField?.semanticType).toBe("time");
    expect(timeField?.confidence).toBeGreaterThan(0.5);

    const routeField = mapping.find(f => f.name === "Tuyến xe");
    expect(routeField?.semanticTag).toBe("route");
    expect(routeField?.semanticType).toBe("dimension");

    const driverField = mapping.find(f => f.name === "Tên lái xe");
    expect(driverField?.semanticTag).toBe("driver");
    expect(driverField?.semanticType).toBe("dimension");

    const statusField = mapping.find(f => f.name === "Đánh giá");
    expect(statusField?.semanticTag).toBe("delivery_status");
    expect(statusField?.semanticType).toBe("status");

    const idField = mapping.find(f => f.name === "Mã tài kiện");
    expect(idField?.semanticTag).toBe("shipment");
    expect(idField?.semanticType).toBe("identifier");
  });

});
