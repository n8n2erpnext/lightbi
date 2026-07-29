// @vitest-environment jsdom
import { createRequire } from "node:module";
import fs from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UnderstandingNextCard } from "../components/analysis/UnderstandingNextCard";
import { projectCanonicalArtifactToUnderstandingNext } from "./canonical-consumer-presentation-adapter";
import { projectCanonicalDomainPerspectives } from "./canonical-source-candidate-projection";
import { inspectLocalFile } from "./local-file-inspector";
import { createFileSourceCandidate } from "./source-preflight";
import { getOrBuildCanonicalConsumerArtifact, resetCanonicalConsumerCacheForTests } from "./understanding-core/canonical-consumer-boundary";
import { presentCanonicalConsumerArtifact } from "./understanding-core/canonical-consumer-presentation-contract";
import { createCanonicalSourceBoundary } from "./understanding-core/canonical-source-boundary";

createRequire(import.meta.url);
afterEach(cleanup);

async function artifactForFile(file: File) {
  const candidate = createFileSourceCandidate(file);
  if (!("rawUrl" in candidate)) throw new Error("local fixture required");
  const inspected = await inspectLocalFile(candidate);
  if (inspected.status !== "accessible") throw new Error(inspected.message);
  const metadata = inspected.metadata;
  const sheet = metadata.is_workbook && metadata.default_sheet && metadata.sheets
    ? metadata.sheets[metadata.default_sheet]
    : metadata;
  const sample = sheet.semantic_sample!;
  const boundary = createCanonicalSourceBoundary({
    datasetId: file.name,
    columns: sheet.columns!,
    semanticRows: sheet.semantic_rows!,
    semanticSample: { strategy: sample.strategy, sourceRowCount: sample.source_row_count, rowIndexes: sample.row_indexes },
    fullFileProfile: sheet.canonical_full_file_profile!,
    fullFileUnderstanding: sheet.canonical_full_file_profile!.fullFileUnderstanding,
    runtimeFiles: [{ file, sheetName: metadata.default_sheet ?? undefined }],
  });
  return getOrBuildCanonicalConsumerArtifact({
    datasetId: boundary.datasetId,
    sourceKind: "local_file",
    sourceLabel: file.name,
    columns: boundary.semanticSample.columns,
    rows: boundary.semanticSample.rows,
    sourceRowCount: boundary.sourceRowCount,
    sourceBoundary: boundary,
  });
}

async function productionFixture() {
  const relativePath = "sample-corpus/versions/1.4.0/fixtures/commerce-orders-synthetic.xlsx";
  const payload = fs.readFileSync(join(process.cwd(), "../..", relativePath));
  return artifactForFile(new File([payload], "commerce-orders-synthetic.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}

async function broadCommerceFixture() {
  const rows = Array.from({ length: 120 }, (_, index) => [
    `SO-${String(index + 1).padStart(4, "0")}`,
    `2026-0${(index % 6) + 1}-${String((index % 28) + 1).padStart(2, "0")}`,
    `Product ${(index % 8) + 1}`,
    String(1000 + index * 25),
    String((index % 5) + 1),
    "EA",
    `SHIP-${String(index + 1).padStart(4, "0")}`,
    index % 4 === 0 ? "Pending" : "Delivered",
  ].join(","));
  const csv = ["Order ID,Order Date,Product,Revenue,Sold Qty,UOM,Shipment ID,Delivery Status", ...rows].join("\n");
  return artifactForFile(new File([csv], "broad-commerce.csv", { type: "text/csv" }));
}

describe("Phase 8D production capability reachability", () => {
  it("projects full-source understanding without promoting representative evidence to truth", async () => {
    resetCanonicalConsumerCacheForTests();
    const artifact = await productionFixture();
    const presentation = presentCanonicalConsumerArtifact(artifact);
    expect(presentation.understanding?.source.profileScope).toBe("full");
    expect(presentation.understanding?.source.sourceRowCount).toBeGreaterThan(0);
    expect(presentation.understanding?.representativeEvidence.fullFileTruth).toBe(false);
    expect(presentation.understanding?.mappings).toHaveLength(presentation.understanding?.source.columnCount ?? 0);
    expect(presentation.understanding?.domainSupport.packId).toBe("commerce_distribution_mvp");
  });

  it("keeps governed non-default actions discoverable and operable", async () => {
    resetCanonicalConsumerCacheForTests();
    const artifact = await broadCommerceFixture();
    if (artifact.status !== "valid") throw new Error(artifact.blockers.join(","));
    const presentation = presentCanonicalConsumerArtifact(artifact);
    const understanding = projectCanonicalArtifactToUnderstandingNext(artifact);
    const additional = presentation.analyses.filter(item => item.state === "ready" && !item.advertisedAsDefault);
    expect(presentation.analyses.filter(item => item.advertisedAsDefault).length).toBeLessThanOrEqual(5);
    expect(additional.length, JSON.stringify(presentation.analyses.map(item => ({ id: item.questionId, state: item.state, default: item.advertisedAsDefault })))).toBeGreaterThan(0);
    const availableIds = new Set(understanding.availableActions.map(item => item.id));
    expect(additional.every(item => item.actionCandidateId && availableIds.has(item.actionCandidateId))).toBe(true);

    const select = vi.fn();
    const perspectives = projectCanonicalDomainPerspectives(artifact);
    const selectedPerspectiveId = additional[0].businessPerspectiveIds?.[0] ?? null;
    render(<UnderstandingNextCard understanding={understanding} canonicalPresentation={presentation} canonicalPerspectives={perspectives} selectedPerspectiveId={selectedPerspectiveId} onSelectAction={select} />);
    expect(screen.getByTestId("canonical-understanding-summary")).toBeTruthy();
    expect(screen.getByTestId("canonical-group-additional")).toBeTruthy();
    fireEvent.click(screen.getByTestId(`canonical-investigate-${additional[0].itemId}`));
    expect(select).toHaveBeenCalledTimes(1);
  });

  it("contains no known inert Home control or legacy Investigation executor", () => {
    const home = fs.readFileSync(join(process.cwd(), "src/pages/Home.tsx"), "utf8");
    const investigation = fs.readFileSync(join(process.cwd(), "src/pages/Investigation.tsx"), "utf8");
    const layout = fs.readFileSync(join(process.cwd(), "src/components/layout/AppLayout.tsx"), "utf8");
    const datasets = fs.readFileSync(join(process.cwd(), "src/pages/Datasets.tsx"), "utf8");
    const sources = fs.readFileSync(join(process.cwd(), "src/pages/DataSources.tsx"), "utf8");
    const settings = fs.readFileSync(join(process.cwd(), "src/pages/Settings.tsx"), "utf8");
    expect(home).not.toMatch(/onClick=\{\(\) => \{\}\}/);
    expect(investigation).not.toContain("executeBackendPreview(");
    expect(investigation).not.toContain("executeDuckDBPreviewRuntime(");
    expect(investigation).toContain("governed-result-context");
    expect(layout).toContain("Workspace alerts are not available in this Beta");
    expect(datasets).toContain("Dataset creation is not available in this Beta");
    expect(sources).toContain("Source editing is not available in this Beta");
    expect(settings).toContain("No license key or feature restriction during Beta");
  });
});
