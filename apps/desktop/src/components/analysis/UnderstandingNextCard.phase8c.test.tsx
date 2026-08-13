// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CanonicalDomainPerspectiveCandidateV1 } from "../../lib/canonical-source-candidate-projection";
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
const perspectivePresentation: CanonicalDatasetPresentationV1 = {
  ...presentation,
  analyses: presentation.analyses.map((item, index) => ({
    ...item,
    businessPerspectiveIds: index < 2 ? ["revenue"] : index === 2 ? ["inventory"] : ["performance"],
  })),
};
const canonicalPerspectives: CanonicalDomainPerspectiveCandidateV1[] = [
  { perspectiveId: "revenue", label: "Revenue", purpose: "Analyze revenue performance.", sourceId: "source:1", sourceArtifactId: "artifact:1", matchedSignalIds: ["revenue"], matchedPhysicalColumns: ["Revenue"], questionIds: ["q:revenue", "q:profit"], actionCandidateIds: ["action:revenue"], state: "governed_action_available", evidence: ["Revenue:revenue:confirmed"], blockers: [], provenance: "inferred_candidate" },
  { perspectiveId: "customer", label: "Customer", purpose: "Analyze customer behavior.", sourceId: "source:1", sourceArtifactId: "artifact:1", matchedSignalIds: ["customer"], matchedPhysicalColumns: ["Customer"], questionIds: [], actionCandidateIds: [], state: "recognized_only", evidence: ["Customer:customer:confirmed"], blockers: ["canonical_semantics_recognized_but_governed_question_policy_not_available"], provenance: "inferred_candidate" },
];

describe("UnderstandingNextCard Phase 8C functional states", () => {
  it("does not globally block a mixed-readiness dataset and exposes only governed operations", () => {
    const investigate = vi.fn();
    const remediate = vi.fn();
    render(<UnderstandingNextCard understanding={understanding} canonicalPresentation={perspectivePresentation} canonicalPerspectives={canonicalPerspectives} selectedPerspectiveId="revenue" onSelectAction={investigate} onRemediate={remediate} />);
    expect(screen.queryByText("Blocked Analysis")).toBeNull();
    expect(screen.getByTestId("canonical-count-ready").textContent).toContain("1");
    expect(screen.getByTestId("canonical-primary-analysis").textContent).toContain("Revenue");
    fireEvent.click(screen.getByTestId("canonical-analyze-perspective"));
    expect(investigate).toHaveBeenCalledWith(expect.objectContaining({ id: "action:revenue" }));
    expect(screen.getAllByRole("button", { name: "Investigate" })).toHaveLength(1);
    expect(screen.queryByTestId("canonical-analysis-q:unsafe")).toBeNull();
    expect(screen.queryByTestId("canonical-analysis-concept:forecast")).toBeNull();
    fireEvent.click(screen.getByTestId("canonical-remediate-q:profit-open_currency_declaration"));
    expect(remediate).toHaveBeenCalledWith(presentation.analyses[1].remediationOperations[0], "q:profit");
  });

  it("preserves evidence provenance and decision-use restrictions in details", () => {
    render(<UnderstandingNextCard understanding={understanding} canonicalPresentation={perspectivePresentation} canonicalPerspectives={canonicalPerspectives} selectedPerspectiveId="revenue" />);
    const article = screen.getByTestId("canonical-analysis-q:revenue");
    fireEvent.click(article.querySelector("summary")!);
    expect(article.textContent).toContain("canonical_artifact");
    expect(article.textContent).toContain("Review evidence before deciding.");
  });

  it("keeps raw source identity out of the primary blocker card", () => {
    render(<UnderstandingNextCard understanding={understanding} canonicalPresentation={perspectivePresentation} canonicalPerspectives={canonicalPerspectives} selectedPerspectiveId="revenue" />);
    const article = screen.getByTestId("canonical-analysis-q:profit");
    expect(article.textContent).toContain("Scope: Current source");
    expect(article.textContent).not.toContain("Scope: source:1");
  });

  it("keeps execution failure separate from safety and unsupported states", () => {
    const failed: CanonicalDatasetPresentationV1 = {
      ...perspectivePresentation,
      counts: { ...perspectivePresentation.counts, ready: 0, execution_failed: 1 },
      analyses: [{
        ...perspectivePresentation.analyses[0],
        itemId: "q:failed",
        questionId: "q:failed",
        state: "execution_failed",
        executionReadiness: "not_executable",
        advertisedAsDefault: false,
      }],
    };
    render(<UnderstandingNextCard understanding={understanding} canonicalPresentation={failed} canonicalPerspectives={canonicalPerspectives} selectedPerspectiveId="revenue" />);
    expect(screen.getByTestId("canonical-group-execution-failed")).toBeTruthy();
    expect(screen.queryByTestId("canonical-group-blocked")).toBeNull();
    expect(screen.queryByTestId("canonical-group-unsupported")).toBeNull();
  });

  it("requires a perspective and keeps recognized-only evidence non-interactive", () => {
    const select = vi.fn();
    const { rerender } = render(<UnderstandingNextCard understanding={understanding} canonicalPresentation={perspectivePresentation} canonicalPerspectives={canonicalPerspectives} onSelectPerspective={select} />);
    expect(screen.getByTestId("canonical-select-perspective-prompt")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Investigate" })).toBeNull();
    expect(screen.getByTestId("business-evidence-customer").textContent).toContain("not enough evidence");
    fireEvent.click(screen.getByTestId("business-perspective-customer"));
    expect(select).not.toHaveBeenCalled();
    rerender(<UnderstandingNextCard understanding={understanding} canonicalPresentation={perspectivePresentation} canonicalPerspectives={canonicalPerspectives} selectedPerspectiveId={null} onSelectPerspective={select} />);
    expect(screen.queryByRole("button", { name: "Investigate" })).toBeNull();
  });

  it("recommends exactly one ready perspective and labels recognized-only evidence honestly", () => {
    const twoReady = [
      canonicalPerspectives[0],
      { ...canonicalPerspectives[0], perspectiveId: "operations", label: "Operations" },
      canonicalPerspectives[1],
    ] as CanonicalDomainPerspectiveCandidateV1[];
    render(<UnderstandingNextCard understanding={understanding} canonicalPresentation={perspectivePresentation} canonicalPerspectives={twoReady} />);
    expect(screen.getAllByText("Recommended")).toHaveLength(1);
    expect(screen.getByTestId("business-evidence-customer").textContent).toContain("not enough evidence");
  });
});
