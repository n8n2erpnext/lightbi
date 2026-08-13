import { describe, it, expect } from 'vitest';
import { detectDatasetDomain } from './dataset-capabilities';

describe('detectDatasetDomain', () => {
  it('detects logistics_delivery', () => {
    const columns = [
      "Ngày báo cáo",
      "Tuyến xe",
      "Biên nhận",
      "Thời gian",
      "Tài xế",
      "Đánh giá"
    ];
    const result = detectDatasetDomain(columns);
    expect(result.primaryDomain).toBe("logistics_delivery");
    expect(result.suggestedActions).toContain("Late delivery analysis");
  });

  it('detects sales_revenue', () => {
    const columns = ["Order Date", "Customer", "Revenue", "Product"];
    const result = detectDatasetDomain(columns);
    expect(result.primaryDomain).toBe("sales_revenue");
  });

  it('detects hr_attendance', () => {
    const columns = ["Employee", "Attendance", "Leave", "Department"];
    const result = detectDatasetDomain(columns);
    expect(result.primaryDomain).toBe("hr_attendance");
  });

  it('returns generic for unknown columns', () => {
    const columns = ["foo", "bar", "baz"];
    const result = detectDatasetDomain(columns);
    expect(result.primaryDomain).toBe("generic");
  });
});
