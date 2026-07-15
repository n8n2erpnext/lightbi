import { describe, expect, it } from "vitest";
import { profilePhysicalSource, physicalSourceFromRecords } from "./profiler";
import type { CanonicalPhysicalSourceInputV1 } from "./profiling-contracts";

function source(rawRows: unknown[][], sourceId = "test:source"): CanonicalPhysicalSourceInputV1 {
  return {
    schemaVersion: "lightbi.physical-source-input.v1",
    source: { sourceId, kind: "local_file", label: "test.xlsx" },
    rawRows
  };
}

describe("understanding-core canonical physical profiler", () => {
  it("separates source, profiled, and evidence row counts", () => {
    const rawRows = [["id", "amount"], ...Array.from({ length: 250 }, (_, index) => [`ID-${index}`, index * 2])];
    const artifact = profilePhysicalSource(source(rawRows));

    expect(artifact.sourceProfile.sourceRowCount).toBe(251);
    expect(artifact.sourceProfile.profiledRowCount).toBe(250);
    expect(artifact.sourceProfile.dataRegion.rowCount).toBe(250);
    expect(artifact.representativeEvidence.sourceDataRowCount).toBe(250);
    expect(artifact.representativeEvidence.sampledRowCount).toBeLessThan(250);
    expect(artifact.representativeEvidence.fullFileTruth).toBe(false);
  });

  it("preserves title rows and selects an offset header", () => {
    const artifact = profilePhysicalSource(source([
      ["National ranking report"],
      ["Employee ID", "Rank", "Score"],
      [1001, 1, 9.5],
      [1002, 2, 9.1]
    ]));

    expect(artifact.sourceProfile.header.selectedHeaderRowIndex).toBe(1);
    expect(artifact.sourceProfile.header.skippedRows).toEqual([
      { sourceRowIndex: 0, rawValues: ["National ranking report"] }
    ]);
    expect(artifact.sourceProfile.issues.map(item => item.code)).toContain("header_offset");
    expect(artifact.sourceProfile.issues.map(item => item.code)).toContain("title_rows");
  });

  it("reports physical counts, parse failures, uniqueness, and safe summaries", () => {
    const artifact = profilePhysicalSource(source([
      ["code", "amount", "date", "status"],
      ["A", "10", "2026-01-01", "open"],
      ["B", "20", "2026-01-02", "open"],
      ["B", "bad", "not-a-date", "closed"],
      ["", "", "", ""]
    ]));
    const columns = new Map(artifact.sourceProfile.columns.map(column => [column.physicalColumnName, column]));

    expect(columns.get("code")?.nonNullCount).toBe(3);
    expect(columns.get("code")?.uniqueness.duplicateRowCount).toBe(1);
    expect(columns.get("amount")?.parseEvidence.find(item => item.parser === "numeric")).toMatchObject({
      attemptedCount: 3,
      successCount: 2,
      failureCount: 1
    });
    expect(columns.get("amount")?.numericSummary).toMatchObject({ minimum: 10, maximum: 20, mean: 15 });
    expect(columns.get("date")?.dateTimeSummary).toMatchObject({ parsedCount: 2 });
    expect(columns.get("status")?.stringSummary?.likelyCategorical).toBe(true);
  });

  it("surfaces mixed, formula-error, technical, null, and locale evidence", () => {
    const artifact = profilePhysicalSource(source([
      ["__PowerAppsId__", "DATE", "AREA CLASS", "local_date"],
      ["a886d124-31d9-4a9a-a3e2-000000000001", 43738, "#REF!", "01/02/2026"],
      ["a886d124-31d9-4a9a-a3e2-000000000002", "bad", "North", "13/02/2026"],
      ["", "", "South", ""]
    ]));
    const issueCodes = artifact.sourceProfile.issues.map(item => item.code);

    expect(issueCodes).toContain("technical_column");
    expect(issueCodes).toContain("mixed_type");
    expect(issueCodes).toContain("formula_error");
    expect(issueCodes).toContain("null_values");
    expect(issueCodes).toContain("ambiguous_date_locale");
    expect(issueCodes).not.toContain("silent_parse_drop");
  });

  it("samples head, middle, tail, stable random, null, rare, and malformed evidence deterministically", () => {
    const rows = Array.from({ length: 500 }, (_, index) => ({
      id: `ID-${index}`,
      category: index === 333 ? "rare" : "common",
      amount: index === 417 ? "bad" : index,
      nullable: index === 222 ? null : "present"
    }));
    const input = physicalSourceFromRecords({
      source: { sourceId: "stable-source", kind: "database_table", label: "public.events" },
      columns: ["id", "category", "amount", "nullable"],
      rows
    });
    const first = profilePhysicalSource(input).representativeEvidence;
    const second = profilePhysicalSource(input).representativeEvidence;

    expect(first).toEqual(second);
    expect(first.coveredRegions).toEqual(expect.arrayContaining(["head", "middle", "tail", "deterministic_random", "supplemental"]));
    expect(first.rows.some(row => row.values.category === "rare")).toBe(true);
    expect(first.rows.some(row => row.values.amount === "bad")).toBe(true);
    expect(first.rows.some(row => row.values.nullable === null)).toBe(true);
    expect(first.rows.every(row => Number.isInteger(row.sourceRowIndex))).toBe(true);
  });

  it("returns explicit unknown limitations when no safe source region exists", () => {
    const artifact = profilePhysicalSource(source([]));

    expect(artifact.sourceProfile.header.selectionStatus).toBe("not_found");
    expect(artifact.sourceProfile.dataRegion.selectionStatus).toBe("not_found");
    expect(artifact.sourceProfile.confidence.level).toBe("unknown");
    expect(artifact.representativeEvidence.strategy).toBe("unavailable");
    expect(artifact.limitations.length).toBeGreaterThan(0);
  });
});
