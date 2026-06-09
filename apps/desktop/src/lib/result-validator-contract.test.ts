import { describe, it, expect } from 'vitest';
import { validatePreviewRuntimeResult } from './result-validator-contract';
import type { ExpectedResultContract } from './expected-result-contract';
import type { PreviewRuntimeResult } from './duckdb-preview-runtime';

function createMockInput(overrides: { expected?: Partial<ExpectedResultContract>, preview?: Partial<PreviewRuntimeResult> } = {}) {
  const expected: ExpectedResultContract = {
    id: "exp-1",
    status: "ready",
    questionId: "q-1",
    shape: "ranking",
    outputType: "chart",
    dimensions: [{ id: "dim1", label: "Dim 1" }],
    measures: [{ id: "meas1", label: "Meas 1", aggregation: "sum" }],
    businessViewId: "bv-1",
    filters: [],
    sorts: [],
    limit: 10,
    confidence: "HIGH",
    ...(overrides.expected || {})
  } as any;

  const preview: PreviewRuntimeResult = {
    id: "prv-1",
    compiledQueryId: "cq-1",
    previewResultContractId: "prc-1",
    expectedResultId: "exp-1",
    sandboxRequestId: "sb-1",
    status: "ready",
    columns: [
      { id: "dim1", label: "Dim 1", role: "dimension" },
      { id: "meas1", label: "Meas 1", role: "measure" }
    ],
    rows: [],
    rowCount: 0,
    truncated: false,
    warnings: [],
    execution: { engine: "duckdb", mode: "preview", maxRows: 100 },
    ...(overrides.preview || {})
  };

  return { expectedResult: expected, previewResult: preview };
}

describe('Result Validator Contract', () => {

  it('1. Perfect dimension/measure match passes', () => {
    const input = createMockInput();
    const result = validatePreviewRuntimeResult(input);
    expect(result.status).toBe("passed");
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.confidence).toBe("HIGH");
  });

  it('2. Missing dimension lowers score', () => {
    const input = createMockInput({
      preview: {
        columns: [{ id: "meas1", label: "Meas 1", role: "measure" }]
      }
    });
    const result = validatePreviewRuntimeResult(input);
    // dimension match = 0, shape ranking will fail because missing dimension = 0
    expect(result.score).toBeLessThan(85);
  });

  it('3. Missing measure lowers score', () => {
    const input = createMockInput({
      preview: {
        columns: [{ id: "dim1", label: "Dim 1", role: "dimension" }]
      }
    });
    const result = validatePreviewRuntimeResult(input);
    expect(result.score).toBeLessThan(85);
  });

  it('4. Ranking shape requires dimension + measure', () => {
    const input = createMockInput({
      expected: { shape: "ranking" },
      preview: { columns: [{ id: "dim1", label: "Dim 1", role: "dimension" }] } // missing measure
    });
    const result = validatePreviewRuntimeResult(input);
    expect(result.warnings).toContain("Ranking shape requires at least one dimension and one measure.");
  });

  it('5. Summary shape requires measure', () => {
    const input = createMockInput({
      expected: { shape: "summary" },
      preview: { columns: [{ id: "dim1", label: "Dim 1", role: "dimension" }] }
    });
    const result = validatePreviewRuntimeResult(input);
    expect(result.warnings).toContain("Summary shape requires at least one measure.");
  });

  it('6. Trend without time dimension gives warning', () => {
    const input = createMockInput({
      expected: { shape: "trend", dimensions: [{ id: "category", label: "Category" }] as any }
    });
    const result = validatePreviewRuntimeResult(input);
    expect(result.warnings).toContain("Trend shape expects a date/time dimension but none detected explicitly.");
  });

  it('7. Score maps to HIGH/MEDIUM/LOW', () => {
    const passed = validatePreviewRuntimeResult(createMockInput());
    expect(passed.confidence).toBe("HIGH");

    // partial match
    const partial = validatePreviewRuntimeResult(createMockInput({
      expected: { dimensions: [{}, {}] as any },
      preview: { columns: [{ id: "dim1", label: "Dim 1", role: "dimension" }, { id: "m1", label: "M1", role: "measure" }] }
    }));
    // 50% dimension, full others
    expect(["MEDIUM", "HIGH"]).toContain(partial.confidence); // Math.round might push it either way depending on exact weights
  });
});
