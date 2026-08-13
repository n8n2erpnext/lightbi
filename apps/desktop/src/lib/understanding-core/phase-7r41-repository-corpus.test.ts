import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

const ROOT = path.resolve(__dirname, "../../../../..");
const require = createRequire(import.meta.url);
const resolver = require(path.join(ROOT, "sample-corpus/tooling/corpus-fixture-resolver.cjs")) as {
  loadGroundTruth(version: string): { manifest: any; samples: any[] };
  resolveFixture(version: string, relativePath: string): string;
};
const sha256 = (file: string) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const FROZEN_120: Record<string, string> = {
  "sample-corpus/manifest.json": "a36284c1f4655289ff832bb4102f9e153fdad329020df6972802802368d0adaa",
  "sample-corpus/ground-truth/adversarial-dirty.json": "5aa9eb78ca5ace97f23af6b1edf21ad8616764d281180ef6f9273f43e4d287dc",
  "sample-corpus/ground-truth/finance-accounting.json": "3d66360763825b7a70b440b1367f3cbd0ac57b3d57ebefac956ca73a3efdfc71",
  "sample-corpus/ground-truth/inventory.json": "1a604479b6c9175224dacff892d50509a129f47e1c297dce58ea04c79626497a",
  "sample-corpus/ground-truth/multi-file.json": "9bec416f7f66e768777387e2af963e496e410b6aeb4e1e1a70b7412993584b3f",
  "sample-corpus/ground-truth/operations-delivery.json": "34358725ee416f0b26a4b72c15f2d8a324c5a38227a3756e2fb744a7cb22374b",
  "sample-corpus/ground-truth/revenue-sales.json": "15c74119995414d497b94baf539672ac1ffd98a10e940561775c17769716685a",
};

describe("Phase 7R4.1 repository-safe corpus integrity", () => {
  it("keeps corpus 1.2.0 byte-frozen as historical local evidence", () => {
    for (const [relative, expected] of Object.entries(FROZEN_120)) expect(sha256(path.join(ROOT, relative)), relative).toBe(expected);
  });

  it("resolves all 30 release cases exclusively from tracked corpus inputs", () => {
    const { manifest, samples } = resolver.loadGroundTruth("1.4.0");
    expect(manifest.corpusVersion).toBe("1.4.0");
    expect(manifest.historicalLineage.classification).toBe("historical_local_acceptance_evidence");
    expect(samples).toHaveLength(30);
    const governedInputs = new Map(manifest.sources.map((source: any) => [source.path, source]));
    for (const sample of samples) {
      for (const source of sample.sources) {
        expect(path.isAbsolute(source.path), source.path).toBe(false);
        expect(source.path.startsWith("sample data/"), source.path).toBe(false);
        const file = resolver.resolveFixture("1.4.0", source.path);
        expect(governedInputs.get(source.path), source.path).toMatchObject({ trackedInput: true, ignoredInputEligible: false });
        expect(sha256(file), source.path).toBe(source.sha256);
      }
    }
  });

  it("finds no personal-data patterns, external links, comments, hidden sheets or unsafe metadata in generated fixtures", () => {
    const fixtureRoot = path.join(ROOT, "sample-corpus/versions/1.4.0/fixtures");
    const files = fs.readdirSync(fixtureRoot).filter((name) => name.endsWith(".xlsx"));
    expect(files).toHaveLength(13);
    for (const name of files) {
      const workbook = XLSX.readFile(path.join(fixtureRoot, name), { raw: true });
      const values: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        expect(workbook.Workbook?.Sheets?.find((item) => item.name === sheetName)?.Hidden ?? 0, `${name}#${sheetName}`).toBe(0);
        const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, raw: true, defval: "", blankrows: true });
        for (const row of rows) for (const value of row) if (typeof value === "string") values.push(value);
        expect(Object.values(workbook.Sheets[sheetName]).some((cell: any) => cell?.c?.length > 0), name).toBe(false);
      }
      const text = values.join("\n");
      expect(text).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      expect(text).not.toMatch(/(?:\+?84|0)\d{8,10}/);
      expect(workbook.Props?.Author).toBe("LightBI");
      expect(workbook.Props?.Company ?? "").toBe("");
    }
  });

  it("fails closed for absolute, sample-data and missing release inputs", () => {
    expect(() => resolver.resolveFixture("1.4.0", "/tmp/fixture.xlsx")).toThrow("CORPUS_ABSOLUTE_PATH_FORBIDDEN");
    expect(() => resolver.resolveFixture("1.4.0", "sample data/fixture.xlsx")).toThrow("CORPUS_140_SAMPLE_DATA_FALLBACK_FORBIDDEN");
    expect(() => resolver.resolveFixture("1.4.0", "sample-corpus/versions/1.4.0/fixtures/missing.xlsx")).toThrow("CORPUS_REQUIRED_FIXTURE_MISSING");
  });
});
