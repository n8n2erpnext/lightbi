import {
  projectCanonicalBusinessPerspectives,
  type CanonicalBusinessPerspectiveCandidateV1,
  type CanonicalSourceCandidateProjectionV1,
  type GovernedBundleCandidateV1,
} from "../canonical-source-candidate-projection";
import type { CanonicalSourceRoleV1 } from "./canonical-multisource-boundary";

export type CollectionSourceInputV1 = {
  key: string;
  name: string;
  rowCount: number;
  columns?: string[];
  candidates: CanonicalSourceCandidateProjectionV1 | null;
};

export type ReportingPeriodScopeV1 =
  | { mode: "single"; periodId: string }
  | { mode: "compare"; baselinePeriodId: string; comparisonPeriodId: string }
  | { mode: "trend"; periodIds: string[] };

export type CollectionSourceDeclarationV1 = {
  selected: boolean;
  role: CanonicalSourceRoleV1 | "";
  documentColumn: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  monetaryColumns: string;
};

export type DatasetCollectionUnderstandingArtifactV1 = {
  schemaVersion: "lightbi.dataset-collection-understanding.v1";
  sourceCount: number;
  totalRows: number;
  roles: CanonicalSourceRoleV1[];
  observedPeriods: string[];
  sharedDocumentCandidates: string[];
  workflow: "order_to_cash_and_delivery" | "period_partition" | "multi_source_business_evidence" | "unresolved";
  perspectives: CanonicalBusinessPerspectiveCandidateV1[];
  defaultPerspectiveId: CanonicalBusinessPerspectiveCandidateV1["perspectiveId"] | null;
  defaultPeriodScope: ReportingPeriodScopeV1 | null;
  ambiguities: string[];
};

export type PerspectiveAnalysisPlanV1 = {
  schemaVersion: "lightbi.perspective-analysis-plan.v1";
  perspectiveId: CanonicalBusinessPerspectiveCandidateV1["perspectiveId"];
  sourceKeys: string[];
  periodScope: ReportingPeriodScopeV1 | null;
  capabilityIds: string[];
  businessQuestions: string[];
  chartIntents: Array<"kpi" | "trend" | "ranking" | "status" | "evidence">;
  readiness: "ready" | "partial" | "blocked";
  blockers: string[];
};

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function periodId(candidate: CanonicalSourceCandidateProjectionV1 | null): string | null {
  const period = candidate?.reportingPeriodCandidates[0]?.value;
  if (!period) return null;
  const start = period.start.slice(0, 7);
  const end = period.end.slice(0, 7);
  return start === end ? start : `${period.start}/${period.end}`;
}

function defaultPeriodScope(periods: string[]): ReportingPeriodScopeV1 | null {
  if (periods.length === 0) return null;
  if (periods.length === 1) return { mode: "single", periodId: periods[0] };
  if (periods.length === 2) return { mode: "compare", baselinePeriodId: periods[0], comparisonPeriodId: periods[1] };
  return { mode: "trend", periodIds: periods };
}

function sharedDocumentCandidates(sources: CollectionSourceInputV1[]): string[] {
  if (sources.length < 2) return [];
  const sets = sources.map((source) => new Set(
    [
      ...(source.candidates?.documentIdentityCandidates ?? [])
        .filter((candidate) => candidate.confidence >= 0.7)
        .map((candidate) => candidate.value.physicalColumn),
      ...(source.columns ?? []).filter((column) => {
        const compact = column.trim().toLowerCase().replaceAll(/[^a-z0-9]/g, "");
        return /^(order|document|transaction)(id|no|number|code)$/.test(compact);
      }),
    ].map((column) => column.trim().toLowerCase()),
  ));
  const population = unique(sets.flatMap((set) => [...set]));
  const score = (column: string) => {
    const compact = column.replaceAll(/[^a-z0-9]/g, "");
    if (compact === "orderid") return 100;
    if (compact.startsWith("order")) return 90;
    if (compact.startsWith("document")) return 80;
    if (compact.startsWith("transaction")) return 70;
    return 0;
  };
  return population
    .filter((column) => sets.filter((set) => set.has(column)).length >= 2)
    .sort((left, right) => score(right) - score(left) || left.localeCompare(right));
}

export function buildDatasetCollectionUnderstanding(
  sources: CollectionSourceInputV1[],
  bundles: GovernedBundleCandidateV1[],
): DatasetCollectionUnderstandingArtifactV1 {
  const perspectives = projectCanonicalBusinessPerspectives(
    sources.map((source) => ({ key: source.key, candidates: source.candidates })),
    bundles,
  );
  const roles = unique(sources.flatMap((source) => {
    const role = source.candidates?.roleCandidates[0];
    return role && role.confidence >= 0.7 ? [role.value] : [];
  })).sort() as CanonicalSourceRoleV1[];
  const periods = unique(sources.flatMap((source) => {
    const value = periodId(source.candidates);
    return value ? [value] : [];
  })).sort();
  const sharedDocuments = sharedDocumentCandidates(sources);
  const hasOrderWorkflow = ["sales", "accounting", "logistics"].every((role) => roles.includes(role as CanonicalSourceRoleV1));
  const workflow: DatasetCollectionUnderstandingArtifactV1["workflow"] = hasOrderWorkflow && sharedDocuments.length > 0
    ? "order_to_cash_and_delivery"
    : periods.length > 1 && roles.length === 1
      ? "period_partition"
      : roles.length > 0
        ? "multi_source_business_evidence"
        : "unresolved";
  const ambiguities: string[] = [];
  sources.forEach((source) => {
    const candidates = source.candidates;
    if (!candidates?.roleCandidates[0] || candidates.roleCandidates[0].confidence < 0.7) ambiguities.push(`source_role:${source.key}`);
    if (!candidates?.reportingPeriodCandidates[0] && sources.length > 1) ambiguities.push(`reporting_period:${source.key}`);
  });
  if (hasOrderWorkflow && sharedDocuments.length === 0) ambiguities.push("shared_document_identity");
  const recommended = perspectives.find((perspective) => perspective.recommended && perspective.perspectiveId !== "period_comparison")
    ?? perspectives.find((perspective) => perspective.perspectiveId !== "data_trust")
    ?? null;
  return {
    schemaVersion: "lightbi.dataset-collection-understanding.v1",
    sourceCount: sources.length,
    totalRows: sources.reduce((sum, source) => sum + source.rowCount, 0),
    roles,
    observedPeriods: periods,
    sharedDocumentCandidates: sharedDocuments,
    workflow,
    perspectives,
    defaultPerspectiveId: recommended?.perspectiveId ?? null,
    defaultPeriodScope: defaultPeriodScope(periods),
    ambiguities: unique(ambiguities).sort(),
  };
}

export function suggestedDeclarationsForPerspective(
  sources: CollectionSourceInputV1[],
  perspective: CanonicalBusinessPerspectiveCandidateV1,
): Record<string, CollectionSourceDeclarationV1> {
  const selectedKeys = new Set(perspective.sourceKeys);
  const sharedDocuments = sharedDocumentCandidates(sources.filter((source) => selectedKeys.has(source.key)));
  return Object.fromEntries(sources.map((source) => {
    const candidates = source.candidates;
    const role = candidates?.roleCandidates[0];
    const period = candidates?.reportingPeriodCandidates[0];
    const preferredSharedDocument = sharedDocuments[0] ?? null;
    const sharedDocument = candidates?.documentIdentityCandidates.find((candidate) =>
      candidate.value.physicalColumn.trim().toLowerCase() === preferredSharedDocument);
    const document = sharedDocument ?? candidates?.documentIdentityCandidates[0];
    const structuralDocument = (source.columns ?? []).find((column) =>
      column.trim().toLowerCase() === preferredSharedDocument);
    const currency = candidates?.observedCurrencyCandidates[0];
    return [source.key, {
      selected: selectedKeys.has(source.key),
      role: role && role.confidence >= 0.7 ? role.value : "",
      documentColumn: sharedDocument && sharedDocument.confidence >= 0.7
        ? sharedDocument.value.physicalColumn
        : structuralDocument ?? (document && document.confidence >= 0.7 ? document.value.physicalColumn : ""),
      periodStart: period && period.confidence >= 0.7 ? period.value.start : "",
      periodEnd: period && period.confidence >= 0.7 ? period.value.end : "",
      currency: currency && currency.confidence >= 0.7 ? currency.value.currency : "",
      monetaryColumns: (candidates?.monetaryColumnCandidates ?? [])
        .filter((candidate) => candidate.confidence >= 0.7)
        .map((candidate) => candidate.value.physicalColumn)
        .join(", "),
    } satisfies CollectionSourceDeclarationV1];
  }));
}

export function createPerspectiveAnalysisPlan(
  collection: DatasetCollectionUnderstandingArtifactV1,
  perspectiveId: CanonicalBusinessPerspectiveCandidateV1["perspectiveId"],
  periodScope: ReportingPeriodScopeV1 | null = collection.defaultPeriodScope,
): PerspectiveAnalysisPlanV1 {
  const perspective = collection.perspectives.find((item) => item.perspectiveId === perspectiveId);
  if (!perspective) {
    return {
      schemaVersion: "lightbi.perspective-analysis-plan.v1",
      perspectiveId,
      sourceKeys: [],
      periodScope,
      capabilityIds: [],
      businessQuestions: [],
      chartIntents: ["evidence"],
      readiness: "blocked",
      blockers: ["perspective_not_available"],
    };
  }
  const readiness = perspective.state === "not_yet_executable"
    ? "blocked"
    : perspective.state === "partial"
      ? "partial"
      : "ready";
  const chartIntents: PerspectiveAnalysisPlanV1["chartIntents"] = perspective.perspectiveId === "data_trust"
    ? ["evidence"]
    : unique([
      "kpi",
      ...(collection.observedPeriods.length > 1 ? ["trend" as const] : []),
      ...(perspective.perspectiveId === "fulfillment_operations" ? ["status" as const] : ["ranking" as const]),
      "evidence",
    ]);
  return {
    schemaVersion: "lightbi.perspective-analysis-plan.v1",
    perspectiveId,
    sourceKeys: perspective.sourceKeys,
    periodScope,
    capabilityIds: perspective.capabilityIds,
    businessQuestions: [perspective.businessQuestion],
    chartIntents,
    readiness,
    blockers: perspective.blockers,
  };
}
