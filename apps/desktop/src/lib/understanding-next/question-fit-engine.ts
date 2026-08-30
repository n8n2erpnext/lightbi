import type {
  BusinessLens,
  BusinessPerspective,
  BusinessQuestion,
  BusinessSignal,
  DatasetProfile
} from "./contracts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { buildBusinessLenses } from "./question-fit-business-lenses";
import { defaultMeasureAggregations, fitScore, has, hasAny, perspective, signalColumn, signalColumns } from "./question-fit-shared";


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
