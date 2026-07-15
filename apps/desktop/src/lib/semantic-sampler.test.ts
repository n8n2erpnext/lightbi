import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { createSemanticSample, createUnderstandingSample } from "./semantic-sampler";

const REPO_ROOT = path.resolve(__dirname, "../../../..");

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

  it("uses the LightBI understanding contract: full up to 100, head/mid/tail/random above it", () => {
    const small = Array.from({ length: 100 }, (_, index) => ({ index }));
    expect(createUnderstandingSample(small, { seed: "small" }).strategy).toBe("full");

    const medium = Array.from({ length: 500 }, (_, index) => ({ index }));
    expect(createUnderstandingSample(medium, { seed: "medium" }).strategy).toBe("matrix_sample");

    const large = Array.from({ length: 5000 }, (_, index) => ({
      index,
      lateSignal: index >= 4900 ? "tail-only-signal" : ""
    }));
    const sample = createUnderstandingSample(large, { seed: "large" });

    expect(sample.strategy).toBe("matrix_sample");
    expect(sample.sampleRowCount).toBeLessThanOrEqual(1000);
    expect(sample.rowIndexes.slice(0, 3)).toEqual([0, 1, 2]);
    expect(sample.rowIndexes).toContain(4999);
    expect(sample.rows.some(row => row.lateSignal === "tail-only-signal")).toBe(true);
    expect(sample.rowIndexes.some(index => index > 100 && index < 4900)).toBe(true);
  });
});

describe("Phase 1 source-neutral corpus boundary", () => {
  it("can load the acceptance contract without understanding-next contracts", () => {
    const manifestPath = path.join(REPO_ROOT, "sample-corpus/manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      canonicalFutureRunner: string;
      groundTruthFiles: Array<{ path: string; required: boolean }>;
    };

    expect(manifest.canonicalFutureRunner).toBe("understanding-core");
    expect(manifest.groundTruthFiles.length).toBeGreaterThan(0);

    const documents = manifest.groundTruthFiles.map(entry => {
      expect(entry.required).toBe(true);
      return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, entry.path), "utf8")) as {
        samples: Array<{
          sources: unknown[];
          dataset: unknown;
          recognition: unknown;
          profilingExpectations: unknown;
          relationshipTruth?: unknown;
          support: unknown;
          verifiedMetricAnswers: unknown;
        }>;
      };
    });

    const samples = documents.flatMap(document => document.samples);
    expect(samples).toHaveLength(30);
    for (const sample of samples) {
      expect(sample.sources).toBeDefined();
      expect(sample.dataset).toBeDefined();
      expect(sample.recognition).toBeDefined();
      expect(sample.profilingExpectations).toBeDefined();
      expect(sample.support).toBeDefined();
      expect(sample.verifiedMetricAnswers).toBeDefined();
      if (sample.sources.length > 1) expect(sample.relationshipTruth).toBeDefined();
    }
    expect(JSON.stringify({ manifest, documents })).not.toContain("understanding-next");
  });
});
