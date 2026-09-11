import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { projectCanonicalBusinessPerspectives, projectCanonicalSourceCandidates } from "../canonical-source-candidate-projection";
import { createLocalCanonicalSourceBoundary } from "../home-source-boundary";
import { inspectLocalFile } from "../local-file-inspector";
import { createFileSourceCandidate } from "../source-preflight";
import { suggestedDeclarationsForPerspective } from "./collection-understanding";
import { getOrBuildCanonicalConsumerArtifact, resetCanonicalConsumerCacheForTests } from "./canonical-consumer-boundary";
import { buildCanonicalPeriodPartitionWorkspace } from "./canonical-period-partition-boundary";
import { appendCanonicalEvidenceDeclaration, createCanonicalUserOverlay } from "./canonical-user-overlay";

describe("Easy Mode accounting handoff", () => {
  it("preserves detected source evidence and Settings currency into an executable single-file analysis", async () => {
    resetCanonicalConsumerCacheForTests();
    const name = "Accounting_ERP_June_2026.csv";
    const bytes = readFileSync(join(process.cwd(), "../..", "sample-corpus/anchors/1.3.0", name));
    const file = new File([bytes], name, { type: "text/csv" });
    const sourceCandidate = createFileSourceCandidate(file);
    expect("rawUrl" in sourceCandidate).toBe(true);
    if (!("rawUrl" in sourceCandidate)) return;
    const inspected = await inspectLocalFile(sourceCandidate);
    expect(inspected.status).toBe("accessible");
    if (inspected.status !== "accessible") return;
    const selected = inspected.metadata;
    const boundary = createLocalCanonicalSourceBoundary({
      datasetId: name,
      columns: selected.columns ?? [],
      semanticRows: selected.semantic_rows ?? [],
      semanticSample: selected.semantic_sample,
      profile: selected.canonical_full_file_profile,
      file,
    });
    expect(boundary).not.toBeNull();
    if (!boundary) return;
    const initial = getOrBuildCanonicalConsumerArtifact({
      datasetId: name,
      sourceKind: "local_file",
      sourceLabel: name,
      columns: boundary.semanticSample.columns,
      rows: boundary.semanticSample.rows,
      sourceRowCount: boundary.sourceRowCount,
      sourceBoundary: boundary,
    });
    expect(initial.status).toBe("valid");
    if (initial.status !== "valid") return;
    const source = { key: name, name, rowCount: boundary.sourceRowCount, columns: boundary.semanticSample.columns, candidates: projectCanonicalSourceCandidates(initial) };
    const perspective = projectCanonicalBusinessPerspectives([{ key: source.key, candidates: source.candidates }], [])
      .find((item) => item.perspectiveId === "profitability");
    expect(perspective?.sourceKeys).toEqual([name]);
    if (!perspective) return;
    const draft = suggestedDeclarationsForPerspective([source], perspective)[name];
    expect(draft.role).toBe("accounting");
    expect(["InvoiceNo", "JournalNo", "OrderID"]).toContain(draft.documentColumn);
    if (!draft.role) throw new Error("Accounting role suggestion is required");

    let overlay = createCanonicalUserOverlay(boundary);
    overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, { evidenceType: "source_role", value: { kind: "source_role", role: draft.role }, scope: { level: "source_file" } });
    overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, { evidenceType: "document_identity", value: { kind: "document_identity", physicalColumn: draft.documentColumn }, scope: { level: "physical_column", physicalColumn: draft.documentColumn } });
    overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, { evidenceType: "reporting_period", value: { kind: "reporting_period", start: draft.periodStart, end: draft.periodEnd }, scope: { level: "source_file" } });
    overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, { evidenceType: "reporting_currency", value: { kind: "reporting_currency", currency: "VND", monetaryColumns: draft.monetaryColumns.split(",").map((value) => value.trim()).filter(Boolean) }, scope: { level: "source_file" } });
    const rebuilt = getOrBuildCanonicalConsumerArtifact({
      datasetId: name,
      sourceKind: "local_file",
      sourceLabel: name,
      columns: boundary.semanticSample.columns,
      rows: boundary.semanticSample.rows,
      sourceRowCount: boundary.sourceRowCount,
      sourceBoundary: boundary,
      userOverlay: overlay,
    });
    expect(rebuilt.status).toBe("valid");
    if (rebuilt.status !== "valid") return;
    expect(rebuilt.canonicalSource.grain.signature.structuralForm.value).not.toBe("unknown");
    expect(rebuilt.questionGeneration.actionCandidates.some((action) => action.metricId === "gross_profit")).toBe(true);
  });
  it("builds Accounting-only May/June gross-profit period partitions from Easy Mode evidence", async () => {
    resetCanonicalConsumerCacheForTests();
    const sourceNames = ["Accounting_ERP_May_2026.csv", "Accounting_ERP_June_2026.csv"];
    const sources = await Promise.all(sourceNames.map(async (name) => {
      const bytes = readFileSync(join(process.cwd(), "../..", "sample-corpus/anchors/1.3.0", name));
      const file = new File([bytes], name, { type: "text/csv" });
      const sourceCandidate = createFileSourceCandidate(file);
      if (!("rawUrl" in sourceCandidate)) throw new Error("local candidate required");
      const inspected = await inspectLocalFile(sourceCandidate);
      if (inspected.status !== "accessible") throw new Error(inspected.message);
      const selected = inspected.metadata;
      const boundary = createLocalCanonicalSourceBoundary({
        datasetId: name,
        columns: selected.columns ?? [],
        semanticRows: selected.semantic_rows ?? [],
        semanticSample: selected.semantic_sample,
        profile: selected.canonical_full_file_profile,
        file,
      });
      if (!boundary) throw new Error(`canonical boundary unavailable: ${name}`);
      const initial = getOrBuildCanonicalConsumerArtifact({
        datasetId: name,
        sourceKind: "local_file",
        sourceLabel: name,
        columns: boundary.semanticSample.columns,
        rows: boundary.semanticSample.rows,
        sourceRowCount: boundary.sourceRowCount,
        sourceBoundary: boundary,
      });
      if (initial.status !== "valid") throw new Error(initial.blockers.join(","));
      return {
        key: name,
        name,
        rowCount: boundary.sourceRowCount,
        columns: boundary.semanticSample.columns,
        boundary,
        candidates: projectCanonicalSourceCandidates(initial),
      };
    }));

    const perspective = projectCanonicalBusinessPerspectives(
      sources.map((source) => ({ key: source.key, candidates: source.candidates })),
      [],
    ).find((item) => item.perspectiveId === "profitability");
    expect(perspective).toMatchObject({
      sourceKeys: [...sourceNames].sort(),
      sourceRoles: ["accounting"],
      periods: ["2026-05", "2026-06"],
      capabilityIds: ["gross_profit"],
    });
    if (!perspective) throw new Error("profitability perspective required");
    const drafts = suggestedDeclarationsForPerspective(sources, perspective);

    const members = sources.map((source) => {
      const draft = drafts[source.key];
      if (!draft?.role || !draft.documentColumn || !draft.periodStart || !draft.periodEnd) {
        throw new Error(`governed declarations incomplete: ${source.name}`);
      }
      const monetaryColumns = draft.monetaryColumns.split(",").map((value) => value.trim()).filter(Boolean);
      let overlay = createCanonicalUserOverlay(source.boundary);
      overlay = appendCanonicalEvidenceDeclaration(overlay, source.boundary, { evidenceType: "source_role", value: { kind: "source_role", role: draft.role }, scope: { level: "source_file" } });
      overlay = appendCanonicalEvidenceDeclaration(overlay, source.boundary, { evidenceType: "document_identity", value: { kind: "document_identity", physicalColumn: draft.documentColumn }, scope: { level: "physical_column", physicalColumn: draft.documentColumn } });
      overlay = appendCanonicalEvidenceDeclaration(overlay, source.boundary, { evidenceType: "reporting_period", value: { kind: "reporting_period", start: draft.periodStart, end: draft.periodEnd }, scope: { level: "source_file" } });
      overlay = appendCanonicalEvidenceDeclaration(overlay, source.boundary, { evidenceType: "reporting_currency", value: { kind: "reporting_currency", currency: "VND", monetaryColumns }, scope: { level: "source_file" } });
      const rebuilt = getOrBuildCanonicalConsumerArtifact({
        datasetId: source.name,
        sourceKind: "local_file",
        sourceLabel: source.name,
        columns: source.boundary.semanticSample.columns,
        rows: source.boundary.semanticSample.rows,
        sourceRowCount: source.boundary.sourceRowCount,
        sourceBoundary: source.boundary,
        userOverlay: overlay,
      });
      if (rebuilt.status !== "valid") throw new Error(rebuilt.blockers.join(","));
      expect(rebuilt.questionGeneration.actionCandidates.some((action) => action.metricId === "gross_profit")).toBe(true);
      return { artifact: rebuilt, overlay };
    });

    const built = buildCanonicalPeriodPartitionWorkspace({
      workspaceId: "easy-accounting-profit-may-june-2026",
      metricId: "gross_profit",
      members,
    });
    expect(built.status).toBe("valid");
    if (built.status !== "valid") throw new Error(built.blockers.join(","));
    expect(built.workspace).toMatchObject({
      sourceRole: "accounting",
      metricId: "gross_profit",
      restrictions: expect.arrayContaining(["period_partitions_execute_independently", "no_cross_period_row_join"]),
    });
    expect(built.workspace.periodMembers.map((member) => member.period.label)).toEqual(["2026-05", "2026-06"]);
  }, 30_000);

});
