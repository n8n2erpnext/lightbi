import { describe, expect, it } from "vitest";
import { createSingleSourceBAOverview } from "./single-source-ba-overview";

const rows = [
  { ShipmentID: "S-1", Route: "North", ETA: "2026-06-01T10:00:00", Actual: "2026-06-01T10:10:00", OnTime: "Late" },
  { ShipmentID: "S-2", Route: "South", ETA: "2026-06-01T11:00:00", Actual: "2026-06-01T10:55:00", OnTime: "On time" },
  { ShipmentID: "S-3", Route: "North", ETA: "2026-06-02T09:00:00", Actual: "2026-06-02T09:00:00", OnTime: "On time" },
];

const action = {
  id: "operations:schedule_adherence",
  opportunityName: "Schedule adherence by route",
  dimensions: ["route"],
  measures: ["record_count"],
};

const confirmed = { confidence: 100, semanticSource: "registry" as const, resolutionState: "confirmed" as const };
const mbProbable = { confidence: 75, semanticSource: "micro_brain" as const, resolutionState: "probable" as const };

function semanticFields(includeActual = true) {
  return [
    { canonicalId: "shipment", physicalColumn: "ShipmentID", role: "identifier", ...confirmed },
    { canonicalId: "route", physicalColumn: "Route", role: "dimension", ...confirmed },
    { canonicalId: "eta", physicalColumn: "ETA", role: "time", ...mbProbable },
    ...(includeActual ? [{ canonicalId: "actual_time", physicalColumn: "Actual", role: "time", ...confirmed }] : []),
    { canonicalId: "on_time_status", physicalColumn: "OnTime", role: "status", ...confirmed },
  ];
}

describe("Deep BA consumes MB only through resolved semantic evidence", () => {
  it("uses MB-recovered ETA to complete schedule evidence but caps the finding at medium confidence", () => {
    const overview = createSingleSourceBAOverview(rows, { analysisAction: action, semanticFields: semanticFields() });
    const schedule = overview?.investigation?.decompositions.find((item) => item.id === "schedule_adherence");
    const why = overview?.investigation?.whyItMayHaveHappened.find((item) => item.title === "Schedule adherence evidence");
    expect(schedule?.status).toBe("supported");
    expect(schedule?.components).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "ETA / promised time", field: "ETA", status: "observed" }),
      expect.objectContaining({ label: "Actual completion time", field: "Actual", status: "observed" }),
      expect.objectContaining({ label: "On-time status", field: "OnTime", status: "observed" }),
    ]));
    expect(why?.basis).toBe("hypothesis");
    expect(why?.confidence).toBe("medium");
  });

  it("keeps schedule adherence partial when an observed input is missing instead of inventing it", () => {
    const overview = createSingleSourceBAOverview(rows.map(({ Actual: _actual, ...row }) => row), {
      analysisAction: action,
      semanticFields: semanticFields(false),
    });
    const schedule = overview?.investigation?.decompositions.find((item) => item.id === "schedule_adherence");
    const why = overview?.investigation?.whyItMayHaveHappened.find((item) => item.title === "Schedule adherence evidence");
    expect(schedule?.status).toBe("partial");
    expect(schedule?.components.find((item) => item.label === "Actual completion time")).toMatchObject({ status: "missing" });
    expect(why?.basis).toBe("needs_verification");
    expect(why?.statement).toContain("Verify Actual completion time");
  });
  it("reuses the same MB provenance inside a selected Step 2 subset without leaking population evidence", () => {
    const selectedRows = rows.filter((row) => row.Route === "North");
    const overview = createSingleSourceBAOverview(selectedRows, {
      sourceRowCount: selectedRows.length,
      analysisAction: action,
      semanticFields: semanticFields(),
    });
    const why = overview?.investigation?.whyItMayHaveHappened.find((item) => item.title === "Schedule adherence evidence");
    expect(why?.confidence).toBe("medium");
    expect(why?.evidenceRows.length).toBeGreaterThan(0);
    expect(why?.evidenceRows.every((row) => row.values.Route === "North")).toBe(true);
    expect(overview?.rowCount).toBe(selectedRows.length);
  });

});
