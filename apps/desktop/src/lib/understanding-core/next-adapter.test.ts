import { describe, expect, it } from "vitest";
import { createUnderstandingCoreResult } from "./question-engine";
import { adaptCoreToUnderstandingNext } from "./next-adapter";

describe("understanding-core next adapter", () => {
  it("adapts universal money questions to existing UnderstandingNextCard shape", () => {
    const core = createUnderstandingCoreResult({
      columns: ["Ngày xuất", "Mã kho", "Tổng tiền", "Tiền mặt"],
      rows: [
        { "Ngày xuất": "2024-12-01", "Mã kho": "K1", "Tổng tiền": 1000, "Tiền mặt": 1000 },
        { "Ngày xuất": "2024-12-02", "Mã kho": "K2", "Tổng tiền": 2000, "Tiền mặt": 0 }
      ],
      sourceRowCount: 200
    });

    const adapted = adaptCoreToUnderstandingNext(core);
    expect(adapted.source.sourceRowCount).toBe(200);
    expect(adapted.profile.detectedDomains).toContain("revenue");
    expect(adapted.lenses.some(lens => lens.label === "Money trend")).toBe(true);
    expect(adapted.availableActions.some(action => action.label === "Money over time")).toBe(true);
  });

  it("preserves healthcare as overlay-derived revenue/customer/performance domains", () => {
    const core = createUnderstandingCoreResult({
      columns: ["Ngày khám", "Bệnh nhân", "Bác sĩ", "Tên thuốc", "Tiền phải thu"],
      rows: [
        { "Ngày khám": "2025-01-01", "Bệnh nhân": "BN1", "Bác sĩ": "DR1", "Tên thuốc": "A", "Tiền phải thu": 1000 },
        { "Ngày khám": "2025-01-02", "Bệnh nhân": "BN2", "Bác sĩ": "DR2", "Tên thuốc": "B", "Tiền phải thu": 2000 }
      ]
    });

    const adapted = adaptCoreToUnderstandingNext(core);
    expect(adapted.perspectives.some(p => p.id === "healthcare")).toBe(true);
    expect(adapted.profile.detectedDomains).toContain("revenue");
    expect(adapted.profile.detectedDomains).toContain("customer");
    expect(adapted.profile.detectedDomains).toContain("performance");
  });
});
