import { questionActionPolicyHash } from "./commerce-distribution-question-policy";
import { deterministicPolicySha256 } from "./contextual-evidence-policy";
import { GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1 } from "./domain-support-manifest";
import { generateGovernedCommerceQuestionsAndActions } from "./governed-question-action-generator";
import type { CanonicalMetricSourceV1, GovernedMetricPreflightItemV1, GovernedMetricPreflightV1, GovernedMetricStateV1 } from "./governed-domain-metric-contracts";
import { GOVERNED_METRIC_DEFINITIONS_V1, governedMetricPolicyHash } from "./governed-metric-policy";
import type { GovernedRuntimePreflightInputV1 } from "./governed-runtime-contracts";
import { governedRuntimePolicyHash } from "./governed-runtime-policy";
import { createCanonicalSourceCurrencyEvidence, createCanonicalSourceInventorySnapshotEvidence } from "./canonical-source-evidence";

type Column = { physical: string; semantic: string; type?: "number" | "string" | "date"; nullCount?: number; parseFailures?: number };
type FixtureOptions = {
  id: string;
  metricId: string;
  questionId: string;
  columns: Column[];
  rows: Record<string, unknown>[];
  state?: GovernedMetricStateV1;
  blockers?: string[];
  limitations?: string[];
  temporalMode?: string;
  aggregationForm?: string;
  identityIds?: string[];
  currencyCompatible?: boolean | null;
  unitCompatible?: boolean | null;
  asOf?: GovernedRuntimePreflightInputV1["asOfBasis"];
};

function sourceReference(hash: string): string { return `source:${hash}`; }

export function createGovernedRuntimeFixture(options: FixtureOptions) {
  const sourceHash = deterministicPolicySha256({ id: options.id, rows: options.rows });
  const canonicalSource = {
    physical: {
      provenance: { sourceId: options.id, sourceHash: { algorithm: "sha256", value: sourceHash } },
      sourceProfile: {
        columns: options.columns.map((column, index) => ({
          sourceColumnIndex: index,
          physicalColumnName: column.physical,
          nullCount: column.nullCount ?? 0,
          parseEvidence: [{ parser: "numeric", attemptedCount: options.rows.length, successCount: options.rows.length - (column.parseFailures ?? 0), failureCount: column.parseFailures ?? 0, representativeFailures: [] }],
          technicalColumnEvidence: [],
        })),
      },
    },
    semantic: {
      sourceId: options.id,
      sourceHash: { algorithm: "sha256", value: sourceHash },
      columns: options.columns.map((column, index) => ({ sourceColumnIndex: index, physicalColumn: column.physical, finalState: "confirmed", selectedCandidateId: column.semantic, candidateTraces: [{ candidateId: column.semantic }] })),
      productionWiring: { executed: false },
    },
    grain: {
      sourceId: options.id,
      sourceHash: { algorithm: "sha256", value: sourceHash },
      signature: {
        structuralForm: { value: "line", state: "confirmed" },
        temporalMode: { value: options.temporalMode ?? "event", state: "confirmed" },
        aggregationForm: { value: options.aggregationForm ?? "additive_measures", state: "confirmed" },
        identityBasis: { state: "confirmed", selectedCandidateIds: options.identityIds ?? ["order"] },
        measureSafety: { safeToAggregate: false, riskIds: [] },
      },
      productionWiring: { executed: false },
    },
    readiness: { capabilities: [], productionWiring: { executed: false } },
  } as unknown as CanonicalMetricSourceV1;
  const grossProfitCurrencyEvidence = options.metricId === "gross_profit" ? createCanonicalSourceCurrencyEvidence({
    sourceId: options.id,
    sourceHash: { algorithm: "sha256", value: sourceHash },
    currency: "USD",
    provenance: { kind: "declared_source_metadata", reference: "governed-runtime-test-fixture", referenceHash: { algorithm: "sha256", value: deterministicPolicySha256("governed-runtime-test-fixture") } },
    scope: "selected_columns",
    applicableMonetaryColumns: options.columns.filter((column) => ["revenue", "net_revenue", "cost", "total_cost"].includes(column.semantic)).map((column) => column.physical),
    reportingPeriod: "controlled-fixture-period",
  }) : null;
  if (grossProfitCurrencyEvidence) canonicalSource.sourceEvidence = { currency: [grossProfitCurrencyEvidence] };
  const inventorySnapshotEvidence = options.metricId === "inventory_on_hand" ? createCanonicalSourceInventorySnapshotEvidence({
    sourceId: options.id,
    sourceHash: { algorithm: "sha256", value: sourceHash },
    provenance: { kind: "declared_source_metadata", reference: "governed-runtime-test-fixture", referenceHash: { algorithm: "sha256", value: deterministicPolicySha256("governed-runtime-test-fixture") } },
    scope: "one_item_warehouse_as_of_snapshot",
    quantity: { physicalColumn: "StockQty", semanticId: "stock_qty" },
    itemIdentity: { physicalColumn: "ItemID", semanticId: "sku" },
    warehouseIdentity: { physicalColumn: "WarehouseID", semanticId: "warehouse" },
    asOf: { physicalColumn: "AsOfDate", semanticId: "time_period", value: String(options.asOf?.value ?? "") },
    unit: { physicalColumn: "UOM", semanticId: "uom", value: "EA" },
  }) : null;
  if (inventorySnapshotEvidence) canonicalSource.sourceEvidence = { currency: [], inventorySnapshots: [inventorySnapshotEvidence] };
  const blockers = options.blockers ?? [];
  const state = options.state ?? "ready";
  const metricVersion = GOVERNED_METRIC_DEFINITIONS_V1.find((definition) => definition.metricId === options.metricId)?.version ?? "1.0.0";
  const metric: GovernedMetricPreflightItemV1 = {
    metricId: options.metricId, metricVersion, state, metricDefinitionAvailable: true, semanticRequirementsSatisfied: blockers.length === 0,
    grainCompatible: blockers.length === 0, operatorValid: true, timeCompatible: blockers.length === 0, unitCompatible: options.unitCompatible ?? null,
    currencyCompatible: options.currencyCompatible ?? null, duplicateHandlingSatisfied: !blockers.includes("repeated_or_unresolved_measure_aggregation"), relationshipRequirementsSatisfied: !blockers.includes("cross_source_metric_requires_governed_relationship"),
    selectedBindings: ["gross_profit", "source_record_count"].includes(options.metricId) ? GOVERNED_METRIC_DEFINITIONS_V1.find((definition) => definition.metricId === options.metricId)!.requirements.flatMap((requirement) => {
      const requirementSignals: readonly string[] = requirement.semanticSignals;
      const index = options.columns.findIndex((column) => requirementSignals.includes(column.semantic));
      return index < 0 ? [] : [{ requirementId: requirement.requirementId, semanticId: options.columns[index].semantic, sourceReference: sourceReference(sourceHash), sourceColumnIndex: index, physicalColumn: options.columns[index].physical, semanticState: "confirmed" as const }];
    }) : [],
    selectedIdentityCandidateId: options.metricId === "gross_profit" || options.metricId === "inventory_on_hand" ? (options.identityIds ?? ["order"])[0] : null,
    currencyEvidenceIds: grossProfitCurrencyEvidence ? [grossProfitCurrencyEvidence.evidenceId] : [], inventorySnapshotEvidenceIds: inventorySnapshotEvidence ? [inventorySnapshotEvidence.evidenceId] : [],
    evidence: [], blockers: blockers.map((code) => ({ code, severity: "critical", references: [] })), limitations: (options.limitations ?? []).map((code) => ({ code, references: [] })), remediation: [],
    metricDefinitionAvailableFlag: true, metricPreflightExecuted: true, runtimeActionCreated: false, runtimeActionAuthorized: false, metricExecutionExecuted: false, decisionUseAuthorized: false, result: null, productionWiring: { executed: false },
  };
  const metricPreflightBase: Omit<GovernedMetricPreflightV1, "identity"> = {
    schemaVersion: "lightbi.governed-metric-preflight.v1", domainPackId: "commerce_distribution_mvp", policyVersion: "lightbi.governed-metric-policy.v1", policyHash: governedMetricPolicyHash(),
    sourceReferences: [sourceReference(sourceHash)], tuningAllowed: true, metrics: [metric], blockers: metric.blockers, limitations: metric.limitations,
    metricResultsProduced: false, runtimeActionCreated: false, runtimeActionAuthorized: false, metricExecutionExecuted: false, decisionUseAuthorized: false, productionWiring: { executed: false },
  };
  const metricPreflight: GovernedMetricPreflightV1 = { ...metricPreflightBase, identity: deterministicPolicySha256({ policyHash: metricPreflightBase.policyHash, sourceReferences: metricPreflightBase.sourceReferences, tuningAllowed: metricPreflightBase.tuningAllowed, metrics: metricPreflightBase.metrics }) };
  const manifest = GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1[0];
  const domainActivation = {
    schemaVersion: "lightbi.domain-activation.v1" as const, packId: "commerce_distribution_mvp" as const, packVersion: manifest.version, manifestPolicyHash: manifest.lastValidatedPolicyIdentity,
    identity: `activation:${options.id}`, state: "conditional" as const, concepts: [], blockers: [], limitations: [], tuningAllowed: true, canonicalArtifactsModified: false as const,
    questionGeneration: { executed: false as const }, actionGeneration: { executed: false as const }, productionWiring: { executed: false as const },
  };
  const questionGeneration = generateGovernedCommerceQuestionsAndActions({ schemaVersion: "lightbi.question-action-generation-input.v1", canonicalSource, domainActivation, metricPreflight, expectedQuestionPolicyHash: questionActionPolicyHash() });
  const actionCandidate = questionGeneration.actionCandidates.find((item) => item.questionId === options.questionId) ?? null;
  const runtimeInput: GovernedRuntimePreflightInputV1 = {
    schemaVersion: "lightbi.governed-runtime-preflight-input.v1", canonicalSource, metricPreflight, questionGeneration, actionCandidate,
    expectedRuntimePolicyHash: governedRuntimePolicyHash(), asOfBasis: options.asOf ?? null,
  };
  return { ...options, sourceHash, canonicalSource, metric, metricPreflight, questionGeneration, actionCandidate, runtimeInput };
}

export const RUNTIME_FIXTURES = {
  revenue: () => createGovernedRuntimeFixture({ id: "runtime-revenue", metricId: "sales_revenue", questionId: "commerce.sales_revenue.over_time", columns: [{ physical: "OrderID", semantic: "order" }, { physical: "Product", semantic: "product" }, { physical: "OrderDate", semantic: "report_date" }, { physical: "Revenue", semantic: "revenue", type: "number" }, { physical: "Currency", semantic: "currency" }], rows: [{ OrderID: "O-1", Product: "A", OrderDate: "2026-01-01", Revenue: 100, Currency: "USD" }, { OrderID: "O-2", Product: "B", OrderDate: "2026-01-02", Revenue: 75, Currency: "USD" }], currencyCompatible: true }),
  quantity: () => createGovernedRuntimeFixture({ id: "runtime-quantity", metricId: "quantity_sold", questionId: "commerce.quantity_sold.by_product", columns: [{ physical: "OrderID", semantic: "order" }, { physical: "Product", semantic: "product" }, { physical: "SoldQty", semantic: "sold_qty", type: "number" }, { physical: "UOM", semantic: "uom" }], rows: [{ OrderID: "O-1", Product: "A", SoldQty: 2, UOM: "pcs" }, { OrderID: "O-2", Product: "B", SoldQty: 3, UOM: "pcs" }], unitCompatible: true }),
  transaction: () => createGovernedRuntimeFixture({ id: "runtime-transaction", metricId: "transaction_count", questionId: "commerce.transaction_count.summary", columns: [{ physical: "OrderID", semantic: "order" }, { physical: "Revenue", semantic: "revenue", type: "number" }], rows: [{ OrderID: "O-1", Revenue: 100 }, { OrderID: "O-1", Revenue: 50 }, { OrderID: "O-2", Revenue: 75 }], identityIds: ["order"] }),
  inventory: () => createGovernedRuntimeFixture({ id: "runtime-inventory", metricId: "inventory_on_hand", questionId: "commerce.inventory_on_hand.as_of", columns: [{ physical: "ItemID", semantic: "sku" }, { physical: "WarehouseID", semantic: "warehouse" }, { physical: "StockQty", semantic: "stock_qty", type: "number" }, { physical: "AsOfDate", semantic: "time_period" }, { physical: "UOM", semantic: "uom" }], rows: [{ ItemID: "A", WarehouseID: "WH-1", StockQty: 10, AsOfDate: "2026-05-31", UOM: "EA" }, { ItemID: "B", WarehouseID: "WH-1", StockQty: 20, AsOfDate: "2026-05-31", UOM: "EA" }], temporalMode: "snapshot", aggregationForm: "snapshot_values", identityIds: ["key:0+1"], unitCompatible: true, asOf: { kind: "column_value", sourceColumnIndex: 3, semanticId: "time_period", value: "2026-05-31" } }),
  delivery: () => createGovernedRuntimeFixture({ id: "runtime-delivery", metricId: "delivery_count", questionId: "commerce.delivery_count.summary", columns: [{ physical: "ShipmentID", semantic: "shipment" }, { physical: "DeliveryStatus", semantic: "delivery_status" }], rows: [{ ShipmentID: "S-1", DeliveryStatus: "Delivered" }, { ShipmentID: "S-1", DeliveryStatus: "Delivered" }, { ShipmentID: "S-2", DeliveryStatus: "Pending" }], identityIds: ["shipment"] }),
  sourceRecords: () => createGovernedRuntimeFixture({ id: "runtime-source-records", metricId: "source_record_count", questionId: "descriptive.source_records.by_role", columns: [{ physical: "PlayerName", semantic: "person" }, { physical: "Position", semantic: "role" }, { physical: "Team", semantic: "team" }], rows: [{ PlayerName: "A", Position: "Goalkeeper", Team: "X" }, { PlayerName: "B", Position: "Defender", Team: "X" }, { PlayerName: "B", Position: "Defender", Team: "X" }], identityIds: [] }),
  profit: () => createGovernedRuntimeFixture({ id: "runtime-profit", metricId: "gross_profit", questionId: "commerce.gross_profit.over_time", columns: [{ physical: "OrderID", semantic: "order" }, { physical: "Period", semantic: "time_period" }, { physical: "Revenue", semantic: "revenue", type: "number" }, { physical: "TotalCost", semantic: "total_cost", type: "number" }, { physical: "Currency", semantic: "currency" }], rows: [{ OrderID: "O-1", Period: "2026-01", Revenue: 100, TotalCost: 60, Currency: "USD" }, { OrderID: "O-2", Period: "2026-02", Revenue: 200, TotalCost: 140, Currency: "USD" }], currencyCompatible: true }),
};
