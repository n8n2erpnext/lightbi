import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { projectCanonicalArtifactToUnderstandingNext } from "./canonical-consumer-presentation-adapter";
import { buildFocusSubjectComparison } from "./focus-subject-analysis";
import { createFocusSubjectSelection, deriveFocusSubjectCandidates } from "./focus-subject-candidates";
import { getOrBuildCanonicalConsumerArtifact } from "./understanding-core/canonical-consumer-boundary";

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const FIXTURE_DIR = path.join(REPO_ROOT, "sample-corpus/versions/1.4.0/fixtures");

function rowsOf(name: string): Record<string, unknown>[] {
  const workbook = XLSX.read(fs.readFileSync(path.join(FIXTURE_DIR, name)), { raw: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error(`missing sheet: ${name}`);
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true })
    .filter((row) => Object.values(row).some((value) => value !== null && value !== undefined && String(value).trim() !== ""));
}

function mostFrequentRoute(rows: Record<string, unknown>[]): string {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const route = String(row["Tuyến xe"] ?? "").trim();
    if (route) counts.set(route, (counts.get(route) ?? 0) + 1);
  }
  return [...counts].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? "";
}

function canonicalUnderstanding(name: string, rows: Record<string, unknown>[]) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const artifact = getOrBuildCanonicalConsumerArtifact({
    datasetId: `focus-mb:${name}`,
    sourceKind: "local_file",
    sourceLabel: name,
    columns,
    rows,
    sourceRowCount: rows.length,
    sheet: "NhapXuatDungGioTTKT",
  });
  if (artifact.status !== "valid") throw new Error(`canonical artifact invalid: ${artifact.blockers.join(",")}`);
  return projectCanonicalArtifactToUnderstandingNext(artifact);
}

const action = {
  id: "trip-status",
  opportunityName: "Trips by on-time status",
  label: "Trips by on-time status",
  description: "",
  actionType: "group_by" as const,
  dimensions: ["on_time_status"],
  measures: ["trip_count"],
  confidenceScore: 100,
  source: "dataset_understanding" as const,
};

describe("Focus consumes canonical MB recovery on governed Viettel samples", () => {
  it.each([
    "delivery-1912-sanitized.xlsx",
    "delivery-2312-sanitized.xlsx",
    "delivery-2412-sanitized.xlsx",
  ])("keeps %s exact while carrying ETA and waiting-time understanding into Focus", (name) => {
    const rows = rowsOf(name);
    const understanding = canonicalUnderstanding(name, rows);
    const routeCandidate = deriveFocusSubjectCandidates(understanding, rows).find((candidate) => candidate.canonicalId === "route");
    expect(routeCandidate).toBeDefined();

    const focus = mostFrequentRoute(rows);
    const option = routeCandidate?.options.find((item) => item.value === focus);
    expect(option).toBeDefined();
    const selection = createFocusSubjectSelection(routeCandidate!, option!, understanding);

    expect(selection.dimensionBindings).toEqual(expect.arrayContaining([
      expect.objectContaining({ canonicalId: "eta", field: "Thời gian dự kiến đến", role: "time" }),
      expect.objectContaining({ canonicalId: "trip", field: "Chuyến xe", role: "identifier" }),
      expect.objectContaining({ canonicalId: "on_time_status", role: "status" }),
    ]));
    expect(selection.metricBindings).toEqual(expect.arrayContaining([
      expect.objectContaining({ canonicalId: "waiting_time", field: "Thời gian chờ" }),
    ]));

    const comparison = buildFocusSubjectComparison(rows, selection, action);
    expect(comparison).not.toBeNull();
    const tripField = selection.dimensionBindings?.find((binding) => binding.canonicalId === "trip")?.field;
    const statusField = selection.dimensionBindings?.find((binding) => binding.canonicalId === "on_time_status")?.field;
    const waitingField = selection.metricBindings?.find((binding) => binding.canonicalId === "waiting_time")?.field;
    expect(tripField).toBeTruthy();
    expect(statusField).toBeTruthy();
    expect(waitingField).toBeTruthy();
    const subjectRows = rows.filter((row) => String(row[selection.field] ?? "").trim() === focus);
    const expectedTrips = new Set(subjectRows.map((row) => String(row[tripField!] ?? "").trim()).filter(Boolean));
    expect(comparison?.matchedSubjectRowCount).toBe(subjectRows.length);
    expect(comparison?.metrics[0]).toMatchObject({ field: "Trip count", subjectValue: expectedTrips.size });

    const waiting = subjectRows
      .map((row) => row[waitingField!])
      .filter((value) => value !== null && value !== undefined && String(value).trim() !== "")
      .map(Number)
      .filter(Number.isFinite);
    const expectedWaitingAverage = waiting.reduce((sum, value) => sum + value, 0) / waiting.length;
    expect(comparison?.metrics.find((metric) => metric.field === waitingField)?.subjectValue).toBeCloseTo(expectedWaitingAverage, 10);

    const routeCount = new Set(rows.map((row) => String(row[selection.field] ?? "").trim()).filter(Boolean)).size;
    expect(comparison?.metrics[0]?.cohortSize).toBe(Math.min(10, Math.max(1, Math.floor(routeCount / 2))));
    const statusByTrip = new Map<string, Set<string>>();
    for (const row of rows) {
      const trip = String(row[tripField!] ?? "").trim();
      const status = String(row[statusField!] ?? "").trim();
      if (!trip || !status) continue;
      const values = statusByTrip.get(trip) ?? new Set<string>();
      values.add(status);
      statusByTrip.set(trip, values);
    }
    const partitionSafe = [...statusByTrip.values()].every((values) => values.size <= 1);
    if (!partitionSafe) {
      expect(comparison?.distribution).toBeUndefined();
    } else {
      expect(comparison?.distribution?.field).toBe(statusField);
      for (const status of new Set(subjectRows.map((row) => String(row[statusField!] ?? "").trim()).filter(Boolean))) {
        const expected = new Set(subjectRows
          .filter((row) => String(row[statusField!] ?? "").trim() === status)
          .map((row) => String(row[tripField!] ?? "").trim())
          .filter(Boolean)).size;
        expect(comparison?.distribution?.groups.find((group) => group.label === status)?.subjectValue).toBe(expected);
      }
    }
  }, 20_000);
});
