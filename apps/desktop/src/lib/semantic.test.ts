import { describe, it, expect } from 'vitest';
import { mapSemanticFields } from './semantic-fields';
import { generateQuestionSuggestions } from './question-suggestions';
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

  it('generates question suggestions based on semantic tags', () => {
    const columns = [
      "Ngày báo cáo",
      "Tuyến xe",
      "Tên lái xe",
      "Đánh giá",
      "Mã tài kiện"
    ];
    
    const mapping = mapSemanticFields(mockProfiles(columns, {
      "Đánh giá": { topValues: ["Nhập muộn", "Đúng giờ"] }
    }));
    const suggestions = generateQuestionSuggestions(mapping);

    const questions = suggestions.map(s => s.question);

    expect(questions).toContain("How does Nhập muộn change over Ngày báo cáo?");
    expect(questions).toContain("What is the Nhập muộn rate by Tuyến xe?");
    expect(questions).toContain("Which Tên lái xe has the highest Nhập muộn rate?");

    const driverSLA = suggestions.find(s => s.id === "logistics_driver_sla_specific_Nhập muộn");
    expect(driverSLA).toBeDefined();
    expect(driverSLA?.requiredFields.length).toBe(2);
    expect(driverSLA?.requiredFields.map(f => f.semanticTag)).toContain("driver");
    expect(driverSLA?.requiredFields.map(f => f.semanticTag)).toContain("delivery_status");
  });

  it('drops driver SLA question if driver field is removed', () => {
    const columns = [
      "Ngày báo cáo",
      "Tuyến xe",
      "Đánh giá",
      "Mã tài kiện"
    ];
    
    const mapping = mapSemanticFields(mockProfiles(columns));
    const suggestions = generateQuestionSuggestions(mapping);

    const driverSLA = suggestions.find(s => s.id.includes("logistics_driver_sla"));
    expect(driverSLA).toBeUndefined(); // MUST NOT APPEAR

    const routePerformance = suggestions.find(s => s.id.includes("logistics_route_performance"));
    expect(routePerformance).toBeDefined(); // Still appears because route and status exist
  });
});
