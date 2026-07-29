import type { CanonicalConsumerBuildResultV1 } from "./understanding-core/canonical-consumer-boundary";
import type { CanonicalSourceRoleV1 } from "./understanding-core/canonical-multisource-boundary";
import { listDomainCatalogs, type DomainId } from "./domain-knowledge-catalog";
import { SEMANTIC_SIGNAL_BY_ID } from "./semantic-registry";

type ValidArtifact = Extract<CanonicalConsumerBuildResultV1, { status: "valid" }>;

export type CanonicalCandidateProvenanceV1 = "inferred_candidate";

export type CanonicalEvidenceCandidateV1<T> = {
  candidateId: string;
  value: T;
  sourceId: string;
  sourceFingerprint: string;
  sourceArtifactId: string;
  scope: { level: "source_file" | "physical_column"; physicalColumn: string | null };
  supportingEvidence: string[];
  contradictingEvidence: string[];
  confidence: number;
  provenance: CanonicalCandidateProvenanceV1;
};

export type CanonicalSourceCandidateProjectionV1 = {
  schemaVersion: "lightbi.canonical-source-candidate-projection.v1";
  sourceId: string;
  sourceFingerprint: string;
  sourceArtifactId: string;
  roleCandidates: Array<CanonicalEvidenceCandidateV1<CanonicalSourceRoleV1>>;
  documentIdentityCandidates: Array<CanonicalEvidenceCandidateV1<{ physicalColumn: string; canonicalSignal: string }>>;
  reportingPeriodCandidates: Array<CanonicalEvidenceCandidateV1<{ start: string; end: string; physicalColumn: string }>>;
  monetaryColumnCandidates: Array<CanonicalEvidenceCandidateV1<{ physicalColumn: string; canonicalSignal: string }>>;
  observedCurrencyCandidates: Array<CanonicalEvidenceCandidateV1<{ currency: string; physicalColumn: string }>>;
};

export type GovernedBundleCandidateV1 = {
  bundleId: string;
  kind: "gross_profit_period" | "revenue_period_comparison" | "delivery_period_comparison" | "delivery_source_local";
  purpose: string;
  sourceKeys: string[];
  period: string | null;
  state: "needs_confirmation" | "unsupported_current_mvp";
  requiredEvidence: string[];
  relationshipState: "candidate_not_confirmed" | "period_partition_candidate" | "source_local" | "unsupported_current_mvp";
  analyses: string[];
};

export type CanonicalBusinessPerspectiveIdV1 =
  | "executive_overview"
  | "sales_performance"
  | "profitability"
  | "finance_accounting"
  | "fulfillment_operations"
  | "order_journey"
  | "period_comparison"
  | "data_trust";

export type CanonicalBusinessPerspectiveCandidateV1 = {
  perspectiveId: CanonicalBusinessPerspectiveIdV1;
  label: string;
  businessQuestion: string;
  purpose: string;
  sourceKeys: string[];
  sourceRoles: CanonicalSourceRoleV1[];
  periods: string[];
  bundleKinds: GovernedBundleCandidateV1["kind"][];
  capabilityIds: string[];
  state: "reviewable" | "needs_evidence" | "partial" | "not_yet_executable";
  blockers: string[];
  evidence: string[];
  recommended: boolean;
};

export type CanonicalDomainPerspectiveCandidateV1 = {
  perspectiveId: DomainId;
  label: string;
  purpose: string;
  sourceId: string;
  sourceArtifactId: string;
  matchedSignalIds: string[];
  matchedPhysicalColumns: string[];
  questionIds: string[];
  actionCandidateIds: string[];
  state: "recognized_only" | "governed_questions_available" | "governed_action_available";
  evidence: string[];
  blockers: string[];
  provenance: CanonicalCandidateProvenanceV1;
};

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

const ROLE_SIGNALS: Record<CanonicalSourceRoleV1, Record<string, number>> = {
  sales: {
    revenue: 2, net_revenue: 2, order: 2, salesperson: 2, customer: 1,
    product: 1, sku: 1, payment_method: 1, quantity: 1, sold_qty: 1,
  },
  accounting: {
    gross_profit: 4, total_cost: 3, cost: 3, invoice_total: 3, invoice: 2,
    journal: 3, receivable: 3, payable: 3, debit: 2, credit: 2, revenue: 1,
  },
  logistics: {
    shipment: 3, delivery_status: 3, delivery_fee: 3, carrier: 3, vehicle: 3,
    driver: 2, route: 2, warehouse: 1, delivered_qty: 2,
  },
  inventory_snapshot: {
    stock_qty: 3, inventory: 3, warehouse: 2, sku: 2, uom: 1, stock_status: 2,
  },
  inventory_movement: {
    movement_qty: 3, received_qty: 2, issued_qty: 2, warehouse: 2, sku: 2,
  },
  unknown_other: {},
};

const DOCUMENT_SIGNALS = new Set(["order", "shipment", "invoice", "journal", "receipt", "purchase_order"]);
const TIME_SIGNALS = new Set(["time_period", "transaction_date", "order_date", "report_date", "delivery_date", "posting_date"]);
const MONEY_SIGNALS = new Set([
  "revenue", "net_revenue", "invoice_total", "gross_profit", "cost", "total_cost",
  "delivery_fee", "receivable", "payable", "debit", "credit", "cod_amount",
]);
const ALLOWED_RESOLUTION_STATES = new Set(["confirmed", "probable"]);

function confidenceForState(state: string): number {
  return state === "confirmed" ? 1 : state === "probable" ? 0.78 : 0;
}

/**
 * Downstream, non-authoritative projection of canonical semantic mappings.
 * It never detects raw fields, activates a domain pack, or authorizes runtime.
 */
export function projectCanonicalDomainPerspectives(
  artifact: CanonicalConsumerBuildResultV1,
): CanonicalDomainPerspectiveCandidateV1[] {
  if (artifact.status !== "valid") return [];
  const sourceId = artifact.canonicalSource.semantic.sourceId;
  const selected = artifact.canonicalSource.semantic.columns
    .filter((column) => column.selectedCandidateId && ALLOWED_RESOLUTION_STATES.has(column.finalState));
  const actionByQuestion = new Map(
    artifact.questionGeneration.actionCandidates.map((action) => [action.questionId, action]),
  );
  const metricById = new Map(
    artifact.metricPreflight.metrics.map((metric) => [metric.metricId, metric]),
  );
  const stateOrder = {
    governed_action_available: 0,
    governed_questions_available: 1,
    recognized_only: 2,
  } as const;

  return listDomainCatalogs().flatMap((catalog): CanonicalDomainPerspectiveCandidateV1[] => {
    const matches = selected.filter((column) =>
      SEMANTIC_SIGNAL_BY_ID.get(column.selectedCandidateId!)?.domains.includes(catalog.id));
    if (matches.length === 0) return [];
    const questions = artifact.questionGeneration.candidateQuestions
      .filter((question) => {
        if (!question.businessPerspectiveIds.includes(catalog.id) || !question.metricDefinitionAvailable) return false;
        if (["ready", "conditionally_ready"].includes(question.questionState) && question.blockers.length === 0) return true;
        const metric = metricById.get(question.metricId);
        return metric?.semanticRequirementsSatisfied === true
          && !question.blockers.some((item) =>
            item.code.startsWith("missing_required_dimension:")
            || item.code === "missing_compatible_time_dimension");
      });
    const actions = questions.flatMap((question) => {
      const action = actionByQuestion.get(question.questionId);
      return action && action.actionCandidateState !== "blocked" ? [action] : [];
    });
    const state: CanonicalDomainPerspectiveCandidateV1["state"] = actions.length > 0
      ? "governed_action_available"
      : questions.length > 0
        ? "governed_questions_available"
        : "recognized_only";
    return [{
      perspectiveId: catalog.id,
      label: catalog.label.replace(/ Domain$/i, ""),
      purpose: catalog.purpose,
      sourceId,
      sourceArtifactId: artifact.identity,
      matchedSignalIds: unique(matches.map((column) => column.selectedCandidateId!)),
      matchedPhysicalColumns: unique(matches.map((column) => column.physicalColumn)),
      questionIds: questions.map((question) => question.questionId),
      actionCandidateIds: actions.map((action) => action.actionCandidateId),
      state,
      evidence: matches.map((column) => `${column.physicalColumn}:${column.selectedCandidateId}:${column.finalState}`),
      blockers: state === "recognized_only"
        ? ["canonical_semantics_recognized_but_governed_question_policy_not_available"]
        : [],
      provenance: "inferred_candidate",
    }];
  }).sort((left, right) =>
    stateOrder[left.state] - stateOrder[right.state]
    || right.matchedSignalIds.length - left.matchedSignalIds.length
    || left.perspectiveId.localeCompare(right.perspectiveId));
}

function roleCandidates(artifact: ValidArtifact): CanonicalSourceCandidateProjectionV1["roleCandidates"] {
  const selected = artifact.canonicalSource.semantic.columns
    .filter((column) => column.selectedCandidateId && ALLOWED_RESOLUTION_STATES.has(column.finalState));
  const scored = (Object.entries(ROLE_SIGNALS) as Array<[CanonicalSourceRoleV1, Record<string, number>]>)
    .map(([role, weights]) => {
      const matches = selected.filter((column) => weights[column.selectedCandidateId!] !== undefined);
      const score = matches.reduce((sum, column) => sum + weights[column.selectedCandidateId!] * confidenceForState(column.finalState), 0);
      return { role, score, matches };
    })
    .filter((entry) => entry.score >= 2)
    .sort((left, right) => right.score - left.score || left.role.localeCompare(right.role));
  const strongest = scored[0]?.score ?? 0;
  return scored.slice(0, 3).map((entry) => ({
    candidateId: `${artifact.identity}:role:${entry.role}`,
    value: entry.role,
    sourceId: artifact.canonicalSource.semantic.sourceId,
    sourceFingerprint: artifact.sourceFingerprint,
    sourceArtifactId: artifact.identity,
    scope: { level: "source_file", physicalColumn: null },
    supportingEvidence: entry.matches.map((column) => `${column.physicalColumn}:${column.selectedCandidateId}:${column.finalState}`),
    contradictingEvidence: scored
      .filter((other) => other.role !== entry.role && other.score >= entry.score * 0.8)
      .map((other) => `competing_role:${other.role}`),
    confidence: strongest > 0 ? Math.min(0.99, 0.55 + 0.44 * (entry.score / strongest)) : 0,
    provenance: "inferred_candidate",
  }));
}

export function projectCanonicalSourceCandidates(
  artifact: CanonicalConsumerBuildResultV1,
): CanonicalSourceCandidateProjectionV1 | null {
  if (artifact.status !== "valid") return null;
  const semantic = artifact.canonicalSource.semantic;
  const physical = artifact.canonicalSource.physical.sourceProfile;
  const profileByColumn = new Map(physical.columns.map((column) => [column.physicalColumnName, column]));
  const selected = semantic.columns.filter((column) => column.selectedCandidateId && ALLOWED_RESOLUTION_STATES.has(column.finalState));
  const base = {
    sourceId: semantic.sourceId,
    sourceFingerprint: artifact.sourceFingerprint,
    sourceArtifactId: artifact.identity,
  };
  const mappedCandidate = <T,>(
    kind: string,
    column: typeof selected[number],
    value: T,
  ): CanonicalEvidenceCandidateV1<T> => ({
    candidateId: `${artifact.identity}:${kind}:${column.sourceColumnIndex}`,
    value,
    ...base,
    scope: { level: "physical_column", physicalColumn: column.physicalColumn },
    supportingEvidence: column.candidateTraces
      .filter((trace) => trace.candidateId === column.selectedCandidateId)
      .flatMap((trace) => trace.evidenceReferences),
    contradictingEvidence: column.candidateTraces
      .filter((trace) => trace.candidateId !== column.selectedCandidateId && trace.disposition === "viable")
      .map((trace) => trace.candidateId),
    confidence: confidenceForState(column.finalState),
    provenance: "inferred_candidate",
  });
  const documentIdentityCandidates = selected
    .filter((column) => DOCUMENT_SIGNALS.has(column.selectedCandidateId!))
    .map((column) => mappedCandidate("document", column, { physicalColumn: column.physicalColumn, canonicalSignal: column.selectedCandidateId! }));
  const reportingPeriodCandidates = selected.flatMap((column) => {
    if (!TIME_SIGNALS.has(column.selectedCandidateId!)) return [];
    const range = profileByColumn.get(column.physicalColumn)?.dateTimeSummary;
    if (!range) return [];
    return [mappedCandidate("period", column, {
      start: range.minimumIso.slice(0, 10),
      end: range.maximumIso.slice(0, 10),
      physicalColumn: column.physicalColumn,
    })];
  });
  const monetaryColumnCandidates = selected
    .filter((column) => MONEY_SIGNALS.has(column.selectedCandidateId!))
    .map((column) => mappedCandidate("money", column, { physicalColumn: column.physicalColumn, canonicalSignal: column.selectedCandidateId! }));
  const observedCurrencyCandidates = selected.flatMap((column) => {
    if (column.selectedCandidateId !== "currency") return [];
    const values = profileByColumn.get(column.physicalColumn)?.stringSummary?.topValues
      .map((entry) => entry.value.trim().toUpperCase())
      .filter((value) => /^[A-Z]{3}$/.test(value)) ?? [];
    const unique = [...new Set(values)];
    return unique.length === 1
      ? [mappedCandidate("currency", column, { currency: unique[0], physicalColumn: column.physicalColumn })]
      : [];
  });
  return {
    schemaVersion: "lightbi.canonical-source-candidate-projection.v1",
    ...base,
    roleCandidates: roleCandidates(artifact),
    documentIdentityCandidates,
    reportingPeriodCandidates,
    monetaryColumnCandidates,
    observedCurrencyCandidates,
  };
}

function periodKey(candidate: CanonicalSourceCandidateProjectionV1): string | null {
  const period = candidate.reportingPeriodCandidates[0]?.value;
  if (!period) return null;
  const startMonth = period.start.slice(0, 7);
  const endMonth = period.end.slice(0, 7);
  return startMonth === endMonth ? startMonth : `${period.start}/${period.end}`;
}

export function projectCanonicalBusinessPerspectives(
  sources: Array<{ key: string; candidates: CanonicalSourceCandidateProjectionV1 | null }>,
  bundles: GovernedBundleCandidateV1[],
): CanonicalBusinessPerspectiveCandidateV1[] {
  const projected = sources.flatMap((source) => {
    const candidates = source.candidates;
    const role = candidates?.roleCandidates[0]?.value;
    if (!candidates || !role) return [];
    return [{
      key: source.key,
      candidates,
      role,
      period: periodKey(candidates),
      signals: candidates.monetaryColumnCandidates.map((candidate) => candidate.value.canonicalSignal),
    }];
  });
  const byRole = (role: CanonicalSourceRoleV1) => projected.filter((source) => source.role === role);
  const sourceKeys = (items: typeof projected) => items.map((item) => item.key).sort();
  const periods = (items: typeof projected) => [...new Set(items.flatMap((item) => item.period ? [item.period] : []))].sort();
  const roles = (items: typeof projected) => [...new Set(items.map((item) => item.role))].sort() as CanonicalSourceRoleV1[];
  const evidence = (items: typeof projected) => unique(items.flatMap((item) => [
    `source_role:${item.role}`,
    ...(item.period ? [`reporting_period:${item.period}`] : []),
    ...item.signals.map((signal) => `monetary_signal:${signal}`),
  ]));
  const grossProfit = bundles.filter((bundle) => bundle.kind === "gross_profit_period");
  const delivery = bundles.filter((bundle) => bundle.kind === "delivery_source_local");
  const revenueComparison = bundles.filter((bundle) => bundle.kind === "revenue_period_comparison");
  const sales = byRole("sales");
  const accounting = byRole("accounting");
  const logistics = byRole("logistics");
  const all = projected;
  const samePeriodCrossFunctional = periods(all).filter((period) =>
    ["sales", "accounting", "logistics"].every((role) =>
      projected.some((source) => source.role === role && source.period === period)));
  const candidates: CanonicalBusinessPerspectiveCandidateV1[] = [];

  if (new Set(all.map((source) => source.role)).size >= 2) {
    candidates.push({
      perspectiveId: "executive_overview",
      label: "Executive overview",
      businessQuestion: "What changed across the business, and where should I focus?",
      purpose: "Combine the available commercial, financial, and operational evidence into one decision-oriented overview.",
      sourceKeys: sourceKeys(all),
      sourceRoles: roles(all),
      periods: periods(all),
      bundleKinds: unique(bundles.map((bundle) => bundle.kind)),
      capabilityIds: unique([
        ...(sales.length ? ["sales_revenue", "quantity_sold", "transaction_count"] : []),
        ...(grossProfit.length ? ["gross_profit"] : []),
        ...(delivery.length ? ["delivery_count"] : []),
      ]),
      state: "partial",
      blockers: ["executive_brief_requires_governed_results_from_each_selected_angle"],
      evidence: evidence(all),
      recommended: true,
    });
  }

  if (sales.length) {
    candidates.push({
      perspectiveId: "sales_performance",
      label: "Sales performance",
      businessQuestion: "How are revenue, orders, and quantity changing—and what drives the movement?",
      purpose: "Review governed sales metrics by period and supported business dimensions.",
      sourceKeys: sourceKeys(sales),
      sourceRoles: ["sales"],
      periods: periods(sales),
      bundleKinds: revenueComparison.map((bundle) => bundle.kind),
      capabilityIds: ["sales_revenue", "quantity_sold", "transaction_count"],
      state: "needs_evidence",
      blockers: [],
      evidence: evidence(sales),
      recommended: true,
    });
  }

  if (grossProfit.length || accounting.length) {
    candidates.push({
      perspectiveId: "profitability",
      label: "Profitability",
      businessQuestion: "Where is gross profit created, and how does it change by period?",
      purpose: "Use compatible Sales and Accounting evidence without silently subtracting unreconciled measures.",
      sourceKeys: unique(grossProfit.flatMap((bundle) => bundle.sourceKeys)),
      sourceRoles: ["sales", "accounting"],
      periods: unique(grossProfit.flatMap((bundle) => bundle.period ? [bundle.period] : [])),
      bundleKinds: grossProfit.map((bundle) => bundle.kind),
      capabilityIds: ["gross_profit"],
      state: grossProfit.length ? "needs_evidence" : "partial",
      blockers: grossProfit.length ? [] : ["same_period_sales_accounting_pair_not_found"],
      evidence: evidence([...sales, ...accounting]),
      recommended: grossProfit.length > 0,
    });
  }

  if (accounting.length) {
    candidates.push({
      perspectiveId: "finance_accounting",
      label: "Finance & accounting",
      businessQuestion: "What do revenue, cost, margin, and receivable evidence say?",
      purpose: "Explain the accounting evidence that is supported now and identify finance questions that still lack governed metrics.",
      sourceKeys: sourceKeys(accounting),
      sourceRoles: ["accounting"],
      periods: periods(accounting),
      bundleKinds: grossProfit.map((bundle) => bundle.kind),
      capabilityIds: ["gross_profit"],
      state: "partial",
      blockers: ["receivable_vat_cogs_and_margin_actions_not_in_current_governed_metric_policy"],
      evidence: evidence(accounting),
      recommended: false,
    });
  }

  if (logistics.length) {
    candidates.push({
      perspectiveId: "fulfillment_operations",
      label: "Fulfillment & logistics",
      businessQuestion: "How are deliveries performing, and where are operational exceptions?",
      purpose: "Review governed delivery identity and status evidence before deeper carrier, fee, or SLA conclusions.",
      sourceKeys: sourceKeys(logistics),
      sourceRoles: ["logistics"],
      periods: periods(logistics),
      bundleKinds: delivery.map((bundle) => bundle.kind),
      capabilityIds: ["delivery_count"],
      state: "needs_evidence",
      blockers: [],
      evidence: evidence(logistics),
      recommended: true,
    });
  }

  if (samePeriodCrossFunctional.length) {
    candidates.push({
      perspectiveId: "order_journey",
      label: "Order journey",
      businessQuestion: "How does each order move from sale to accounting and delivery?",
      purpose: "Trace shared document identity across Sales, Accounting, and Logistics without assuming an unsafe generic join.",
      sourceKeys: sourceKeys([...sales, ...accounting, ...logistics]),
      sourceRoles: ["sales", "accounting", "logistics"],
      periods: samePeriodCrossFunctional,
      bundleKinds: unique([...grossProfit, ...delivery].map((bundle) => bundle.kind)),
      capabilityIds: [],
      state: "not_yet_executable",
      blockers: ["three_role_order_journey_relationship_policy_not_implemented"],
      evidence: evidence([...sales, ...accounting, ...logistics]),
      recommended: false,
    });
  }

  const multiPeriodRoles = (["sales", "accounting", "logistics", "inventory_snapshot", "inventory_movement"] as const)
    .filter((role) => periods(byRole(role)).length > 1);
  if (multiPeriodRoles.length) {
    const members = projected.filter((source) => multiPeriodRoles.includes(source.role as typeof multiPeriodRoles[number]));
    candidates.push({
      perspectiveId: "period_comparison",
      label: "Period comparison",
      businessQuestion: "What changed between the available reporting periods?",
      purpose: "Compare compatible period partitions after each source family has been governed independently.",
      sourceKeys: sourceKeys(members),
      sourceRoles: roles(members),
      periods: periods(members),
      bundleKinds: bundles
        .filter((bundle) => bundle.kind === "revenue_period_comparison" || bundle.kind === "delivery_period_comparison")
        .map((bundle) => bundle.kind),
      capabilityIds: unique([
        ...(multiPeriodRoles.includes("sales") ? ["sales_revenue"] : []),
        ...(multiPeriodRoles.includes("logistics") ? ["delivery_count"] : []),
      ]),
      state: "needs_evidence",
      blockers: [],
      evidence: evidence(members),
      recommended: true,
    });
  }

  candidates.push({
    perspectiveId: "data_trust",
    label: "Data trust",
    businessQuestion: "What does LightBI know, and what evidence is still missing?",
    purpose: "Inspect source identity, role, period, currency, grain, and relationship evidence before decision use.",
    sourceKeys: sourceKeys(all),
    sourceRoles: roles(all),
    periods: periods(all),
    bundleKinds: unique(bundles.map((bundle) => bundle.kind)),
    capabilityIds: [],
    state: "reviewable",
    blockers: [],
    evidence: evidence(all),
    recommended: false,
  });

  return candidates;
}

export function projectGovernedBundleCandidates(
  sources: Array<{ key: string; candidates: CanonicalSourceCandidateProjectionV1 | null }>,
): GovernedBundleCandidateV1[] {
  const projected = sources.flatMap((source) => {
    const role = source.candidates?.roleCandidates[0]?.value;
    return role ? [{ ...source, role, period: periodKey(source.candidates!) }] : [];
  });
  const bundles: GovernedBundleCandidateV1[] = [];
  const sales = projected.filter((source) => source.role === "sales");
  const accounting = projected.filter((source) => source.role === "accounting");
  const logistics = projected.filter((source) => source.role === "logistics");
  for (const salesSource of sales) {
    for (const accountingSource of accounting) {
      if (!salesSource.period || salesSource.period !== accountingSource.period) continue;
      bundles.push({
        bundleId: `gross-profit:${salesSource.key}:${accountingSource.key}`,
        kind: "gross_profit_period",
        purpose: `Gross profit for ${salesSource.period}`,
        sourceKeys: [salesSource.key, accountingSource.key],
        period: salesSource.period,
        state: "needs_confirmation",
        requiredEvidence: ["Confirm both source roles", "Confirm reporting period", "Confirm document identity", "Provide source-scoped reporting currency"],
        relationshipState: "candidate_not_confirmed",
        analyses: ["Gross profit"],
      });
    }
  }
  if (sales.length >= 2) {
    const ordered = [...sales].filter((source) => source.period).sort((left, right) => left.period!.localeCompare(right.period!));
    if (ordered.length >= 2 && ordered[0].period !== ordered[ordered.length - 1].period) {
      bundles.push({
        bundleId: `revenue-comparison:${ordered.map((source) => source.key).join(":")}`,
        kind: "revenue_period_comparison",
        purpose: "Revenue comparison across observed periods",
        sourceKeys: ordered.map((source) => source.key),
        period: `${ordered[0].period} to ${ordered[ordered.length - 1].period}`,
        state: "needs_confirmation",
        requiredEvidence: ["Confirm the Sales role for every source", "Confirm one distinct reporting period per source", "Provide consistent source-scoped reporting currency"],
        relationshipState: "period_partition_candidate",
        analyses: ["Sales revenue by reporting period"],
      });
    }
  }
  if (logistics.length >= 2) {
    const ordered = [...logistics].filter((source) => source.period).sort((left, right) => left.period!.localeCompare(right.period!));
    if (ordered.length >= 2 && ordered[0].period !== ordered[ordered.length - 1].period) {
      bundles.push({
        bundleId: `delivery-comparison:${ordered.map((source) => source.key).join(":")}`,
        kind: "delivery_period_comparison",
        purpose: "Delivery comparison across observed periods",
        sourceKeys: ordered.map((source) => source.key),
        period: `${ordered[0].period} to ${ordered[ordered.length - 1].period}`,
        state: "needs_confirmation",
        requiredEvidence: ["Confirm the Logistics role for every source", "Confirm one distinct reporting period per source"],
        relationshipState: "period_partition_candidate",
        analyses: ["Delivery count by reporting period"],
      });
    }
  }
  logistics.forEach((source) => bundles.push({
    bundleId: `delivery:${source.key}`,
    kind: "delivery_source_local",
    purpose: `Delivery analysis${source.period ? ` for ${source.period}` : ""}`,
    sourceKeys: [source.key],
    period: source.period,
    state: "needs_confirmation",
    requiredEvidence: ["Use this source as a source-local dataset"],
    relationshipState: "source_local",
    analyses: ["Delivery count", "Delivery operations"],
  }));
  return bundles;
}
