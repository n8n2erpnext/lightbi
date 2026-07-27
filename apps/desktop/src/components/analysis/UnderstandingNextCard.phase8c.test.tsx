// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CanonicalDatasetPresentationV1 } from "../../lib/understanding-core/canonical-consumer-presentation-contract";
import type { DatasetUnderstandingResult } from "../../lib/understanding-next/contracts";
import { UnderstandingNextCard } from "./UnderstandingNextCard";

afterEach(cleanup);

const understanding: DatasetUnderstandingResult = {
  source: { fileNames: ["sales.csv"], sheetNames: [], sourceRowCount: 2, sourceColumnCount: 2, parsedRowCount: 2, sampleRowCount: 2 },
  quality: { headerStatus: "clean", dirtySignals: [], blockedReasons: ["currency_basis_not_explicit"] },
  profile: { grain: "transaction", documentType: "generic_table", detectedDomains: ["revenue"] },
  columns: [], signals: [], stakeholderFits: [], lenses: [], perspectives: [], recommendedQuestions: [],
  availableActions: [{ id: "action:revenue", questionId: "q:revenue", label: "Revenue", actionKind: "group_by", dimensions: ["product"], measures: ["revenue"], executionScope: "full_local_file" }],
  unavailableActions: [],
};

const presentation: CanonicalDatasetPresentationV1 = {
  schemaVersion: "lightbi.canonical-consumer-presentation.v1",
  artifactIdentity: "artifact:1", overlayIdentity: null, datasetStateIdentity: "dataset:1", sourceId: "source:1", datasetState: "understood", datasetBlockers: [], prohibitedUses: ["DECISION_USE_PROHIBITED"],
  counts: { ready: 1, needs_user_evidence: 1, needs_mapping_review: 0, blocked_safety: 1, unsupported_mvp: 1, stale: 0, executing: 0, execution_failed: 0, completed: 0 }, understanding: null,
  analyses: [
    { itemId: "q:revenue", questionId: "q:revenue", actionCandidateId: "action:revenue", metricId: "revenue", title: "Revenue", description: "Revenue by product", state: "ready", m1State: "ready", m2State: "ready", m3State: "executable", executionReadiness: "executable", primaryBlocker: null, secondaryBlockers: [], limitations: [], remediationOperations: [], physicalColumns: ["Revenue"], canonicalSignals: ["revenue"], sourceId: "source:1", sheetOrTable: null, evidence: [{ evidenceId: "e:revenue", references: ["Revenue"], provenance: "canonical_artifact" }], decisionUseRestrictions: [{ code: "DECISION_USE_PROHIBITED", reason: "Review evidence before deciding.", severity: "critical" }], artifactIdentity: "artifact:1", overlayIdentity: null, advertisedAsDefault: true, rank: 1 },
    { itemId: "q:profit", questionId: "q:profit", actionCandidateId: null, metricId: "gross_profit", title: "Gross profit", description: "Gross profit overview", state: "needs_user_evidence", m1State: "conditional", m2State: "conditional", m3State: "unavailable", executionReadiness: "not_executable", primaryBlocker: { code: "currency_basis_not_explicit", message: "Confirm reporting currency.", severity: "material", scope: "source", source: "metric_preflight", references: ["source:1"], limitations: ["currency_basis_not_explicit"], remediationOperations: [], evidenceReferences: [] }, secondaryBlockers: [], limitations: [], remediationOperations: [{ operationId: "currency:source:1", kind: "open_currency_declaration", label: "Provide reporting currency", sourceId: "source:1", sheetOrTable: null, physicalColumn: "Revenue", canonicalSignal: "revenue", remediationCode: "confirm_currency" }], physicalColumns: ["Revenue"], canonicalSignals: ["revenue"], sourceId: "source:1", sheetOrTable: null, evidence: [], decisionUseRestrictions: [], artifactIdentity: "artifact:1", overlayIdentity: null, advertisedAsDefault: false, rank: null },
    { itemId: "q:unsafe", questionId: "q:unsafe", actionCandidateId: null, metricId: "inventory_on_hand", title: "Inventory", description: "Snapshot inventory", state: "blocked_safety", m1State: "blocked", m2State: "blocked", m3State: "blocked", executionReadiness: "not_executable", primaryBlocker: { code: "metric_grain_incompatible", message: "The row grain is unsafe.", severity: "critical", scope: "metric", source: "metric_preflight", references: [], limitations: [], remediationOperations: [], evidenceReferences: [] }, secondaryBlockers: [], limitations: [], remediationOperations: [], physicalColumns: [], canonicalSignals: ["stock_qty"], sourceId: "source:1", sheetOrTable: null, evidence: [], decisionUseRestrictions: [], artifactIdentity: "artifact:1", overlayIdentity: null, advertisedAsDefault: false, rank: null },
    { itemId: "concept:forecast", questionId: "concept:forecast", actionCandidateId: null, metricId: "forecast", title: "Forecast", description: "Not in MVP", state: "unsupported_mvp", m1State: "unsupported", m2State: "not_generated", m3State: "unavailable", executionReadiness: "not_executable", primaryBlocker: { code: "unsupported_mvp", message: "Not supported in the current MVP.", severity: "material", scope: "capability", source: "domain_activation", references: [], limitations: [], remediationOperations: [], evidenceReferences: [] }, secondaryBlockers: [], limitations: [], remediationOperations: [], physicalColumns: [], canonicalSignals: ["forecast"], sourceId: "source:1", sheetOrTable: null, evidence: [], decisionUseRestrictions: [], artifactIdentity: "artifact:1", overlayIdentity: null, advertisedAsDefault: false, rank: null },
  ],
};

describe("UnderstandingNextCard Phase 8C functional states", () => {
  it("does not globally block a mixed-readiness dataset and exposes only governed operations", () => {
    const investigate = vi.fn();
    const remediate = vi.fn();
    render(<UnderstandingNextCard understanding={understanding} canonicalPresentation={presentation} onSelectAction={investigate} onRemediate={remediate} />);
    expect(screen.queryByText("Blocked Analysis")).toBeNull();
    expect(screen.getByTestId("canonical-count-ready").textContent).toContain("1");
    expect(screen.getAllByRole("button", { name: "Investigate" })).toHaveLength(1);
    expect(screen.getByTestId("canonical-analysis-q:unsafe").querySelector("button")).toBeNull();
    expect(screen.getByTestId("canonical-analysis-concept:forecast").querySelector("button")).toBeNull();
    fireEvent.click(screen.getByTestId("canonical-remediate-q:profit-open_currency_declaration"));
    expect(remediate).toHaveBeenCalledWith(presentation.analyses[1].remediationOperations[0], "q:profit");
  });

  it("preserves evidence provenance and decision-use restrictions in details", () => {
    render(<UnderstandingNextCard understanding={understanding} canonicalPresentation={presentation} />);
    const article = screen.getByTestId("canonical-analysis-q:revenue");
    fireEvent.click(article.querySelector("summary")!);
    expect(article.textContent).toContain("canonical_artifact");
    expect(article.textContent).toContain("Review evidence before deciding.");
  });

  it("keeps execution failure separate from safety and unsupported states", () => {
    const failed: CanonicalDatasetPresentationV1 = {
      ...presentation,
      counts: { ...presentation.counts, ready: 0, execution_failed: 1 },
      analyses: [{
        ...presentation.analyses[0],
        itemId: "q:failed",
        questionId: "q:failed",
        state: "execution_failed",
        executionReadiness: "not_executable",
        advertisedAsDefault: false,
      }],
    };
    render(<UnderstandingNextCard understanding={understanding} canonicalPresentation={failed} />);
    expect(screen.getByTestId("canonical-group-execution-failed")).toBeTruthy();
    expect(screen.queryByTestId("canonical-group-blocked")).toBeNull();
    expect(screen.queryByTestId("canonical-group-unsupported")).toBeNull();
  });
});
