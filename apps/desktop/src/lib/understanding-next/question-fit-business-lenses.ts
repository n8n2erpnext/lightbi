import type { BusinessLens, BusinessQuestion, BusinessSignal, DatasetProfile } from "./contracts";
import { groupByCountOrientationQuestion, hasAny, orientationQuestion, signalColumn, signalColumns, tableOrientationQuestion } from "./question-fit-shared";

export function buildBusinessLenses(
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
