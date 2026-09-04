import { describe, expect, it } from "vitest";
import type { DatasetUnderstandingResult } from "./understanding-next/contracts";
import {
  buildFocusSubjectComparison,
  createFocusSubjectSelection,
  deriveFocusSubjectCandidates,
  deriveFocusSubjectNarrative,
  resolveFocusAutoPerspectiveId,
  searchFocusSubjectOptions,
} from "./focus-subject-analysis";

const rows = Array.from({ length: 30 }, (_, index) => {
  const employeeId = String(24090 + index);
  return {
    "MSNV QUẢN LÝ": employeeId,
    "HỌ TÊN QUẢN LÝ":
      employeeId === "24128" ? "Thái Đăng Duy" : `Manager ${index + 1}`,
    RANKING: index + 1,
    "TỔNG SAO": index % 6,
    "TRUNG BÌNH ĐIỂM 4 TIÊU CHÍ": 7 + index / 10,
    "KHU VỰC": `Region ${(index % 4) + 1}`,
  };
}).concat([
  {
    "MSNV QUẢN LÝ": "24128",
    "HỌ TÊN QUẢN LÝ": "Thái Đăng Duy",
    RANKING: 1769,
    "TỔNG SAO": 0,
    "TRUNG BÌNH ĐIỂM 4 TIÊU CHÍ": 8.7667,
    "KHU VỰC": "Region 2",
  },
]);

const understanding = {
  signals: [
    {
      canonicalId: "employee_id",
      label: "Employee ID",
      domain: "performance",
      physicalColumn: "MSNV QUẢN LÝ",
      confidence: 0.99,
      evidence: [],
      cardinality: 30,
      role: "identifier",
      usableForDefaultQuestion: true,
    },
    {
      canonicalId: "manager",
      label: "Manager",
      domain: "performance",
      physicalColumn: "HỌ TÊN QUẢN LÝ",
      confidence: 0.98,
      evidence: [],
      cardinality: 30,
      role: "dimension",
      usableForDefaultQuestion: true,
    },
    {
      canonicalId: "performance_rank",
      label: "Performance Rank",
      domain: "performance",
      physicalColumn: "RANKING",
      confidence: 0.99,
      evidence: [],
      cardinality: 30,
      role: "dimension",
      usableForDefaultQuestion: true,
    },
    {
      canonicalId: "performance_star_total",
      label: "Performance Star Total",
      domain: "performance",
      physicalColumn: "TỔNG SAO",
      confidence: 0.96,
      evidence: [],
      cardinality: 6,
      role: "measure",
      usableForDefaultQuestion: true,
    },
    {
      canonicalId: "quality_score",
      label: "Quality Score",
      domain: "performance",
      physicalColumn: "TRUNG BÌNH ĐIỂM 4 TIÊU CHÍ",
      confidence: 0.97,
      evidence: [],
      cardinality: 30,
      role: "measure",
      usableForDefaultQuestion: true,
    },
  ],
} as DatasetUnderstandingResult;

describe("Focus Subject Analysis experiment", () => {
  it("projects the understood employee identifier with its manager-name companion and rejects ranking as a focus field", () => {
    const candidates = deriveFocusSubjectCandidates(understanding, rows);
    const employee = candidates.find(
      (candidate) => candidate.canonicalId === "employee_id",
    );
    expect(employee).toBeDefined();
    expect(employee?.field).toBe("MSNV QUẢN LÝ");
    expect(employee?.labelField).toBe("HỌ TÊN QUẢN LÝ");
    expect(candidates.some((candidate) => candidate.field === "RANKING")).toBe(
      false,
    );
  });

  it("filters missing-like placeholders out of focus options", () => {
    const routeUnderstanding = {
      signals: [
        {
          canonicalId: "route",
          label: "Route",
          domain: "operations",
          physicalColumn: "Tuyến xe",
          confidence: 0.99,
          evidence: [],
          cardinality: 3,
          role: "dimension",
          usableForDefaultQuestion: true,
        },
      ],
    } as DatasetUnderstandingResult;
    const candidates = deriveFocusSubjectCandidates(routeUnderstanding, [
      { "Tuyến xe": "N/A" },
      { "Tuyến xe": "R1" },
      { "Tuyến xe": "R2" },
    ]);
    expect(candidates[0]?.options.map((option) => option.value)).toEqual([
      "R1",
      "R2",
    ]);
  });

  it("offers driver and vehicle dimensions as operational focus subjects when Understanding has evidence", () => {
    const opsUnderstanding = {
      signals: [
        {
          canonicalId: "driver",
          label: "Driver",
          domain: "operations",
          physicalColumn: "Tên lái xe",
          confidence: 0.93,
          evidence: ["semantic:driver"],
          cardinality: 2,
          role: "dimension",
          usableForDefaultQuestion: true,
        },
        {
          canonicalId: "vehicle",
          label: "Vehicle",
          domain: "operations",
          physicalColumn: "Biển kiểm soát",
          confidence: 0.92,
          evidence: ["semantic:vehicle"],
          cardinality: 2,
          role: "dimension",
          usableForDefaultQuestion: true,
        },
      ],
    } as DatasetUnderstandingResult;
    const candidates = deriveFocusSubjectCandidates(opsUnderstanding, [
      { "Tên lái xe": "Driver A", "Biển kiểm soát": "29A-001" },
      { "Tên lái xe": "Driver B", "Biển kiểm soát": "29A-002" },
    ]);
    expect(candidates.map((candidate) => candidate.canonicalId)).toEqual(
      expect.arrayContaining(["driver", "vehicle"]),
    );
  });

  it("finds a subject by either identifier or human label without filtering the comparison population", () => {
    const candidate = deriveFocusSubjectCandidates(understanding, rows).find(
      (item) => item.canonicalId === "employee_id",
    )!;
    const byId = searchFocusSubjectOptions(candidate, "24128");
    const byName = searchFocusSubjectOptions(candidate, "thái đăng duy");
    expect(byId[0]?.displayLabel).toBe("24128 — Thái Đăng Duy");
    expect(byName[0]?.value).toBe("24128");

    const subject = createFocusSubjectSelection(
      candidate,
      byId[0],
      understanding,
    );
    const comparison = buildFocusSubjectComparison(rows, subject);
    expect(comparison?.populationRowCount).toBe(rows.length);
    expect(comparison?.matchedSubjectRowCount).toBe(1);
    expect(comparison?.rankValue).toBeTruthy();
    expect(comparison?.metrics.map((metric) => metric.field)).toEqual(
      expect.arrayContaining(["TỔNG SAO", "TRUNG BÌNH ĐIỂM 4 TIÊU CHÍ"]),
    );
  });

  it("uses only a semantically related governed lens for focus-only mode", () => {
    const candidate = deriveFocusSubjectCandidates(understanding, rows).find(
      (item) => item.canonicalId === "employee_id",
    )!;
    const subject = createFocusSubjectSelection(
      candidate,
      searchFocusSubjectOptions(candidate, "24128")[0],
      understanding,
    );
    expect(
      resolveFocusAutoPerspectiveId(subject, [
        {
          perspectiveId: "revenue",
          state: "governed_action_available",
          matchedSignalIds: ["revenue"],
        },
        {
          perspectiveId: "performance",
          state: "governed_action_available",
          matchedSignalIds: ["employee_id", "quality_score"],
        },
      ]),
    ).toBe("performance");
    expect(
      resolveFocusAutoPerspectiveId(
        { ...subject, domain: "customer", canonicalId: "unknown_entity" },
        [
          {
            perspectiveId: "revenue",
            state: "governed_action_available",
            matchedSignalIds: ["revenue"],
          },
        ],
      ),
    ).toBeNull();
  });

  it("aggregates repeated entity rows before benchmarking revenue focus", () => {
    const storeRows = [
      { Store: "A", Revenue: 100 },
      { Store: "A", Revenue: 150 },
      { Store: "B", Revenue: 80 },
      { Store: "B", Revenue: 70 },
      { Store: "C", Revenue: 400 },
    ];
    const subject = {
      candidateId: "branch:Store",
      canonicalId: "branch",
      domain: "revenue" as const,
      field: "Store",
      value: "A",
      displayLabel: "Store A",
      metricFields: ["Revenue"],
      metricBindings: [{ canonicalId: "revenue", field: "Revenue" }],
    };
    const action = {
      id: "revenue-by-store",
      opportunityName: "Revenue by store",
      label: "Revenue by store",
      description: "",
      actionType: "group_by" as const,
      dimensions: ["Store"],
      measures: ["Revenue"],
      measureAggregations: { Revenue: "SUM" as const },
      confidenceScore: 100,
      source: "dataset_understanding" as const,
    };
    const comparison = buildFocusSubjectComparison(
      storeRows,
      subject,
      action,
      1,
    )!;
    const revenue = comparison.metrics.find(
      (metric) => metric.field === "Revenue",
    )!;
    expect(revenue.subjectValue).toBe(250);
    expect(revenue.populationAverage).toBeCloseTo((250 + 150 + 400) / 3);
    expect(revenue.topAverage).toBe(400);
    expect(revenue.bottomAverage).toBe(150);
    expect(revenue.populationCount).toBe(3);
  });

  it("computes subject versus average/top/bottom deterministically while no-focus remains represented by no selection", () => {
    const candidate = deriveFocusSubjectCandidates(understanding, rows).find(
      (item) => item.canonicalId === "employee_id",
    )!;
    const option = searchFocusSubjectOptions(candidate, "24128")[0];
    const subject = createFocusSubjectSelection(
      candidate,
      option,
      understanding,
    );
    const first = buildFocusSubjectComparison(rows, subject);
    const second = buildFocusSubjectComparison(rows, subject);
    expect(first).toEqual(second);
    expect(
      first?.metrics.every((metric) =>
        Number.isFinite(metric.populationAverage),
      ),
    ).toBe(true);
    expect(
      first?.metrics.every(
        (metric) => metric.topAverage >= metric.bottomAverage,
      ),
    ).toBe(true);
    expect(
      buildFocusSubjectComparison(rows, { ...subject, value: "missing" }),
    ).toBeNull();
  });
});

describe("Focus Subject full-source header normalization", () => {
  it("matches a selected subject when the runtime parser lowercases verified headers", () => {
    const candidate = deriveFocusSubjectCandidates(understanding, rows).find(
      (item) => item.canonicalId === "employee_id",
    )!;
    const subject = createFocusSubjectSelection(
      candidate,
      searchFocusSubjectOptions(candidate, "24128")[0],
      understanding,
    );
    const runtimeRows = rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key.toLocaleLowerCase(),
          value,
        ]),
      ),
    );
    const comparison = buildFocusSubjectComparison(runtimeRows, subject);
    expect(comparison?.matchedSubjectRowCount).toBe(1);
    expect(comparison?.rankValue).toBe("1769");
    expect(
      comparison?.metrics.some(
        (metric) => metric.field === "TRUNG BÌNH ĐIỂM 4 TIÊU CHÍ",
      ),
    ).toBe(true);
  });
});

describe("Focus Subject selected-measure priority", () => {
  it("maps a governed aggregate metric id back to its physical focus metric", () => {
    const candidate = deriveFocusSubjectCandidates(understanding, rows).find(
      (item) => item.canonicalId === "employee_id",
    )!;
    const subject = createFocusSubjectSelection(
      candidate,
      searchFocusSubjectOptions(candidate, "24128")[0],
      understanding,
    );
    const action = {
      id: "quality-summary",
      opportunityName: "What is the governed average quality score?",
      label: "Quality",
      description: "",
      actionType: "summary" as const,
      dimensions: [],
      measures: ["average_quality_score"],
      measureAggregations: { average_quality_score: "AVG" as const },
      confidenceScore: 100,
      source: "dataset_understanding" as const,
    };
    const comparison = buildFocusSubjectComparison(rows, subject, action)!;
    expect(comparison.metrics[0]?.field).toBe("TRUNG BÌNH ĐIỂM 4 TIÊU CHÍ");
    expect(comparison.metrics[0]?.subjectValue).toBeCloseTo(8.7667);
  });
});

describe("Focus Subject semantic coherence", () => {
  it("deduplicates case-variant metric headers and lets governed AVG override an unsafe action SUM", () => {
    const candidate = deriveFocusSubjectCandidates(understanding, rows).find(
      (item) => item.canonicalId === "employee_id",
    )!;
    const subject = createFocusSubjectSelection(
      candidate,
      searchFocusSubjectOptions(candidate, "24128")[0],
      understanding,
    );
    const runtimeRows = rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key.toLocaleLowerCase(),
          value,
        ]),
      ),
    );
    const duplicateSubjectRows = runtimeRows.concat([
      {
        "msnv quản lý": "24128",
        "họ tên quản lý": "Thái Đăng Duy",
        ranking: 1769,
        "tổng sao": 0,
        "trung bình điểm 4 tiêu chí": 9.2,
        "khu vực": "Region 2",
      },
    ]);
    const action = {
      id: "quality-summary",
      opportunityName: "What is the governed average quality score?",
      label: "Quality",
      description: "",
      actionType: "summary" as const,
      dimensions: [],
      measures: ["average_quality_score"],
      measureAggregations: { average_quality_score: "SUM" as const },
      confidenceScore: 100,
      source: "dataset_understanding" as const,
    };
    const comparison = buildFocusSubjectComparison(
      duplicateSubjectRows,
      subject,
      action,
    )!;
    const normalized = comparison.metrics.map((metric) =>
      metric.field.toLocaleLowerCase(),
    );
    expect(new Set(normalized).size).toBe(normalized.length);
    expect(comparison.metrics[0]?.aggregation).toBe("AVG");
    expect(comparison.metrics[0]?.subjectValue).toBeCloseTo((8.7667 + 9.2) / 2);
    expect(comparison.metrics[0]?.topAverage).toBeLessThanOrEqual(10);
  });

  it("builds one narrative that stays anchored to the selected subject", () => {
    const candidate = deriveFocusSubjectCandidates(understanding, rows).find(
      (item) => item.canonicalId === "employee_id",
    )!;
    const subject = createFocusSubjectSelection(
      candidate,
      searchFocusSubjectOptions(candidate, "24128")[0],
      understanding,
    );
    const comparison = buildFocusSubjectComparison(rows, subject)!;
    const narrative = deriveFocusSubjectNarrative(comparison);
    expect(narrative.headline).toContain("24128");
    expect(narrative.summary).toContain("24128");
    expect(
      narrative.insights.every(
        (item) =>
          item.statement.includes("24128") || item.id === "secondary-signal",
      ),
    ).toBe(true);
    expect(
      narrative.followUpQuestions.every(
        (question) =>
          question.includes("24128") || question.includes("recorded rank"),
      ),
    ).toBe(true);
  });
});

describe("Focus Subject cross-domain regression", () => {
  it("keeps top and bottom cohorts disjoint when the comparison population is smaller than twenty", () => {
    const storeRows = Array.from({ length: 8 }, (_, index) => ({
      Store: `S${index + 1}`,
      Revenue: (index + 1) * 100,
    }));
    const subject = {
      candidateId: "branch:Store",
      canonicalId: "branch",
      domain: "revenue" as const,
      field: "Store",
      value: "S8",
      displayLabel: "S8",
      metricFields: ["Revenue"],
      metricBindings: [{ canonicalId: "revenue", field: "Revenue" }],
    };
    const action = {
      id: "revenue",
      opportunityName: "Revenue",
      label: "Revenue",
      description: "",
      actionType: "group_by" as const,
      dimensions: ["Store"],
      measures: ["Revenue"],
      measureAggregations: { Revenue: "SUM" as const },
      confidenceScore: 100,
      source: "dataset_understanding" as const,
    };
    const metric = buildFocusSubjectComparison(storeRows, subject, action)!
      .metrics[0];
    expect(metric.cohortSize).toBe(4);
    expect(metric.topAverage).toBe(650);
    expect(metric.bottomAverage).toBe(250);
    expect(metric.topAverage).not.toBe(metric.populationAverage);
  });

  it("normalizes Excel serial dates before describing focus trend", () => {
    const storeRows = [
      { Store: "A", OrderDate: 41587, Revenue: 100 },
      { Store: "A", OrderDate: 41588, Revenue: 150 },
      { Store: "B", OrderDate: 41587, Revenue: 80 },
      { Store: "B", OrderDate: 41588, Revenue: 120 },
    ];
    const subject = {
      candidateId: "branch:Store",
      canonicalId: "branch",
      domain: "revenue" as const,
      field: "Store",
      value: "A",
      displayLabel: "A",
      metricFields: ["Revenue"],
      metricBindings: [{ canonicalId: "revenue", field: "Revenue" }],
      dimensionBindings: [
        {
          canonicalId: "time_period",
          field: "OrderDate",
          role: "time" as const,
          cardinality: 2,
        },
      ],
    };
    const action = {
      id: "trend",
      opportunityName: "Revenue trend",
      label: "Revenue trend",
      description: "",
      actionType: "trend" as const,
      dimensions: ["time_period"],
      measures: ["sales_revenue"],
      confidenceScore: 100,
      source: "dataset_understanding" as const,
    };
    const trend = buildFocusSubjectComparison(
      storeRows,
      subject,
      action,
    )!.trend!;
    expect(trend.firstPeriod).toBe("2013-11-09");
    expect(trend.lastPeriod).toBe("2013-11-10");
    expect(trend.subjectChangePct).toBe(50);
  });

  it("uses governed distinct delivery identity for a focused status distribution", () => {
    const deliveryRows = [
      { Warehouse: "A", ShipmentID: "S1", Status: "Done" },
      { Warehouse: "A", ShipmentID: "S1", Status: "Done" },
      { Warehouse: "A", ShipmentID: "S2", Status: "Retry" },
      { Warehouse: "B", ShipmentID: "S3", Status: "Done" },
    ];
    const subject = {
      candidateId: "warehouse:Warehouse",
      canonicalId: "warehouse",
      domain: "operations" as const,
      field: "Warehouse",
      value: "A",
      displayLabel: "A",
      metricFields: [],
      metricBindings: [],
      dimensionBindings: [
        {
          canonicalId: "shipment",
          field: "ShipmentID",
          role: "identifier" as const,
          cardinality: 3,
        },
        {
          canonicalId: "delivery_status",
          field: "Status",
          role: "status" as const,
          cardinality: 2,
        },
      ],
    };
    const action = {
      id: "delivery-status",
      opportunityName: "Delivery status",
      label: "Delivery status",
      description: "",
      actionType: "distribution" as const,
      dimensions: ["delivery_status"],
      measures: ["delivery_count"],
      confidenceScore: 100,
      source: "dataset_understanding" as const,
    };
    const comparison = buildFocusSubjectComparison(
      deliveryRows,
      subject,
      action,
    )!;
    expect(comparison.metrics[0]?.field).toBe("Delivery count");
    expect(comparison.metrics[0]?.subjectValue).toBe(2);
    expect(
      comparison.distribution?.groups.find((group) => group.label === "Done")
        ?.subjectValue,
    ).toBe(1);
  });

  it("does not invent percentage mix from an average-valued metric", () => {
    const rows = [
      { Warehouse: "A", Customer: "X", Charge: 100 },
      { Warehouse: "A", Customer: "X", Charge: 200 },
      { Warehouse: "A", Customer: "Y", Charge: 100 },
      { Warehouse: "B", Customer: "X", Charge: 80 },
    ];
    const subject = {
      candidateId: "warehouse:Warehouse",
      canonicalId: "warehouse",
      domain: "operations" as const,
      field: "Warehouse",
      value: "A",
      displayLabel: "A",
      metricFields: ["Charge"],
      metricBindings: [{ canonicalId: "delivery_fee", field: "Charge" }],
      dimensionBindings: [
        {
          canonicalId: "customer",
          field: "Customer",
          role: "dimension" as const,
          cardinality: 2,
        },
      ],
    };
    const action = {
      id: "customer-value",
      opportunityName: "Customer value",
      label: "Customer value",
      description: "",
      actionType: "group_by" as const,
      dimensions: ["customer"],
      measures: ["delivery_fee"],
      measureAggregations: { delivery_fee: "AVG" as const },
      confidenceScore: 100,
      source: "dataset_understanding" as const,
    };
    const comparison = buildFocusSubjectComparison(rows, subject, action)!;
    expect(comparison.metrics[0]?.aggregation).toBe("AVG");
    expect(comparison.distribution).toBeUndefined();
  });

  it("maps legacy record_count to governed source-record count before numeric fallbacks", () => {
    const rows = [
      { Warehouse: "A", Customer: "X", Charge: 100 },
      { Warehouse: "A", Customer: "X", Charge: 200 },
      { Warehouse: "A", Customer: "Y", Charge: 100 },
      { Warehouse: "B", Customer: "X", Charge: 80 },
    ];
    const subject = {
      candidateId: "warehouse:Warehouse",
      canonicalId: "warehouse",
      domain: "operations" as const,
      field: "Warehouse",
      value: "A",
      displayLabel: "A",
      metricFields: ["Charge"],
      metricBindings: [{ canonicalId: "delivery_fee", field: "Charge" }],
      dimensionBindings: [
        {
          canonicalId: "customer",
          field: "Customer",
          role: "dimension" as const,
          cardinality: 2,
        },
      ],
    };
    const action = {
      id: "activity",
      opportunityName: "Activity volume by customer",
      label: "Activity",
      description: "",
      actionType: "group_by" as const,
      dimensions: ["customer"],
      measures: ["record_count"],
      confidenceScore: 100,
      source: "dataset_understanding" as const,
    };
    const comparison = buildFocusSubjectComparison(rows, subject, action)!;
    expect(comparison.metrics[0]?.field).toBe("Source record count");
    expect(comparison.metrics[0]?.subjectValue).toBe(3);
    expect(
      comparison.distribution?.groups.find((group) => group.label === "X")
        ?.subjectShare,
    ).toBeCloseTo(2 / 3);
    expect(
      comparison.distribution?.groups.find((group) => group.label === "Y")
        ?.subjectShare,
    ).toBeCloseTo(1 / 3);
  });

  it("binds SUM to the exact governed source field and never substitutes a nearby numeric column", () => {
    const salesRows = [
      { Store: "A", Revenue: 10, Revenue_Adjusted: 1000 },
      { Store: "A", Revenue: 15, Revenue_Adjusted: 2000 },
      { Store: "B", Revenue: 20, Revenue_Adjusted: 3000 },
      { Store: "B", Revenue: 25, Revenue_Adjusted: 4000 },
    ];
    const subject = {
      candidateId: "store:Store",
      canonicalId: "store",
      domain: "revenue" as const,
      field: "Store",
      value: "A",
      displayLabel: "A",
      metricFields: ["Revenue", "Revenue_Adjusted"],
      metricBindings: [
        { canonicalId: "revenue", field: "Revenue" },
        { canonicalId: "other_amount", field: "Revenue_Adjusted" },
      ],
      dimensionBindings: [],
    };
    const action = {
      id: "revenue",
      opportunityName: "Revenue",
      label: "Revenue",
      description: "",
      actionType: "summary" as const,
      dimensions: [],
      measures: ["sales_revenue"],
      measureAggregations: { sales_revenue: "SUM" as const },
      confidenceScore: 100,
      source: "dataset_understanding" as const,
    };
    const comparison = buildFocusSubjectComparison(salesRows, subject, action)!;
    expect(comparison.metrics[0]?.field).toBe("Revenue");
    expect(comparison.metrics[0]?.sourceField).toBe("Revenue");
    expect(comparison.metrics[0]?.aggregation).toBe("SUM");
    expect(comparison.metrics[0]?.subjectValue).toBe(25);
    expect(
      comparison.metrics.some((metric) => metric.field === "Revenue_Adjusted"),
    ).toBe(false);
  });

  it("fails numeric comparison closed when the requested action measure has no exact semantic binding", () => {
    const salesRows = [
      { Store: "A", Revenue_Adjusted: 1000 },
      { Store: "B", Revenue_Adjusted: 2000 },
    ];
    const subject = {
      candidateId: "store:Store",
      canonicalId: "store",
      domain: "revenue" as const,
      field: "Store",
      value: "A",
      displayLabel: "A",
      metricFields: ["Revenue_Adjusted"],
      metricBindings: [
        { canonicalId: "other_amount", field: "Revenue_Adjusted" },
      ],
      dimensionBindings: [],
    };
    const action = {
      id: "revenue",
      opportunityName: "Revenue",
      label: "Revenue",
      description: "",
      actionType: "summary" as const,
      dimensions: [],
      measures: ["sales_revenue"],
      measureAggregations: { sales_revenue: "SUM" as const },
      confidenceScore: 100,
      source: "dataset_understanding" as const,
    };
    const comparison = buildFocusSubjectComparison(salesRows, subject, action)!;
    expect(comparison.metrics).toHaveLength(0);
  });

  it("does not publish a distinct-identity percentage mix when one identity spans multiple groups", () => {
    const tripRows = [
      { Route: "A", Trip: "T1", Status: "On time" },
      { Route: "A", Trip: "T1", Status: "Late" },
      { Route: "B", Trip: "T2", Status: "On time" },
    ];
    const subject = {
      candidateId: "route:Route",
      canonicalId: "route",
      domain: "operations" as const,
      field: "Route",
      value: "A",
      displayLabel: "A",
      metricFields: [],
      metricBindings: [],
      dimensionBindings: [
        {
          canonicalId: "trip",
          field: "Trip",
          role: "identifier" as const,
          cardinality: 2,
        },
        {
          canonicalId: "on_time_status",
          field: "Status",
          role: "status" as const,
          cardinality: 2,
        },
      ],
    };
    const action = {
      id: "trip-status",
      opportunityName: "Trips by status",
      label: "Trips by status",
      description: "",
      actionType: "group_by" as const,
      dimensions: ["on_time_status"],
      measures: ["trip_count"],
      confidenceScore: 100,
      source: "dataset_understanding" as const,
    };
    const comparison = buildFocusSubjectComparison(tripRows, subject, action)!;
    expect(comparison.metrics[0]?.subjectValue).toBe(1);
    expect(comparison.distribution).toBeUndefined();
  });

  it("preserves exact waiting-time context beside a governed trip-count action", () => {
    const tripRows = [
      { Route: "A", Trip: "T1", Waiting: 100, Status: "Late" },
      { Route: "A", Trip: "T1", Waiting: 200, Status: "Late" },
      { Route: "B", Trip: "T2", Waiting: 50, Status: "On time" },
      { Route: "C", Trip: "T3", Waiting: 10, Status: "On time" },
    ];
    const subject = {
      candidateId: "route:Route", canonicalId: "route", domain: "operations" as const,
      field: "Route", value: "A", displayLabel: "A", metricFields: ["Waiting"],
      metricBindings: [{ canonicalId: "waiting_time", field: "Waiting" }],
      dimensionBindings: [
        { canonicalId: "trip", field: "Trip", role: "identifier" as const, cardinality: 3 },
        { canonicalId: "on_time_status", field: "Status", role: "status" as const, cardinality: 2 },
      ],
    };
    const action = {
      id: "trip-status", opportunityName: "Trips by status", label: "Trips by status", description: "",
      actionType: "group_by" as const, dimensions: ["on_time_status"], measures: ["trip_count"],
      confidenceScore: 100, source: "dataset_understanding" as const,
    };
    const comparison = buildFocusSubjectComparison(tripRows, subject, action)!;
    expect(comparison.metrics[0]?.field).toBe("Trip count");
    const waiting = comparison.metrics.find(metric => metric.canonicalId === "waiting_time");
    expect(waiting?.field).toBe("Waiting");
    expect(waiting?.aggregation).toBe("AVG");
    expect(waiting?.aggregationAuthority).toBe("semantic_signal_policy");
    expect(waiting?.subjectValue).toBe(150);
    expect(waiting?.percentile).toBe(100);
  });

});
