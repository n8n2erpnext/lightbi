// @vitest-environment jsdom
import fs from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CanonicalMultiSourceReview, type MultiSourceDraftV1 } from "../../components/analysis/CanonicalMultiSourceReview";
import { presentCanonicalMultiSourceRelationship } from "./canonical-consumer-presentation-contract";

afterEach(cleanup);

const sources = [
  { key: "0:a.xlsx", name: "a.xlsx", rowCount: 1500, columns: ["OrderID", "Revenue"] },
  { key: "1:b.csv", name: "b.csv", rowCount: 1500, columns: ["OrderID", "Revenue_Credit", "COGS_Debit"] },
];
const empty = (): MultiSourceDraftV1 => ({ selected: true, role: "", documentColumn: "", periodStart: "", periodEnd: "", currency: "", monetaryColumns: "" });

describe("Phase 8D.1 production multi-source UI flow", () => {
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
