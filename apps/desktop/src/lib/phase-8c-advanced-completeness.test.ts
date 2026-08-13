import { describe, expect, it } from "vitest";
import { classifyAdvancedResultCompleteness } from "./advanced-result-handoff";
import type { AdvancedQueryResult } from "./advanced-api";

function result(overrides: Partial<AdvancedQueryResult> = {}): AdvancedQueryResult {
  return { runId: "phase8c", columns: [{ id: "id", name: "id", logicalType: "number", nativeType: "DOUBLE" }], rows: [[1]], page: { offset: 0, limit: 200, hasMore: false, estimatedTotal: 1 }, truncated: false, warnings: [], executionMs: 1, ...overrides };
}

describe("Phase 8C Advanced result completeness", () => {
  it.each([
    ["bounded", result({ page: { offset: 0, limit: 1, hasMore: true, estimatedTotal: 2 } })],
    ["paginated", result({ page: { offset: 1, limit: 1, hasMore: false, estimatedTotal: 2 } })],
    ["truncated", result({ truncated: true })],
    ["unknown", result({ rows: Array.from({ length: 200 }, (_, index) => [index]), page: { offset: 0, limit: 200, hasMore: false } })],
  ])("classifies %s results as incomplete", (state, value) => {
    const completeness = classifyAdvancedResultCompleteness(value);
    expect(completeness.state).toBe(state);
    expect(completeness.blocker).toBe(`advanced_result_${state}`);
  });

  it("marks only a fully materialized result complete", () => {
    expect(classifyAdvancedResultCompleteness(result())).toMatchObject({ state: "complete", blocker: null });
  });
});
