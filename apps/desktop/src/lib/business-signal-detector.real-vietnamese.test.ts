import { describe, it, expect } from 'vitest';
import { runGuidedInvestigationPipeline } from './guided-investigation-pipeline';

describe('Real Vietnamese Dataset Live Trace', () => {
  const columns = [
    "Ngày báo cáo",
    "Tuyến xe",
    "Tên lái xe",
    "Đánh giá",
    "Mã tài kiện"
  ];

  it('detects all expected signals', () => {
    const input = { columns: columns.map(c => ({ name: c, type: 'string' })) };
    const result = runGuidedInvestigationPipeline(input as any);
    const signals = result.signals.signals.map(s => s.canonicalId);
    
    expect(signals).toContain('report_date');
    expect(signals).toContain('route');
    expect(signals).toContain('driver');
    expect(signals).toContain('satisfaction');
    expect(signals).toContain('shipment');
    expect(signals.length).toBeGreaterThanOrEqual(5);
  });

  it('runs full pipeline but respects strict business view rules', () => {
    const input = { columns: columns.map(c => ({ name: c, type: 'string' })) };
    const result = runGuidedInvestigationPipeline(input as any);
    
    const pIds = result.perspectives.map(p => p.id);
    expect(pIds).toContain('operations');
    
    // We expect 0 Business Views because we strictly lack delivery_status and sla and warehouse.
    // The prompt explicitly forbids lowering minimumRequiredMatches or faking it.
    // We must report exactly what's missing if it fails.
    
    // Check if any operations view is created
    const opViews = result.businessViews.filter(v => v.perspectiveId === 'operations');
    // If it is 0, we intentionally assert that it is 0 to prove the strict rules hold.
    expect(opViews.length).toBe(0);
    expect(result.questionSuggestions.length).toBe(0);
  });

  it('ignores garbage Vietnamese columns', () => {
    const garbageCols = ["ghi chú", "nội dung", "khác", "mô tả"];
    const input = { columns: garbageCols.map(c => ({ name: c, type: 'string' })) };
    const result = runGuidedInvestigationPipeline(input as any);
    
    expect(result.signals.signals.length).toBe(0);
    expect(result.perspectives.length).toBe(0);
    expect(result.businessViews.length).toBe(0);
  });
  
  it('Ensures Đánh giá still maps to satisfaction, not delivery_status', () => {
    const input = { columns: [{ name: "Đánh giá", type: 'string' }] };
    const result = runGuidedInvestigationPipeline(input as any);
    const signals = result.signals.signals.map(s => s.canonicalId);
    expect(signals).toContain('satisfaction');
    expect(signals).not.toContain('delivery_status');
  });
});
