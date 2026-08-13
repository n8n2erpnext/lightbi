// @vitest-environment jsdom
import fs from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CanonicalMultiSourceReview, type MultiSourceDraftV1 } from "../../components/analysis/CanonicalMultiSourceReview";
import { presentCanonicalMultiSourceRelationship } from "./canonical-consumer-presentation-contract";
import type { CanonicalSourceCandidateProjectionV1 } from "../canonical-source-candidate-projection";
import { useDisplayPreferences } from "../../stores/display-preferences-store";

afterEach(cleanup);
beforeEach(() => useDisplayPreferences.getState().resetPreferences());

const sources = [
  { key: "0:a.xlsx", name: "a.xlsx", rowCount: 1500, columns: ["OrderID", "Revenue"] },
  { key: "1:b.csv", name: "b.csv", rowCount: 1500, columns: ["OrderID", "Revenue_Credit", "COGS_Debit"] },
];
const empty = (): MultiSourceDraftV1 => ({ selected: true, role: "", documentColumn: "", periodStart: "", periodEnd: "", currency: "", monetaryColumns: "" });

const salesCandidates = (observedCurrency?: string): CanonicalSourceCandidateProjectionV1 => {
  const base = { sourceId: "sales", sourceFingerprint: "hash-sales", sourceArtifactId: "artifact-sales" };
  const candidate = <T,>(candidateId: string, value: T) => ({ candidateId, value, ...base, scope: { level: "source_file" as const, physicalColumn: null }, supportingEvidence: ["canonical"], contradictingEvidence: [], confidence: 0.94, provenance: "inferred_candidate" as const });
  return {
    schemaVersion: "lightbi.canonical-source-candidate-projection.v1",
    ...base,
    roleCandidates: [candidate("role-sales", "sales" as const)],
    documentIdentityCandidates: [candidate("document-sales", { physicalColumn: "OrderID", canonicalSignal: "order" })],
    reportingPeriodCandidates: [candidate("period-sales", { start: "2026-05-01", end: "2026-05-31", physicalColumn: "OrderDate" })],
    monetaryColumnCandidates: [candidate("money-sales", { physicalColumn: "Revenue", canonicalSignal: "revenue" })],
    observedCurrencyCandidates: observedCurrency ? [candidate("currency-sales", { currency: observedCurrency, physicalColumn: "Currency" })] : [],
  };
};

describe("Phase 8D.1 production multi-source UI flow", () => {
  it("uses the Settings currency automatically and asks only when source evidence conflicts", () => {
    useDisplayPreferences.getState().updatePreferences({ currencyCode: "VND" });
    const analyze = vi.fn();
    const source = [{ key: "sales", name: "sales.xlsx", rowCount: 100, columns: ["OrderID", "OrderDate", "Revenue"], candidates: salesCandidates() }];
    const view = render(<CanonicalMultiSourceReview sources={source} drafts={{ sales: empty() }} onChange={() => {}} onBuild={() => {}} onAnalyzePerspective={analyze} building={false} />);
    expect(screen.queryByLabelText("Reporting currency")).toBeNull();
    expect(screen.getByText("Using VND from Settings.")).toBeTruthy();
    fireEvent.click(screen.getByTestId("analyze-selected-perspective"));
    expect(analyze).toHaveBeenCalledWith(expect.anything(), expect.anything(), { currency: "VND" });

    view.rerender(<CanonicalMultiSourceReview sources={[{ ...source[0], candidates: salesCandidates("USD") }]} drafts={{ sales: empty() }} onChange={() => {}} onBuild={() => {}} onAnalyzePerspective={analyze} building={false} />);
    expect(screen.getByLabelText("Reporting currency")).toBeTruthy();
  });

  it("keeps technical corrections optional in Easy Mode without filename inference", () => {
    const onChange = vi.fn();
    const onBuild = vi.fn();
    const view = render(<CanonicalMultiSourceReview sources={sources} drafts={{ "0:a.xlsx": empty(), "1:b.csv": empty() }} onChange={onChange} onBuild={onBuild} building={false} />);
    expect(screen.getByTestId("business-perspective-data_trust").getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByTestId("business-perspective-data_trust"));
    expect(screen.getByTestId("business-perspective-data_trust").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Review technical evidence")).toBeTruthy();
    expect(screen.getByText("Optional. Use this only when LightBI asks for a clarification.")).toBeTruthy();
    const roleSelectors = screen.getAllByRole("combobox") as HTMLSelectElement[];
    expect(roleSelectors).toHaveLength(2);
    expect(roleSelectors[0].value).toBe("");
    expect(roleSelectors[1].value).toBe("");
    fireEvent.change(roleSelectors[0], { target: { value: "sales" } });
    expect(onChange).toHaveBeenCalledWith("0:a.xlsx", expect.objectContaining({ role: "sales" }));
    view.rerender(<CanonicalMultiSourceReview sources={sources} drafts={{ "0:a.xlsx": { ...empty(), role: "sales" }, "1:b.csv": { ...empty(), role: "accounting" } }} onChange={onChange} onBuild={onBuild} building={false} />);
    expect(screen.getByTestId("analyze-selected-perspective").hasAttribute("disabled")).toBe(true);
    expect(onBuild).not.toHaveBeenCalled();
  });

  it("keeps the production handoff canonical-only and legacy fusion non-actionable", () => {
    const home = fs.readFileSync(join(process.cwd(), "src/pages/Home.tsx"), "utf8");
    const investigation = fs.readFileSync(join(process.cwd(), "src/pages/Investigation.tsx"), "utf8");
    expect(home).toContain("buildCanonicalMultiSourceDataset");
    expect(home).toContain("prepareCanonicalMultiSourceInvestigationHandoff");
    expect(home).not.toContain("onUseFusedDataset={handleUseBusinessFusionDataset}");
    expect(home).not.toContain("createBusinessFusionVirtualDataset");
    expect(home).not.toContain("BusinessViewReviewStep");
    expect(investigation).toContain("executeCanonicalMultiSourceMetric");
    expect(investigation).not.toContain("executeBackendPreview(");
    expect(investigation).not.toContain("executeDuckDBPreviewRuntime(");
  });

  it("exposes the versioned relationship presentation adapter", () => {
    expect(typeof presentCanonicalMultiSourceRelationship).toBe("function");
  });

  it("persists only source-bound declarations and requires relationship rebuild after reload", () => {
    const persistence = fs.readFileSync(join(process.cwd(), "src/lib/home-workspace-persistence.ts"), "utf8");
    const sessions = fs.readFileSync(join(process.cwd(), "src/hooks/useHomeWorkspaceSessions.ts"), "utf8");
    expect(persistence).toContain("canonicalMultiSourcePersistence");
    expect(persistence).toContain("executableRestored: false");
    expect(sessions).toContain("Rebuild the relationship before analysis; prior executable handoffs remain invalid.");
    expect(sessions).toContain("Legacy fused sessions are production-ineligible");
  });
});
