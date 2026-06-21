import { describe, expect, it } from "vitest";
import { createSemanticSample } from "./semantic-sampler";

describe("createSemanticSample", () => {
  it("returns full rows when the dataset is within the semantic budget", () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({ id: index }));
    const sample = createSemanticSample(rows, { maxRows: 20, seed: "small" });

    expect(sample.strategy).toBe("full");
    expect(sample.sampleRowCount).toBe(10);
    expect(sample.rowIndexes).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("builds a deterministic matrix sample across head, tail, even, and random rows", () => {
    const rows = Array.from({ length: 5000 }, (_, index) => ({
      index,
      contact: index < 4500 ? "telephone" : "cellular"
    }));

    const first = createSemanticSample(rows, { seed: "campaign", maxRows: 2000 });
    const second = createSemanticSample(rows, { seed: "campaign", maxRows: 2000 });

    expect(first.strategy).toBe("matrix_sample");
    expect(first.sampleRowCount).toBeLessThanOrEqual(2000);
    expect(first.rowIndexes).toEqual(second.rowIndexes);
    expect(first.rowIndexes).toContain(0);
    expect(first.rowIndexes).toContain(4999);
    expect(first.rows.some(row => row.contact === "cellular")).toBe(true);
  });
});
