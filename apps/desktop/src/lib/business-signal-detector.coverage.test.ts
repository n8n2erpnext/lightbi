import { describe, it, expect } from 'vitest';
import { detectBusinessSignals, type DetectorInput } from './business-signal-detector';

function createMockInput(columns: string[]): DetectorInput {
  return {
    columns: columns.map(c => ({ name: c, type: 'string' }))
  };
}

describe('Business Signal Detector - Coverage Validation', () => {

  it('detects missing Operations concepts', () => {
    const input = createMockInput(['trễ hạn', 'phương tiện']);
    const result = detectBusinessSignals(input);
    const detected = result.signals.map(s => s.canonicalId);
    expect(detected).toContain('delay');
    expect(detected).toContain('vehicle');
  });

  it('detects missing Revenue concepts', () => {
    const input = createMockInput(['bán hàng', 'cửa hàng', 'nhân viên kinh doanh']);
    const result = detectBusinessSignals(input);
    const detected = result.signals.map(s => s.canonicalId);
    expect(detected).toContain('sales');
    expect(detected).toContain('branch');
    expect(detected).toContain('salesperson');
  });

  it('detects missing Inventory concepts', () => {
    const input = createMockInput(['số lượng tồn', 'tuổi tồn kho', 'nhập kho', 'xuất kho', 'bổ sung hàng']);
    const result = detectBusinessSignals(input);
    const detected = result.signals.map(s => s.canonicalId);
    expect(detected).toContain('stock_qty');
    expect(detected).toContain('stock_age');
    expect(detected).toContain('inbound');
    expect(detected).toContain('outbound');
    expect(detected).toContain('replenishment');
  });

  it('detects missing Customer concepts', () => {
    const input = createMockInput(['tổng số đơn', 'mua hàng lần cuối', 'lần cuối mua', 'giá trị khách hàng', 'hành vi mua hàng']);
    const result = detectBusinessSignals(input);
    const detected = result.signals.map(s => s.canonicalId);
    expect(detected).toContain('order_count');
    expect(detected).toContain('last_purchase');
    expect(detected).toContain('contribution');
    expect(detected).toContain('purchase_behavior');
  });

  it('detects missing Performance concepts', () => {
    const input = createMockInput(['chỉ số hiệu suất', 'thực tế', 'bộ phận', 'hiệu quả', 'chênh lệch']);
    const result = detectBusinessSignals(input);
    const detected = result.signals.map(s => s.canonicalId);
    expect(detected).toContain('kpi');
    expect(detected).toContain('actual');
    expect(detected).toContain('department');
    expect(detected).toContain('efficiency');
    expect(detected).toContain('performance_gap');
  });

  it('detects missing Finance concepts', () => {
    const input = createMockInput(['chi phí mua hàng', 'chi phí hoạt động', 'chi phí nhà cung cấp', 'chi tiêu']);
    const result = detectBusinessSignals(input);
    const detected = result.signals.map(s => s.canonicalId);
    expect(detected).toContain('purchase_cost');
    expect(detected).toContain('operational_cost');
    expect(detected).toContain('supplier_cost');
    expect(detected).toContain('expense');
  });

  it('does not emit signals for garbage columns', () => {
    const input = createMockInput(['abc', 'xyz', 'cột lạ', 'unknown']);
    const result = detectBusinessSignals(input);
    expect(result.signals.length).toBe(0);
  });
});
