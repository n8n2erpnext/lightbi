import type {
  AnalysisAction,
  BusinessLens,
  BusinessPerspective,
  BusinessQuestion,
  BusinessSignal,
  DatasetProfile,
  DomainId,
  OrientationQuestion,
  QuestionIntent
} from "./contracts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function has(signals: BusinessSignal[], id: string): boolean {
  return signals.some(signal => signal.canonicalId === id && signal.usableForDefaultQuestion);
}

/** Check if signal exists at all (regardless of usability flag). */
function hasAny(signals: BusinessSignal[], id: string): boolean {
  return signals.some(signal => signal.canonicalId === id);
}

function signalColumn(signals: BusinessSignal[], id: string): string | undefined {
  return signals.find(signal => signal.canonicalId === id)?.physicalColumn;
}

function signalColumns(signals: BusinessSignal[], ids: string[]): string[] {
  const columns: string[] = [];
  for (const id of ids) {
    const column = signalColumn(signals, id);
    if (column && !columns.includes(column)) columns.push(column);
  }
  return columns;
}

function fitScore(signals: BusinessSignal[], required: string[], base: number): number {
  const present = required.filter(id => has(signals, id)).length;
  return Math.round(base * (present / Math.max(required.length, 1)));
}

const VIRTUAL_COUNT_MEASURES = new Set(["record_count", "row_count"]);

function defaultMeasureAggregations(
  actionKind: BusinessQuestion["actionKind"],
  measures: string[],
  explicit?: Record<string, "SUM" | "COUNT" | "AVG">
): Record<string, "SUM" | "COUNT" | "AVG"> | undefined {
  if (explicit) return explicit;
  if ((actionKind !== "trend" && actionKind !== "group_by") || measures.length === 0) return undefined;
  return Object.fromEntries(
    measures.map(measure => [
      measure,
      VIRTUAL_COUNT_MEASURES.has(measure) ? "COUNT" : "SUM"
    ])
  );
}

function perspective(
  id: string,
  label: string,
  domain: DomainId,
  reason: string,
  signalIds: string[]
): BusinessPerspective {
  return { id, label, domain, reason, signalIds };
}

function actionFromQuestion(question: BusinessQuestion): AnalysisAction {
  return {
    id: `action_${question.id}`,
    questionId: question.id,
    label: question.label,
    actionKind: question.actionKind,
    dimensions: question.dimensions,
    measures: question.measures,
    measureAggregations: question.measureAggregations ? { ...question.measureAggregations } : undefined,
    derivedMeasures: question.derivedMeasures?.map(measure => ({ ...measure, positiveValues: [...measure.positiveValues] })),
    executionScope: question.executionScope
  };
}

function structuralBlocks(question: BusinessQuestion): string[] {
  const blocks: string[] = [];
  if (question.actionKind === "group_by") {
    if (question.dimensions.length < 1) blocks.push("group_by requires at least 1 dimension");
    if (question.measures.length < 1) blocks.push("group_by requires at least 1 measure");
  }
  if (question.actionKind === "trend") {
    if (question.dimensions.length < 1) blocks.push("trend requires at least 1 time dimension");
    if (question.measures.length < 1) blocks.push("trend requires at least 1 measure");
  }
  if (question.actionKind === "distribution" && question.dimensions.length < 1) {
    blocks.push("distribution requires at least 1 dimension");
  }
  if (question.actionKind === "relationship" && question.measures.length < 2) {
    blocks.push("relationship requires at least 2 measures");
  }
  return blocks;
}

function intentFromQuestion(question: BusinessQuestion): QuestionIntent {
  if (question.actionKind === "trend") return "trend";
  if (question.actionKind === "distribution") return "mix";
  if (question.actionKind === "data_quality_review") return "quality_review";
  if (/exception|bất thường|lệch|round|change|fee/i.test(question.label)) return "exception_check";
  if (/top|ranking|rank|highest/i.test(question.label)) return "ranking";
  if (question.actionKind === "table_preview") return "lookup";
  return "compare";
}

function orientationQuestion(
  lensId: string,
  question: BusinessQuestion | undefined,
  fallback: {
    id: string;
    label: string;
    userPrompt: string;
    intent: QuestionIntent;
    blockedReasons: string[];
  }
): OrientationQuestion {
  if (!question) {
    return {
      id: fallback.id,
      lensId,
      label: fallback.label,
      userPrompt: fallback.userPrompt,
      intent: fallback.intent,
      blockedReasons: fallback.blockedReasons
    };
  }

  const blocks = structuralBlocks(question);
  return {
    id: `oq_${question.id}`,
    lensId,
    label: question.label,
    userPrompt: question.userPrompt,
    intent: intentFromQuestion(question),
    defaultAction: blocks.length === 0 ? actionFromQuestion(question) : undefined,
    blockedReasons: [...question.caveats, ...blocks]
  };
}

function tableOrientationQuestion(
  lensId: string,
  id: string,
  label: string,
  userPrompt: string,
  intent: QuestionIntent,
  columns: string[],
  executionScope: BusinessQuestion["executionScope"],
  blockedReasons: string[] = []
): OrientationQuestion {
  return {
    id,
    lensId,
    label,
    userPrompt,
    intent,
    defaultAction: blockedReasons.length === 0 ? {
      id: `action_${id}`,
      questionId: id,
      label,
      actionKind: "table_preview",
      dimensions: columns,
      measures: [],
      executionScope
    } : undefined,
    blockedReasons
  };
}

function groupByCountOrientationQuestion(
  lensId: string,
  id: string,
  label: string,
  userPrompt: string,
  dimension: string | undefined,
  executionScope: BusinessQuestion["executionScope"],
  blockedReason: string
): OrientationQuestion {
  return {
    id,
    lensId,
    label,
    userPrompt,
    intent: "ranking",
    defaultAction: dimension ? {
      id: `action_${id}`,
      questionId: id,
      label,
      actionKind: "group_by",
      dimensions: [dimension],
      measures: ["record_count"],
      executionScope
    } : undefined,
    blockedReasons: dimension ? [] : [blockedReason]
  };
}

function buildBusinessLenses(
  profile: DatasetProfile,
  signals: BusinessSignal[],
  questions: BusinessQuestion[]
): BusinessLens[] {
  const lenses: BusinessLens[] = [];
  const findQuestion = (predicate: (question: BusinessQuestion) => boolean) =>
    questions.find(predicate);
  const hasSignal = (id: string) => hasAny(signals, id);
  const columns = (ids: string[]) => signalColumns(signals, ids);
  const isInventorySnapshot = profile.profile.documentType === "inventory_snapshot";

  const pushLens = (lens: BusinessLens) => {
    if (lens.availability === "not_implemented") return;

    const evidenceColumns = signalColumns(signals, [...lens.requiredSignals, ...lens.optionalSignals]);
    const requiredEvidenceColumns = signalColumns(signals, lens.requiredSignals);
    const hasRequiredEvidence =
      lens.requiredSignals.length === 0 || requiredEvidenceColumns.length > 0;
    const hasRunnableQuestion = lens.questions.some(question => question.defaultAction);
    const hasEvidenceAnchor =
      hasRequiredEvidence
      && (evidenceColumns.length > 0 || lens.requiredSignals.length === 0 && lens.optionalSignals.length === 0);
    if (!hasRunnableQuestion && !hasEvidenceAnchor) return;

    const hasAction = lens.questions.some(question => question.defaultAction);
    const availability =
      lens.availability === "ready" && !hasAction ? "partial" : lens.availability;
    lenses.push({
      ...lens,
      availability,
      reasons: lens.reasons.length > 0 ? lens.reasons : evidenceColumns.map(column => `Detected: ${column}`)
    });
  };

  const executionScope: BusinessQuestion["executionScope"] =
    profile.source.sourceRowCount > profile.source.sampleRowCount
      ? "sample_preview"
      : "full_local_file";

  if (profile.profile.documentType === "dirty_operational_export") {
    const reviewQuestion = findQuestion(q => q.actionKind === "data_quality_review");
    pushLens({
      id: "data_quality_review",
      domain: "operations",
      label: "Review data quality before analysis",
      description: "This export has dirty signals. Decide how to treat row types, formulas, embedded money, and technical columns before running aggregates.",
      priority: 100,
      requiredSignals: [],
      optionalSignals: ["row_type", "employee", "customer"],
      availability: "ready",
      reasons: profile.quality.dirtySignals.map(signal => signal.message),
      questions: [
        orientationQuestion("data_quality_review", reviewQuestion, {
          id: "oq_data_quality_review_blocked",
          label: "Review dirty operational export",
          userPrompt: "Which dirty fields and row types should be cleaned before analysis?",
          intent: "quality_review",
          blockedReasons: []
        })
      ]
    });
  }

  if (profile.quality.blockedReasons.length > 0) {
    pushLens({
      id: "schema_blocked",
      domain: "performance",
      label: "Schema needs recovery",
      description: "No reliable column headers are available yet, so LightBI should not create business questions or runtime actions.",
      priority: 100,
      requiredSignals: [],
      optionalSignals: [],
      availability: "blocked",
      reasons: profile.quality.blockedReasons,
      questions: [
        {
          id: "oq_schema_blocked",
          lensId: "schema_blocked",
          label: "Recover headers before analysis",
          userPrompt: "Which row contains the real headers for this file?",
          intent: "quality_review",
          blockedReasons: profile.quality.blockedReasons
        }
      ]
    });
    return lenses.sort((a, b) => b.priority - a.priority);
  }

  if (profile.profile.detectedDomains.includes("revenue") && !isInventorySnapshot) {
    const revenueMeasure = columns(["receivable", "revenue"])[0];
    const revenueReasons = [
      revenueMeasure ? `Money column detected: ${revenueMeasure}` : "No reliable money measure detected",
      hasSignal("date") ? `Time column detected: ${signalColumn(signals, "date")}` : "No time column detected"
    ];

    pushLens({
      id: "revenue_over_time",
      domain: "revenue",
      label: "Sales over time",
      description: "Understand sales, receivable amount, or transaction value by date or period.",
      priority: 92,
      requiredSignals: ["revenue", "date"],
      optionalSignals: ["receivable", "branch"],
      availability: hasSignal("revenue") && hasSignal("date") ? "ready" : "partial",
      reasons: revenueReasons,
      questions: [
        orientationQuestion("revenue_over_time", findQuestion(q => q.label === "Revenue over time"), {
          id: "oq_revenue_over_time_missing",
          label: "Revenue over time",
          userPrompt: "Do you want to see revenue or receivable amount by date?",
          intent: "trend",
          blockedReasons: ["A money measure and a time dimension are required."]
        })
      ]
    });

    pushLens({
      id: "store_performance",
      domain: "revenue",
      label: "Store or warehouse performance",
      description: "Compare stores, branches, warehouses, or outlets by value and volume.",
      priority: 90,
      requiredSignals: ["branch", "revenue"],
      optionalSignals: ["quantity", "receivable"],
      availability: hasSignal("branch") && hasSignal("revenue") ? "ready" : "partial",
      reasons: columns(["branch", "revenue", "receivable", "quantity"]).map(column => `Detected: ${column}`),
      questions: [
        orientationQuestion("store_performance", findQuestion(q => q.label === "Top stores or branches by revenue"), {
          id: "oq_store_performance_missing",
          label: "Store or warehouse performance",
          userPrompt: "Which store, branch, or warehouse contributes the most value?",
          intent: "ranking",
          blockedReasons: ["A store/branch dimension and a money measure are required."]
        })
      ]
    });

    const paymentSignals = [
      "payment_method",
      "payment_cash",
      "payment_card",
      "payment_voucher",
      "payment_bank",
      "gross_profit",
      "margin_pct",
      "invoice_total",
      "receivable"
    ];
    const paymentColumns = columns(paymentSignals);
    const paymentMethodColumn = signalColumn(signals, "payment_method");
    const paymentValueColumn = signalColumn(signals, "revenue")
      ?? signalColumn(signals, "receivable")
      ?? signalColumn(signals, "invoice_total");
    pushLens({
      id: "payment_mix",
      domain: "revenue",
      label: "Payment mix and cash-flow exposure",
      description: "Inspect how money, receivables, and profit are split across cash, installment, transfer, card, voucher, or other payment methods.",
      priority: 91,
      requiredSignals: [],
      optionalSignals: paymentSignals,
      availability: paymentMethodColumn && paymentValueColumn ? "ready" : paymentColumns.length > 0 ? "ready" : "blocked",
      reasons: paymentColumns.length > 0 ? paymentColumns.map(column => `Detected: ${column}`) : ["No payment method columns detected."],
      questions: [
        orientationQuestion("payment_mix", findQuestion(q => q.label === "Payment method mix"), {
          id: "oq_payment_mix_missing",
          label: "Payment method mix",
          userPrompt: "Do you want to compare cash, installment, transfer, card, voucher, or other payment types?",
          intent: "mix",
          blockedReasons: ["A payment method column and a money measure are required."]
        }),
        orientationQuestion("payment_mix", findQuestion(q => q.label === "Payment profitability and receivable mix"), {
          id: "oq_payment_profitability_missing",
          label: "Payment profitability and receivable mix",
          userPrompt: "Do payment methods differ by revenue, profit, margin, invoice total, or receivable exposure?",
          intent: "compare",
          blockedReasons: ["A payment method column plus revenue/profit/receivable measures are required."]
        })
      ]
    });

    pushLens({
      id: "employee_performance",
      domain: "performance",
      label: "Employee or user performance",
      description: "Compare employees or users by handled value, transaction count, or workload.",
      priority: 82,
      requiredSignals: ["employee"],
      optionalSignals: ["revenue", "quantity"],
      availability: hasSignal("employee") ? "ready" : "partial",
      reasons: columns(["employee", "revenue", "receivable", "quantity"]).map(column => `Detected: ${column}`),
      questions: [
        orientationQuestion("employee_performance", findQuestion(q => q.label === "Employee output by revenue"), {
          id: "oq_employee_performance_missing",
          label: "Employee or user performance",
          userPrompt: "Which employees or users handled the most value or transactions?",
          intent: "ranking",
          blockedReasons: ["An employee/user dimension is required."]
        })
      ]
    });

    const documentColumns = columns(["document_type", "related_document"]);
    pushLens({
      id: "document_structure",
      domain: "revenue",
      label: "Document and transaction structure",
      description: "Review document types, related documents, and transaction coverage.",
      priority: 74,
      requiredSignals: [],
      optionalSignals: ["document_type", "related_document"],
      availability: documentColumns.length > 0 ? "partial" : "blocked",
      reasons: documentColumns.length > 0 ? documentColumns.map(column => `Detected: ${column}`) : ["No document type or related document fields detected."],
      questions: [
        tableOrientationQuestion(
          "document_structure",
          "oq_document_structure",
          "Document coverage",
          "Do you want to inspect document types and related-document coverage?",
          "lookup",
          documentColumns,
          executionScope,
          documentColumns.length > 0 ? [] : ["Document structure columns are required."]
        )
      ]
    });

    const exceptionColumns = columns(["change_amount", "rounding_amount", "delivery_fee", "revenue", "receivable"]);
    pushLens({
      id: "exception_checks",
      domain: "revenue",
      label: "Exception checks",
      description: "Look for unusual change, rounding, fees, or differences between total and receivable amount.",
      priority: 72,
      requiredSignals: [],
      optionalSignals: ["change_amount", "rounding_amount", "delivery_fee", "revenue", "receivable"],
      availability: exceptionColumns.length >= 2 ? "partial" : "blocked",
      reasons: exceptionColumns.length > 0 ? exceptionColumns.map(column => `Detected: ${column}`) : ["No exception-check columns detected."],
      questions: [
        tableOrientationQuestion(
          "exception_checks",
          "oq_exception_checks",
          "Find unusual money movements",
          "Do you want to inspect change, rounding, delivery fees, or total-vs-receivable differences?",
          "exception_check",
          exceptionColumns,
          executionScope,
          exceptionColumns.length >= 2 ? [] : ["At least two money-related fields are needed for exception checks."]
        )
      ]
    });
  }

  if (profile.profile.detectedDomains.includes("operations") && !isInventorySnapshot) {
    const carrierColumn = signalColumn(signals, "carrier");
    const deliveryStatusColumn = signalColumn(signals, "delivery_status");
    const logisticsMeasures = columns(["delivery_fee", "quantity", "total_cost"]);

    pushLens({
      id: "carrier_cost_impact",
      domain: "operations",
      label: "Carrier cost impact",
      description: "Compare internal or outsourced carriers by delivery fee, volume, status, and available cost measures.",
      priority: 93,
      requiredSignals: ["carrier"],
      optionalSignals: ["delivery_fee", "delivery_status", "quantity", "total_cost"],
      availability: carrierColumn && logisticsMeasures.length > 0 ? "ready" : carrierColumn ? "partial" : "blocked",
      reasons: columns(["carrier", "delivery_fee", "delivery_status", "quantity", "total_cost"]).map(column => `Detected: ${column}`),
      questions: [
        orientationQuestion("carrier_cost_impact", findQuestion(q => q.label === "Carrier cost impact"), {
          id: "oq_carrier_cost_impact_missing",
          label: "Carrier cost impact",
          userPrompt: "How do carriers compare by delivery fee, fulfilled volume, and operational cost exposure?",
          intent: "compare",
          blockedReasons: ["A carrier dimension and delivery fee, quantity, or cost measure are required."]
        })
      ]
    });

    pushLens({
      id: "delivery_status_mix",
      domain: "operations",
      label: "Delivery completion mix",
      description: "Measure delivery completion, retry, failure, or lifecycle status using status values and order/shipment counts.",
      priority: 91,
      requiredSignals: ["delivery_status"],
      optionalSignals: ["carrier", "delivery_fee", "quantity"],
      availability: deliveryStatusColumn ? "ready" : "blocked",
      reasons: columns(["delivery_status", "carrier", "delivery_fee", "quantity"]).map(column => `Detected: ${column}`),
      questions: [
        orientationQuestion("delivery_status_mix", findQuestion(q => q.label === "Delivery completion mix"), {
          id: "oq_delivery_status_mix_missing",
          label: "Delivery completion mix",
          userPrompt: "What share of deliveries are completed, retried, failed, or still in progress?",
          intent: "mix",
          blockedReasons: ["A delivery or fulfillment status column is required."]
        })
      ]
    });

    pushLens({
      id: "operations_sla",
      domain: "operations",
      label: "SLA and on-time performance",
      description: "Find routes, trips, vehicles, or drivers causing late/on-time issues.",
      priority: 90,
      requiredSignals: ["on_time_status"],
      optionalSignals: ["route", "trip", "vehicle", "driver"],
      availability: hasSignal("on_time_status") ? "ready" : "partial",
      reasons: columns(["on_time_status", "route", "trip", "vehicle", "driver"]).map(column => `Detected: ${column}`),
      questions: [
        orientationQuestion("operations_sla", findQuestion(q => q.label === "On-time status by route or trip"), {
          id: "oq_operations_sla_missing",
          label: "SLA and on-time performance",
          userPrompt: "Which route, trip, vehicle, or driver creates late/on-time issues?",
          intent: "compare",
          blockedReasons: ["An on-time/status signal is required."]
        })
      ]
    });

    pushLens({
      id: "operations_waiting_time",
      domain: "operations",
      label: "Waiting time hotspots",
      description: "Locate where waiting time or processing delay is highest.",
      priority: 86,
      requiredSignals: ["waiting_time"],
      optionalSignals: ["route", "trip", "employee"],
      availability: hasSignal("waiting_time") ? "ready" : "partial",
      reasons: columns(["waiting_time", "route", "trip", "employee"]).map(column => `Detected: ${column}`),
      questions: [
        orientationQuestion("operations_waiting_time", findQuestion(q => q.label === "Waiting time hotspots"), {
          id: "oq_waiting_time_missing",
          label: "Waiting time hotspots",
          userPrompt: "Where is waiting time highest?",
          intent: "ranking",
          blockedReasons: ["A waiting-time measure is required."]
        })
      ]
    });

    pushLens({
      id: "route_trip_vehicle",
      domain: "operations",
      label: "Route, trip, vehicle, and driver flow",
      description: "Understand operational activity by route, trip, vehicle, or driver.",
      priority: 82,
      requiredSignals: [],
      optionalSignals: ["route", "trip", "vehicle", "driver", "weight", "capacity"],
      availability: columns(["route", "trip", "vehicle", "driver"]).length > 0 ? "ready" : "partial",
      reasons: columns(["route", "trip", "vehicle", "driver", "weight", "capacity"]).map(column => `Detected: ${column}`),
      questions: [
        orientationQuestion("route_trip_vehicle", findQuestion(q => q.label === "Vehicle or driver punctuality"), {
          id: "oq_route_trip_vehicle_missing",
          label: "Route, trip, vehicle, and driver flow",
          userPrompt: "Do you want to compare activity by route, trip, vehicle, or driver?",
          intent: "compare",
          blockedReasons: ["At least one route/trip/vehicle/driver field is recommended."]
        })
      ]
    });
  }

  if (profile.profile.detectedDomains.includes("inventory")) {
    const currentLocation = signalColumn(signals, "current_location") ?? signalColumn(signals, "branch");
    const stockThreshold = signalColumn(signals, "stock_threshold");
    const stockStatus = signalColumn(signals, "stock_status") ?? signalColumn(signals, "load_status");
    const codAmount = signalColumn(signals, "cod_amount") ?? signalColumn(signals, "declared_value");
    const serviceOrItem =
      signalColumn(signals, "service_group") ??
      signalColumn(signals, "item_type") ??
      signalColumn(signals, "destination_location");

    pushLens({
      id: "product_overview",
      domain: "inventory",
      label: "Product and SKU overview",
      description: "Understand product master data, SKU coverage, and category structure.",
      priority: isInventorySnapshot ? 60 : 88,
      requiredSignals: ["sku"],
      optionalSignals: [],
      availability: hasSignal("sku") ? "ready" : "partial",
      reasons: columns(["sku"]).map(column => `Detected: ${column}`),
      questions: [
        orientationQuestion("product_overview", findQuestion(q => q.label === "Product inventory table" || q.label === "Product group distribution"), {
          id: "oq_product_overview_missing",
          label: "Product and SKU overview",
          userPrompt: "Do you want to inspect product/SKU coverage or category distribution?",
          intent: "lookup",
          blockedReasons: ["A product/SKU identifier is required."]
        })
      ]
    });

    pushLens({
      id: "stock_health",
      domain: "inventory",
      label: "Inventory aging and backlog risk",
      description: "Find where inventory/shipments are stuck by aging threshold, current location, or status.",
      priority: 94,
      requiredSignals: [],
      optionalSignals: ["stock_age", "stock_threshold", "current_location", "stock_status", "load_status"],
      availability: stockThreshold || currentLocation || stockStatus ? "ready" : "partial",
      reasons: columns(["stock_age", "stock_threshold", "current_location", "stock_status", "load_status"]).map(column => `Detected: ${column}`),
      questions: [
        stockThreshold
          ? groupByCountOrientationQuestion(
              "stock_health",
              "oq_inventory_aging_threshold",
              "Aging risk by threshold",
              "Which aging buckets contain the most inventory or shipments?",
              stockThreshold,
              executionScope,
              "An aging threshold/bucket field is required."
            )
          : currentLocation
            ? groupByCountOrientationQuestion(
                "stock_health",
                "oq_inventory_current_location",
                "Backlog by current location",
                "Which current hubs or branches hold the most inventory?",
                currentLocation,
                executionScope,
                "A current location field is required."
              )
            : orientationQuestion("stock_health", findQuestion(q => q.label === "Stock status breakdown"), {
                id: "oq_stock_health_missing",
                label: "Stock status and age",
                userPrompt: "Do you want to inspect stock age or stock status?",
                intent: "mix",
                blockedReasons: ["Stock age/status/current-location fields are required."]
              })
      ]
    });

    pushLens({
      id: "inventory_value_exposure",
      domain: "inventory",
      label: "Inventory value exposure",
      description: "Review COD, declared value, freight fee, and weight tied up in current inventory.",
      priority: 90,
      requiredSignals: [],
      optionalSignals: ["cod_amount", "declared_value", "freight_fee", "weight", "current_location"],
      availability: (codAmount || signalColumn(signals, "freight_fee") || signalColumn(signals, "weight")) && currentLocation ? "ready" : "partial",
      reasons: columns(["cod_amount", "declared_value", "freight_fee", "weight", "current_location"]).map(column => `Detected: ${column}`),
      questions: [
        currentLocation && codAmount
          ? {
              id: "oq_inventory_value_by_location",
              lensId: "inventory_value_exposure",
              label: "Value at risk by current location",
              userPrompt: "Which current hubs or branches hold the largest COD or declared value?",
              intent: "ranking",
              defaultAction: {
                id: "action_oq_inventory_value_by_location",
                questionId: "oq_inventory_value_by_location",
                label: "Value at risk by current location",
                actionKind: "group_by",
                dimensions: [currentLocation],
                measures: [codAmount],
                executionScope
              },
              blockedReasons: []
            }
          : tableOrientationQuestion(
              "inventory_value_exposure",
              "oq_inventory_value_preview",
              "Inventory value evidence",
              "Inspect COD, declared value, freight fee, weight, and location fields.",
              "lookup",
              columns(["cod_amount", "declared_value", "freight_fee", "weight", "current_location"]),
              executionScope,
              columns(["cod_amount", "declared_value", "freight_fee", "weight", "current_location"]).length > 0 ? [] : ["Inventory value/location fields are required."]
            )
      ]
    });

    pushLens({
      id: "inventory_structure",
      domain: "inventory",
      label: "Service, item, and status structure",
      description: "Understand service groups, item types, destination, return flag, load status, and operational status.",
      priority: 84,
      requiredSignals: [],
      optionalSignals: ["service_group", "item_type", "destination_location", "stock_status", "load_status"],
      availability: serviceOrItem || stockStatus ? "ready" : "partial",
      reasons: columns(["service_group", "item_type", "destination_location", "stock_status", "load_status"]).map(column => `Detected: ${column}`),
      questions: [
        serviceOrItem
          ? {
              id: "oq_inventory_service_mix",
              lensId: "inventory_structure",
              label: "Service or item mix in inventory",
              userPrompt: "What service groups, item types, or destinations dominate current inventory?",
              intent: "mix",
              defaultAction: {
                id: "action_oq_inventory_service_mix",
                questionId: "oq_inventory_service_mix",
                label: "Service or item mix in inventory",
                actionKind: "distribution",
                dimensions: [serviceOrItem],
                measures: [],
                executionScope
              },
              blockedReasons: []
            }
          : stockStatus
            ? {
                id: "oq_inventory_status_breakdown",
                lensId: "inventory_structure",
                label: "Status breakdown",
                userPrompt: "Which inventory or load statuses need attention?",
                intent: "mix",
                defaultAction: {
                  id: "action_oq_inventory_status_breakdown",
                  questionId: "oq_inventory_status_breakdown",
                  label: "Status breakdown",
                  actionKind: "distribution",
                  dimensions: [stockStatus],
                  measures: [],
                  executionScope
                },
                blockedReasons: []
              }
            : tableOrientationQuestion(
                "inventory_structure",
                "oq_inventory_structure_missing",
                "Inventory structure",
                "Inspect service, item, destination, or status fields.",
                "lookup",
                columns(["service_group", "item_type", "destination_location", "stock_status", "load_status"]),
                executionScope,
                ["Service/item/status fields are required."]
              )
      ]
    });
  }

  const customerSignal = signals.find(signal => signal.canonicalId === "customer");
  if (customerSignal) {
    const dominated = customerSignal.dominanceRatio != null && customerSignal.dominanceRatio > 0.9;
    pushLens({
      id: "customer_concentration",
      domain: "customer",
      label: dominated ? "Customer field is low-value by default" : "Customer concentration",
      description: dominated
        ? "One customer value dominates this field, so customer analysis should be optional rather than primary."
        : "Understand customer concentration and contribution.",
      priority: dominated ? 25 : 70,
      requiredSignals: ["customer"],
      optionalSignals: ["revenue", "date"],
      availability: dominated ? "partial" : "ready",
      reasons: [
        `Detected: ${customerSignal.physicalColumn}`,
        customerSignal.dominanceRatio != null ? `Dominance: ${customerSignal.dominanceRatio.toFixed(2)}` : ""
      ].filter(Boolean),
      questions: [
        orientationQuestion("customer_concentration", findQuestion(q => q.domain === "customer"), {
          id: "oq_customer_concentration_missing",
          label: "Customer concentration",
          userPrompt: "Do you want to inspect customer contribution, knowing whether this field is useful?",
          intent: "ranking",
          blockedReasons: []
        })
      ]
    });
  }

  if (profile.profile.detectedDomains.includes("performance")) {
    pushLens({
      id: "performance_ranking",
      domain: "performance",
      label: "Ranking and KPI performance",
      description: "Review ranking, KPI, target, achievement, manager, or team performance.",
      priority: isInventorySnapshot ? 58 : 86,
      requiredSignals: [],
      optionalSignals: ["kpi", "employee"],
      availability: hasSignal("kpi") ? "ready" : "partial",
      reasons: columns(["kpi", "employee"]).map(column => `Detected: ${column}`),
      questions: [
        orientationQuestion("performance_ranking", findQuestion(q => q.label === "KPI or ranking by manager or employee"), {
          id: "oq_performance_ranking_missing",
          label: "Ranking and KPI performance",
          userPrompt: "Do you want to compare ranking, KPI, target, or achievement?",
          intent: "ranking",
          blockedReasons: ["A KPI/ranking measure is recommended."]
        })
      ]
    });
  }

  pushLens({
    id: "finance_not_implemented",
    domain: "finance",
    label: "Finance analysis",
    description: "Budget, cost, expense, profit, and margin analysis are not implemented yet.",
    priority: 1,
    requiredSignals: ["budget", "cost", "expense", "profit", "margin"],
    optionalSignals: ["fiscal_period"],
    availability: "not_implemented",
    reasons: ["Finance signal rules and question templates are not implemented."],
    questions: [
      {
        id: "oq_finance_not_implemented",
        lensId: "finance_not_implemented",
        label: "Finance analysis is not implemented",
        userPrompt: "Finance analysis needs budget/cost/profit/margin signals in a future phase.",
        intent: "quality_review",
        blockedReasons: ["Finance domain is declared but not implemented."]
      }
    ]
  });

  return lenses.sort((a, b) => b.priority - a.priority);
}

// ---------------------------------------------------------------------------
// Main engine
// ---------------------------------------------------------------------------

export function generateQuestionFit(
  profile: DatasetProfile,
  signals: BusinessSignal[]
): {
  lenses: BusinessLens[];
  perspectives: BusinessPerspective[];
  questions: BusinessQuestion[];
} {
  const perspectives: BusinessPerspective[] = [];
  const questions: BusinessQuestion[] = [];

  const addQuestion = (q: Omit<BusinessQuestion, "id" | "executionScope">) => {
    questions.push({
      ...q,
      id: `q_${questions.length + 1}`,
      measureAggregations: defaultMeasureAggregations(q.actionKind, q.measures, q.measureAggregations),
      executionScope:
        profile.source.sourceRowCount > profile.source.sampleRowCount
        ? "sample_preview"
          : "full_local_file"
    });
  };
  const isInventorySnapshot = profile.profile.documentType === "inventory_snapshot";

  // -------------------------------------------------------------------------
  // DIRTY EXPORT: data_quality_review has highest priority
  // -------------------------------------------------------------------------
  if (profile.profile.documentType === "dirty_operational_export") {
    perspectives.push(
      perspective(
        "dirty_review",
        "Clean and separate row types",
        "operations",
        "Dirty operational export signals were detected.",
        ["row_type"]
      )
    );
    addQuestion({
      label: "Review dirty operational export",
      userPrompt:
        "Which row types and dirty fields should be cleaned before analysis?",
      domain: "operations",
      perspectiveId: "dirty_review",
      requiredSignals: [],
      optionalSignals: ["row_type", "employee", "customer"],
      dimensions: [],
      measures: [],
      // fitScore 95 — must outrank all aggregate questions for dirty exports
      fitScore: 95,
      actionKind: "data_quality_review",
      caveats: profile.quality.dirtySignals.map(s => s.message)
    });
  }

  // -------------------------------------------------------------------------
  // BLOCKED: empty schema — no questions can be generated
  // -------------------------------------------------------------------------
  if (profile.quality.blockedReasons.length > 0) {
    return { lenses: buildBusinessLenses(profile, signals, questions), perspectives, questions };
  }

  // -------------------------------------------------------------------------
  // REVENUE domain
  // -------------------------------------------------------------------------
  if (profile.profile.detectedDomains.includes("revenue") && !isInventorySnapshot) {
    perspectives.push(
      perspective(
        "revenue_money",
        "Revenue and money",
        "revenue",
        "Money/date/store fields were detected.",
        ["revenue", "date", "branch"]
      )
    );

    if (hasAny(signals, "revenue") && hasAny(signals, "date")) {
      addQuestion({
        label: "Revenue over time",
        userPrompt: "How does revenue or receivable amount change over time?",
        domain: "revenue",
        perspectiveId: "revenue_money",
        requiredSignals: ["revenue", "date"],
        optionalSignals: ["branch"],
        dimensions: [signalColumn(signals, "date") ?? "date"],
        measures: [signalColumn(signals, "revenue") ?? "revenue"],
        fitScore: fitScore(signals, ["revenue", "date"], 90),
        actionKind: "trend",
        caveats: []
      });
    }

    if (hasAny(signals, "revenue") && hasAny(signals, "branch")) {
      addQuestion({
        label: "Top stores or branches by revenue",
        userPrompt: "Which store/branch contributes the most money?",
        domain: "revenue",
        perspectiveId: "revenue_money",
        requiredSignals: ["revenue", "branch"],
        optionalSignals: [],
        dimensions: [signalColumn(signals, "branch") ?? "branch"],
        measures: [signalColumn(signals, "revenue") ?? "revenue"],
        fitScore: fitScore(signals, ["revenue", "branch"], 88),
        actionKind: "group_by",
        caveats: []
      });
    }

    if (hasAny(signals, "employee") && hasAny(signals, "revenue")) {
      addQuestion({
        label: "Employee output by revenue",
        userPrompt: "Which employees generate the most revenue?",
        domain: "revenue",
        perspectiveId: "revenue_money",
        requiredSignals: ["employee", "revenue"],
        optionalSignals: ["branch"],
        dimensions: [signalColumn(signals, "employee") ?? "employee"],
        measures: [signalColumn(signals, "revenue") ?? "revenue"],
        fitScore: fitScore(signals, ["employee", "revenue"], 82),
        actionKind: "group_by",
        caveats: []
      });
    }

    if (hasAny(signals, "payment_method") && hasAny(signals, "revenue")) {
      addQuestion({
        label: "Payment method mix",
        userPrompt: "What is the value split between cash, installment, transfer, card, voucher, or other payment types?",
        domain: "revenue",
        perspectiveId: "revenue_money",
        requiredSignals: ["payment_method", "revenue"],
        optionalSignals: ["branch", "date"],
        dimensions: [signalColumn(signals, "payment_method") ?? "payment"],
        measures: [signalColumn(signals, "revenue") ?? "revenue"],
        fitScore: fitScore(signals, ["payment_method", "revenue"], 84),
        actionKind: "group_by",
        caveats: []
      });
    } else if (hasAny(signals, "payment_cash") || hasAny(signals, "payment_card")) {
      addQuestion({
        label: "Payment method mix",
        userPrompt: "What is the split between cash, card, and other payment types?",
        domain: "revenue",
        perspectiveId: "revenue_money",
        requiredSignals: [],
        optionalSignals: ["payment_cash", "payment_card"],
        dimensions: [],
        measures: [
          signalColumn(signals, "payment_cash"),
          signalColumn(signals, "payment_card")
        ].filter(Boolean) as string[],
        fitScore: 78,
        actionKind: "table_preview",
        caveats: ["Payment fields are available; aggregate payment-mix SQL is not implemented yet, so this opens an evidence preview."]
      });
    }

    const paymentProfitMeasures = signalColumns(signals, [
      "revenue",
      "gross_profit",
      "receivable",
      "invoice_total",
      "margin_pct"
    ]);
    if (hasAny(signals, "payment_method") && paymentProfitMeasures.length > 0) {
      addQuestion({
        label: "Payment profitability and receivable mix",
        userPrompt: "Do payment methods differ by revenue, profit, margin, invoice total, or receivable exposure?",
        domain: "revenue",
        perspectiveId: "revenue_money",
        requiredSignals: ["payment_method"],
        optionalSignals: ["revenue", "gross_profit", "receivable", "invoice_total", "margin_pct", "branch", "date"],
        dimensions: [signalColumn(signals, "payment_method") ?? "payment"],
        measures: paymentProfitMeasures,
        measureAggregations: Object.fromEntries(
          paymentProfitMeasures.map(measure => [
            measure,
            measure === signalColumn(signals, "margin_pct") ? "AVG" : "SUM"
          ])
        ),
        fitScore: Math.min(94, 74 + paymentProfitMeasures.length * 4),
        actionKind: "group_by",
        caveats: []
      });
    }
  }

  // -------------------------------------------------------------------------
  // OPERATIONS domain
  // -------------------------------------------------------------------------
  if (profile.profile.detectedDomains.includes("operations")) {
    perspectives.push(
      perspective(
        "ops_flow",
        "Operational flow",
        "operations",
        "Route/trip/status/user timing fields were detected.",
        ["route", "trip", "on_time_status", "waiting_time"]
      )
    );

    if (hasAny(signals, "on_time_status") && (hasAny(signals, "route") || hasAny(signals, "trip"))) {
      addQuestion({
        label: "On-time status by route or trip",
        userPrompt: "Which routes or trips create late/on-time problems?",
        domain: "operations",
        perspectiveId: "ops_flow",
        requiredSignals: ["on_time_status"],
        optionalSignals: ["route", "trip", "vehicle"],
        dimensions: [
          signalColumn(signals, "route") ?? signalColumn(signals, "trip") ?? "route"
        ],
        measures: [signalColumn(signals, "on_time_status") ?? "on_time_status"],
        fitScore: 86,
        actionKind: "group_by",
        caveats: []
      });
    }

    const carrierMeasures = signalColumns(signals, ["delivery_fee", "quantity", "total_cost"]);
    if (hasAny(signals, "carrier") && carrierMeasures.length > 0) {
      addQuestion({
        label: "Carrier cost impact",
        userPrompt: "How do carriers compare by delivery fee, fulfilled volume, and operational cost exposure?",
        domain: "operations",
        perspectiveId: "ops_flow",
        requiredSignals: ["carrier"],
        optionalSignals: ["delivery_fee", "delivery_status", "quantity", "total_cost"],
        dimensions: [signalColumn(signals, "carrier") ?? "carrier"],
        measures: carrierMeasures,
        fitScore: Math.min(94, 78 + carrierMeasures.length * 4),
        actionKind: "group_by",
        caveats: []
      });
    }

    if (hasAny(signals, "delivery_status")) {
      const deliveryStatusColumn = signalColumn(signals, "delivery_status") ?? "delivery_status";
      addQuestion({
        label: "Delivery completion mix",
        userPrompt: "What share of deliveries are completed, retried, failed, or still in progress?",
        domain: "operations",
        perspectiveId: "ops_flow",
        requiredSignals: ["delivery_status"],
        optionalSignals: ["carrier", "delivery_fee", "quantity"],
        dimensions: [deliveryStatusColumn],
        measures: ["record_count"],
        derivedMeasures: [
          {
            id: "delivery_completion_rate",
            label: "Delivery completion rate",
            type: "positive_rate",
            sourceColumn: deliveryStatusColumn,
            positiveValues: [
              "Đã giao",
              "Da giao",
              "Hoàn tất",
              "Hoan tat",
              "Delivered",
              "Completed",
              "Complete",
              "Fulfilled",
              "Đúng hẹn",
              "Dung hen",
              "On time",
              "Ontime",
              "Timely"
            ],
            numeratorLabel: "Completed deliveries",
            denominatorLabel: "Total deliveries"
          }
        ],
        measureAggregations: { record_count: "COUNT" },
        fitScore: hasAny(signals, "carrier") ? 90 : 84,
        actionKind: "group_by",
        caveats: []
      });
    }

    if (hasAny(signals, "waiting_time")) {
      addQuestion({
        label: "Waiting time hotspots",
        userPrompt: "Where is waiting time highest?",
        domain: "operations",
        perspectiveId: "ops_flow",
        requiredSignals: ["waiting_time"],
        optionalSignals: ["route", "trip", "employee"],
        dimensions: [
          signalColumn(signals, "route") ??
            signalColumn(signals, "employee") ??
            "entity"
        ],
        measures: [signalColumn(signals, "waiting_time") ?? "waiting_time"],
        fitScore: 84,
        actionKind: "group_by",
        caveats: []
      });
    }

    if (hasAny(signals, "vehicle") || hasAny(signals, "driver")) {
      const onTimeColumn = signalColumn(signals, "on_time_status");
      addQuestion({
        label: "Vehicle or driver punctuality",
        userPrompt: "Which vehicles or drivers are on time, late, or need follow-up?",
        domain: "operations",
        perspectiveId: "ops_flow",
        requiredSignals: [],
        optionalSignals: ["vehicle", "driver", "on_time_status"],
        dimensions: [
          signalColumn(signals, "vehicle") ??
            signalColumn(signals, "driver") ??
            "vehicle"
        ],
        measures: ["record_count"],
        measureAggregations: { record_count: "COUNT" },
        derivedMeasures: onTimeColumn ? [
          {
            id: "on_time_rate",
            label: "On-time rate",
            type: "positive_rate",
            sourceColumn: onTimeColumn,
            positiveValues: [
              "Có",
              "Co",
              "Đúng hẹn",
              "Dung hen",
              "Đúng giờ",
              "Dung gio",
              "On time",
              "Ontime",
              "Timely",
              "Yes"
            ],
            numeratorLabel: "On-time records",
            denominatorLabel: "Total records"
          }
        ] : undefined,
        fitScore: 76,
        actionKind: "group_by",
        caveats: []
      });
    }

    if (hasAny(signals, "weight") || hasAny(signals, "capacity")) {
      addQuestion({
        label: "Weight and capacity by route or trip",
        userPrompt: "What load/weight is handled per route or trip?",
        domain: "operations",
        perspectiveId: "ops_flow",
        requiredSignals: [],
        optionalSignals: ["weight", "capacity", "route", "trip"],
        dimensions: [
          signalColumn(signals, "route") ?? signalColumn(signals, "trip") ?? "route"
        ],
        measures: [
          signalColumn(signals, "weight") ??
            signalColumn(signals, "capacity") ??
            "weight"
        ],
        fitScore: 72,
        actionKind: "group_by",
        caveats: []
      });
    }
  }

  // -------------------------------------------------------------------------
  // INVENTORY domain
  // -------------------------------------------------------------------------
  if (profile.profile.detectedDomains.includes("inventory")) {
    perspectives.push(
      perspective(
        "inventory_health",
        "Inventory and stock health",
        "inventory",
        "SKU/product/stock age/status fields were detected.",
        ["sku", "stock_age", "stock_status"]
      )
    );

    // Product group distribution (always available if inventory detected)
    const groupColumn = profile.columns.find(c =>
      /nhóm|group|category|loại/i.test(c.name)
    )?.name;

    if (groupColumn) {
      addQuestion({
        label: "Product group distribution",
        userPrompt: "How many products are in each product group or category?",
        domain: "inventory",
        perspectiveId: "inventory_health",
        requiredSignals: ["sku"],
        optionalSignals: [],
        dimensions: [groupColumn],
        measures: [],
        fitScore: 80,
        actionKind: "distribution",
        caveats: []
      });
    }

    if (hasAny(signals, "stock_age")) {
      addQuestion({
        label: "Stock age distribution",
        userPrompt: "How long have products been in stock?",
        domain: "inventory",
        perspectiveId: "inventory_health",
        requiredSignals: ["stock_age"],
        optionalSignals: ["stock_status"],
        dimensions: [],
        measures: [signalColumn(signals, "stock_age") ?? "stock_age"],
        fitScore: 83,
        actionKind: "distribution",
        caveats: []
      });
    }

    if (hasAny(signals, "stock_status")) {
      addQuestion({
        label: "Stock status breakdown",
        userPrompt: "What proportion of stock is in each status?",
        domain: "inventory",
        perspectiveId: "inventory_health",
        requiredSignals: ["stock_status"],
        optionalSignals: ["sku"],
        dimensions: [signalColumn(signals, "stock_status") ?? "stock_status"],
        measures: [],
        fitScore: 81,
        actionKind: "distribution",
        caveats: []
      });
    }

    // Fallback: table preview of inventory if no fine signals
    if (!hasAny(signals, "stock_age") && !hasAny(signals, "stock_status") && hasAny(signals, "sku")) {
      addQuestion({
        label: "Product inventory table",
        userPrompt: "Show the product inventory as a table.",
        domain: "inventory",
        perspectiveId: "inventory_health",
        requiredSignals: ["sku"],
        optionalSignals: [],
        dimensions: [],
        measures: [],
        fitScore: 65,
        actionKind: "table_preview",
        caveats: ["No stock age or status columns detected; showing raw product list."]
      });
    }
  }

  // -------------------------------------------------------------------------
  // PERFORMANCE domain
  // -------------------------------------------------------------------------
  if (profile.profile.detectedDomains.includes("performance")) {
    perspectives.push(
      perspective(
        "performance_ranking",
        "Performance ranking",
        "performance",
        "KPI/ranking/achievement fields were detected.",
        ["kpi", "employee"]
      )
    );

    if (hasAny(signals, "kpi")) {
      addQuestion({
        label: "KPI or ranking by manager or employee",
        userPrompt: "Who achieves the highest KPI or ranking?",
        domain: "performance",
        perspectiveId: "performance_ranking",
        requiredSignals: ["kpi"],
        optionalSignals: ["employee"],
        dimensions: [
          signalColumn(signals, "employee") ??
            // Fallback: find a name-like column
            profile.columns.find(c => /tên|name|manager|quản lý/i.test(c.name))?.name ??
            "manager"
        ],
        measures: [signalColumn(signals, "kpi") ?? "kpi"],
        fitScore: 85,
        actionKind: "group_by",
        caveats: []
      });
    }

    // Region/area breakdown if available
    const regionColumn = profile.columns.find(c =>
      /khu vực|vùng|region|area|tỉnh|thành phố/i.test(c.name)
    )?.name;

    if (regionColumn && hasAny(signals, "kpi")) {
      addQuestion({
        label: "KPI by region or area",
        userPrompt: "Which region achieves the highest KPI?",
        domain: "performance",
        perspectiveId: "performance_ranking",
        requiredSignals: ["kpi"],
        optionalSignals: [],
        dimensions: [regionColumn],
        measures: [signalColumn(signals, "kpi") ?? "kpi"],
        fitScore: 79,
        actionKind: "group_by",
        caveats: []
      });
    }

    // Fallback: table preview
    if (!hasAny(signals, "kpi")) {
      addQuestion({
        label: "Management ranking table",
        userPrompt: "Show the full ranking table.",
        domain: "performance",
        perspectiveId: "performance_ranking",
        requiredSignals: [],
        optionalSignals: [],
        dimensions: [],
        measures: [],
        fitScore: 60,
        actionKind: "table_preview",
        caveats: ["No KPI or achievement columns detected; showing raw table."]
      });
    }
  }

  // -------------------------------------------------------------------------
  // CUSTOMER domain — only as a secondary/demoted question when dominated
  // -------------------------------------------------------------------------
  const customerSignal = signals.find(s => s.canonicalId === "customer");
  if (customerSignal) {
    const isDominated =
      customerSignal.dominanceRatio != null && customerSignal.dominanceRatio > 0.9;

    if (!isDominated && has(signals, "customer")) {
      perspectives.push(
        perspective(
          "customer_dist",
          "Customer distribution",
          "customer",
          "Customer dimension is usable with reasonable distribution.",
          ["customer"]
        )
      );
      addQuestion({
        label: "Customer distribution",
        userPrompt: "Which customers generate the most transactions?",
        domain: "customer",
        perspectiveId: "customer_dist",
        requiredSignals: ["customer"],
        optionalSignals: ["revenue"],
        dimensions: [customerSignal.physicalColumn],
        measures: [],
        fitScore: 55,
        actionKind: "distribution",
        caveats: []
      });
    } else if (isDominated) {
      // Demoted — very low fitScore so it sorts to bottom
      addQuestion({
        label: "Customer field is low-value for default distribution",
        userPrompt:
          "Customer values are dominated by one value, so this is not recommended as the primary analysis.",
        domain: "customer",
        perspectiveId: "customer_low_value",
        requiredSignals: ["customer"],
        optionalSignals: [],
        dimensions: [customerSignal.physicalColumn],
        measures: [],
        fitScore: 5,
        actionKind: "table_preview",
        caveats: ["Dominant customer value makes a distribution chart low-value."]
      });
    }
  }

  // -------------------------------------------------------------------------
  // FINANCE domain — NOT IMPLEMENTED
  //
  // The finance domain is declared in DomainId but has no signal rules or
  // question templates yet. It would require signals such as:
  //   - budget, cost, expense, profit, margin, fiscal_period
  //
  // Until those signals are implemented in signal-detector.ts, no finance
  // questions are generated. This is intentional and explicit — do NOT
  // claim finance domain is covered without this block having real logic.
  //
  // TODO: Add finance signal rules and question templates in a future phase.
  // -------------------------------------------------------------------------
  // if (profile.profile.detectedDomains.includes("finance")) {
  //   // Not implemented
  // }

  return {
    lenses: buildBusinessLenses(profile, signals, questions),
    perspectives,
    questions: questions.sort((a, b) => b.fitScore - a.fitScore)
  };
}
