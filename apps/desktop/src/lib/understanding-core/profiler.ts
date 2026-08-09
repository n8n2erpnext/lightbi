import {
  DATASET_UNDERSTANDING_ARTIFACT_SCHEMA_VERSION,
  PHYSICAL_PROFILE_SCHEMA_VERSION,
  type CanonicalPhysicalSourceInputV1,
  type CardinalityEvidenceV1,
  type ColumnPhysicalProfileV1,
  type DatasetUnderstandingArtifactV1,
  type DateTimeSummaryV1,
  type HeaderCandidateV1,
  type HeaderRegionV1,
  type NumericSummaryV1,
  type ParseEvidenceV1,
  type PhysicalTypeCandidateV1,
  type PhysicalTypeName,
  type SourceProfileV1,
  type StringSummaryV1,
  type StructuralIssueCode,
  type StructuralIssueV1
} from "./profiling-contracts";
import { createRepresentativeEvidence, type PhysicalDataRow } from "./representative-sampler";
import { physicalHeaderCell, uniquePhysicalColumnNames } from "../physical-column-names";

const DISTINCT_OBSERVATION_LIMIT = 50_000;
const FORMULA_ERROR = /^(?:#REF!|#VALUE!|#DIV\/0!|#N\/A|#NAME\?|#NUM!|#NULL!)$/i;
const TECHNICAL_HEADER = /^(?:__.*__|_?id$|row_?id$|index$|unnamed(?::\s*\d+)?$)/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ParsedDate = { date: Date; excelSerial: boolean; localeAmbiguous: boolean };

function isNullish(value: unknown): boolean {
  return value == null || (typeof value === "string" && value.trim() === "");
}

function effectiveWidth(row: readonly unknown[]): number {
  for (let index = row.length - 1; index >= 0; index -= 1) {
    if (!isNullish(row[index])) return index + 1;
  }
  return 0;
}

function normalizedCell(value: unknown): string {
  return isNullish(value) ? "" : String(value).replace(/\s+/g, " ").trim();
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const percent = trimmed.endsWith("%");
  const normalized = trimmed
    .replace(/[\s\u00a0]/g, "")
    .replace(/^\((.*)\)$/, "-$1")
    .replace(/,/g, "")
    .replace(/%$/, "");
  if (!/^[-+]?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return percent ? parsed / 100 : parsed;
}

function excelSerialToDate(value: number): Date | null {
  if (!Number.isFinite(value) || value < 20_000 || value > 80_000) return null;
  const milliseconds = Math.round((value - 25569) * 86400 * 1000);
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date;
}

function validDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date | null {
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) return null;
  return date;
}

function parseDate(value: unknown): ParsedDate | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { date: value, excelSerial: false, localeAmbiguous: false };
  }
  if (typeof value === "number") {
    const date = excelSerialToDate(value);
    return date ? { date, excelSerial: true, localeAmbiguous: false } : null;
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;

  const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (iso) {
    const date = validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]), Number(iso[4] ?? 0), Number(iso[5] ?? 0), Number(iso[6] ?? 0));
    return date ? { date, excelSerial: false, localeAmbiguous: false } : null;
  }

  const local = text.match(/^(?:(\d{1,2}):(\d{2})(?::(\d{2}))?\s+)?(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!local) return null;
  const year = Number(local[6]) < 100 ? 2000 + Number(local[6]) : Number(local[6]);
  const day = Number(local[4]);
  const month = Number(local[5]);
  const hour = Number(local[1] ?? local[7] ?? 0);
  const minute = Number(local[2] ?? local[8] ?? 0);
  const second = Number(local[3] ?? local[9] ?? 0);
  const date = validDate(year, month, day, hour, minute, second);
  return date ? { date, excelSerial: false, localeAmbiguous: day <= 12 && month <= 12 } : null;
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(normalized)) return true;
  if (["false", "no", "n", "0"].includes(normalized)) return false;
  return null;
}

function rawKind(value: unknown): "number" | "string" | "boolean" | "date" | "unknown" {
  if (value instanceof Date) return "date";
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "boolean";
  return "unknown";
}

function headerCandidate(rawRows: readonly (readonly unknown[])[], sourceRowIndex: number): HeaderCandidateV1 | null {
  const row = rawRows[sourceRowIndex];
  const width = effectiveWidth(row);
  if (width === 0) return null;
  const cells = row.slice(0, width).filter(value => !isNullish(value));
  if (cells.length === 0) return null;
  const normalized = cells.map(normalizedCell);
  const coverage = cells.length / width;
  const uniqueness = new Set(normalized.map(value => value.toLowerCase())).size / cells.length;
  const labelLike = cells.filter(value =>
    typeof value === "string" &&
    /[\p{L}_]/u.test(value) &&
    parseNumeric(value) == null &&
    parseDate(value) == null &&
    !FORMULA_ERROR.test(value.trim())
  ).length / cells.length;
  const breadth = Math.min(1, cells.length / 3);
  const following = rawRows.slice(sourceRowIndex + 1, sourceRowIndex + 21);
  const activeColumns = row.slice(0, width).map((value, index) => !isNullish(value) ? index : -1).filter(index => index >= 0);
  const downstreamCoverage = following.length === 0 || activeColumns.length === 0
    ? 0
    : following.reduce((sum, next) => sum + activeColumns.filter(index => !isNullish(next[index])).length / activeColumns.length, 0) / following.length;
  const score = 0.2 * coverage + 0.2 * uniqueness + 0.25 * labelLike + 0.15 * breadth + 0.2 * downstreamCoverage;
  return {
    sourceRowIndex,
    score: Number(score.toFixed(6)),
    nonEmptyCellCount: cells.length,
    effectiveWidth: width,
    evidence: [
      `coverage=${coverage.toFixed(3)}`,
      `unique=${uniqueness.toFixed(3)}`,
      `label_like=${labelLike.toFixed(3)}`,
      `breadth=${breadth.toFixed(3)}`,
      `downstream=${downstreamCoverage.toFixed(3)}`
    ]
  };
}

function detectHeader(input: CanonicalPhysicalSourceInputV1): HeaderRegionV1 {
  const scanLimit = Math.min(input.rawRows.length, input.maxHeaderScanRows ?? 20);
  const candidates = Array.from({ length: scanLimit }, (_, index) => headerCandidate(input.rawRows, index))
    .filter((candidate): candidate is HeaderCandidateV1 => candidate !== null)
    .sort((left, right) => right.score - left.score || left.sourceRowIndex - right.sourceRowIndex);
  const best = candidates[0];
  if (!best || best.score < 0.5) {
    return {
      selectedHeaderRowIndex: null,
      selectionConfidence: best?.score ?? 0,
      selectionStatus: "not_found",
      physicalColumnNames: [],
      skippedRows: input.rawRows.slice(0, scanLimit).map((row, sourceRowIndex) => ({ sourceRowIndex, rawValues: [...row] })),
      candidates
    };
  }

  const nearBest = candidates.filter(candidate => best.score - candidate.score <= 0.025);
  const selected = nearBest.sort((left, right) => left.sourceRowIndex - right.sourceRowIndex)[0];
  const secondDistinct = candidates.find(candidate => candidate.sourceRowIndex !== selected.sourceRowIndex);
  const margin = secondDistinct ? selected.score - secondDistinct.score : selected.score;
  const status = nearBest.length > 1 && selected.sourceRowIndex !== 0 && Math.abs(margin) < 0.01 ? "ambiguous" : "selected";
  const headerRow = input.rawRows[selected.sourceRowIndex];
  const width = effectiveWidth(headerRow);
  return {
    selectedHeaderRowIndex: selected.sourceRowIndex,
    selectionConfidence: Number(Math.max(0, Math.min(1, selected.score + Math.max(0, margin))).toFixed(6)),
    selectionStatus: status,
    physicalColumnNames: uniquePhysicalColumnNames(headerRow, width),
    skippedRows: input.rawRows.slice(0, selected.sourceRowIndex).map((row, sourceRowIndex) => ({ sourceRowIndex, rawValues: [...row] })),
    candidates
  };
}

function issue(
  code: StructuralIssueCode,
  severity: StructuralIssueV1["severity"],
  physicalColumn: string | null,
  sourceRowIndices: number[],
  evidence: string[]
): StructuralIssueV1 {
  return { code, severity, physicalColumn, sourceRowIndices: [...new Set(sourceRowIndices)].slice(0, 20), evidence };
}

function parseEvidence(
  parser: ParseEvidenceV1["parser"],
  values: Array<{ value: unknown; sourceRowIndex: number }>,
  parse: (value: unknown) => unknown
): ParseEvidenceV1 {
  const failures: Array<{ sourceRowIndex: number; rawValue: unknown }> = [];
  let successCount = 0;
  for (const item of values) {
    if (parse(item.value) != null) successCount += 1;
    else if (failures.length < 5) failures.push({ sourceRowIndex: item.sourceRowIndex, rawValue: item.value });
  }
  return {
    parser,
    attemptedCount: values.length,
    successCount,
    failureCount: values.length - successCount,
    representativeFailures: failures
  };
}

function typeCandidates(values: Array<{ value: unknown; sourceRowIndex: number }>): PhysicalTypeCandidateV1[] {
  if (values.length === 0) return [{ type: "empty", confidence: 1, evidenceCount: 0, evidence: ["No non-null values."] }];
  const kindCounts = new Map<string, number>();
  values.forEach(item => kindCounts.set(rawKind(item.value), (kindCounts.get(rawKind(item.value)) ?? 0) + 1));
  const numericStringCount = values.filter(item => typeof item.value === "string" && parseNumeric(item.value) != null).length;
  const dateStringCount = values.filter(item => typeof item.value === "string" && parseDate(item.value) != null).length;
  const excelSerialCount = values.filter(item => typeof item.value === "number" && excelSerialToDate(item.value) != null).length;
  const candidates: PhysicalTypeCandidateV1[] = [];
  const add = (type: PhysicalTypeName, count: number, evidence: string) => {
    if (count === 0) return;
    candidates.push({ type, confidence: Number((count / values.length).toFixed(6)), evidenceCount: count, evidence: [evidence] });
  };

  if (kindCounts.size > 1) add("mixed", values.length, `Observed raw kinds: ${[...kindCounts.keys()].sort().join(", ")}.`);
  add("boolean", kindCounts.get("boolean") ?? 0, "Native boolean values observed.");
  add("number", kindCounts.get("number") ?? 0, "Native finite numbers observed.");
  add("date", kindCounts.get("date") ?? 0, "Native Date values observed.");
  add("numeric_string", numericStringCount, "String values parsed losslessly as numbers.");
  add("date_string", dateStringCount, "String values matched supported deterministic date formats.");
  add("excel_serial_date", excelSerialCount, "Numeric values fall within the bounded Excel serial-date range.");
  add("string", kindCounts.get("string") ?? 0, "Native string values observed and preserved.");
  add("unknown", kindCounts.get("unknown") ?? 0, "Unsupported raw JavaScript value kinds observed.");
  return candidates.sort((left, right) => {
    if (left.type === "mixed") return -1;
    if (right.type === "mixed") return 1;
    return right.confidence - left.confidence || left.type.localeCompare(right.type);
  });
}

function numericSummary(values: number[]): NumericSummaryV1 | null {
  if (values.length === 0) return null;
  let mean = 0;
  let m2 = 0;
  values.forEach((value, index) => {
    const delta = value - mean;
    mean += delta / (index + 1);
    m2 += delta * (value - mean);
  });
  return {
    parsedCount: values.length,
    minimum: Math.min(...values),
    maximum: Math.max(...values),
    mean,
    standardDeviation: Math.sqrt(m2 / values.length)
  };
}

function dateSummary(values: ParsedDate[]): DateTimeSummaryV1 | null {
  if (values.length === 0) return null;
  const timestamps = values.map(value => value.date.getTime());
  return {
    parsedCount: values.length,
    minimumIso: new Date(Math.min(...timestamps)).toISOString(),
    maximumIso: new Date(Math.max(...timestamps)).toISOString(),
    excelSerialCount: values.filter(value => value.excelSerial).length
  };
}

function stringSummary(values: string[], distinctCount: number): StringSummaryV1 | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  values.forEach(value => counts.set(value, (counts.get(value) ?? 0) + 1));
  const lengths = values.map(value => value.length);
  return {
    parsedCount: values.length,
    minimumLength: Math.min(...lengths),
    maximumLength: Math.max(...lengths),
    meanLength: lengths.reduce((sum, length) => sum + length, 0) / lengths.length,
    topValues: [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).slice(0, 10).map(([value, count]) => ({ value, count })),
    likelyCategorical: distinctCount > 0 && distinctCount <= Math.min(100, Math.max(20, Math.ceil(values.length * 0.2)))
  };
}

function cardinality(values: unknown[]): CardinalityEvidenceV1 {
  const observed = new Set<string>();
  for (const value of values) {
    if (observed.size >= DISTINCT_OBSERVATION_LIMIT) break;
    observed.add(`${rawKind(value)}:${String(value)}`);
  }
  return {
    mode: observed.size >= DISTINCT_OBSERVATION_LIMIT && values.length > DISTINCT_OBSERVATION_LIMIT ? "lower_bound" : "exact",
    distinctCount: observed.size,
    observationLimit: DISTINCT_OBSERVATION_LIMIT
  };
}

function profileColumn(
  input: CanonicalPhysicalSourceInputV1,
  rows: PhysicalDataRow[],
  physicalColumnName: string,
  sourceColumnIndex: number
): ColumnPhysicalProfileV1 {
  const nonNull = rows
    .map(row => ({ value: row.rawValues[sourceColumnIndex], sourceRowIndex: row.sourceRowIndex }))
    .filter(item => !isNullish(item.value));
  const values = nonNull.map(item => item.value);
  const cardinalityEvidence = cardinality(values);
  const counts = new Map<string, number>();
  values.forEach(value => {
    const key = `${rawKind(value)}:${String(value)}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const duplicateValueCount = [...counts.values()].filter(count => count > 1).length;
  const duplicateRowCount = [...counts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  const numericParse = parseEvidence("numeric", nonNull, parseNumeric);
  const dateParse = parseEvidence("date", nonNull, parseDate);
  const booleanParse = parseEvidence("boolean", nonNull, parseBoolean);
  const stringParse = parseEvidence("string", nonNull, value => normalizedCell(value));
  const candidates = typeCandidates(nonNull);
  const candidateTypes = new Set(candidates.map(candidate => candidate.type));
  const parses = [stringParse];
  if (["number", "numeric_string", "mixed"].some(type => candidateTypes.has(type as PhysicalTypeName))) parses.push(numericParse);
  if (["date", "date_string", "excel_serial_date", "mixed"].some(type => candidateTypes.has(type as PhysicalTypeName))) parses.push(dateParse);
  if (candidateTypes.has("boolean")) parses.push(booleanParse);

  const columnIssues: StructuralIssueV1[] = [];
  const nullCount = rows.length - nonNull.length;
  if (nullCount > 0) columnIssues.push(issue("null_values", "info", physicalColumnName, [], [`${nullCount} null/blank cells out of ${rows.length}.`]));
  if (candidateTypes.has("mixed")) {
    columnIssues.push(issue("mixed_type", "warning", physicalColumnName, nonNull.slice(0, 10).map(item => item.sourceRowIndex), ["Multiple native physical value kinds were observed."]));
  }
  const formulaRows = nonNull.filter(item => typeof item.value === "string" && FORMULA_ERROR.test(item.value.trim())).map(item => item.sourceRowIndex);
  if (formulaRows.length > 0) columnIssues.push(issue("formula_error", "error", physicalColumnName, formulaRows, [`${formulaRows.length} spreadsheet formula-error values observed.`]));
  const malformedRows = nonNull.filter(item => typeof item.value === "number" && !Number.isFinite(item.value)).map(item => item.sourceRowIndex);
  if (malformedRows.length > 0) columnIssues.push(issue("malformed_value", "warning", physicalColumnName, malformedRows, ["Non-finite numeric values observed."]));
  const localeRows = nonNull.filter(item => parseDate(item.value)?.localeAmbiguous).map(item => item.sourceRowIndex);
  if (localeRows.length > 0) columnIssues.push(issue("ambiguous_date_locale", "warning", physicalColumnName, localeRows, ["Day/month order is ambiguous for at least one parsed date string."]));

  const technicalEvidence: string[] = [];
  if (TECHNICAL_HEADER.test(physicalColumnName.trim())) technicalEvidence.push("Header matches a technical-column pattern.");
  const uuidCount = values.filter(value => typeof value === "string" && UUID.test(value.trim())).length;
  if (values.length > 0 && uuidCount / values.length >= 0.8) technicalEvidence.push(`${uuidCount}/${values.length} values match UUID structure.`);
  if (technicalEvidence.length > 0) columnIssues.push(issue("technical_column", "info", physicalColumnName, [], technicalEvidence));

  const numericValues = nonNull.map(item => parseNumeric(item.value)).filter((value): value is number => value != null);
  const dateValues = nonNull.map(item => parseDate(item.value)).filter((value): value is ParsedDate => value != null);
  const stringValues = values.map(normalizedCell);
  const representativeRawValues: unknown[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const key = `${rawKind(value)}:${String(value)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    representativeRawValues.push(value);
    if (representativeRawValues.length >= 10) break;
  }
  const limitations: string[] = [];
  if (cardinalityEvidence.mode === "lower_bound") limitations.push("Distinct cardinality is a bounded lower estimate.");
  if (candidateTypes.has("mixed")) limitations.push("No single physical type is asserted for this mixed column.");

  return {
    columnId: `${input.source.sourceId}:column:${sourceColumnIndex}`,
    sourceId: input.source.sourceId,
    sourceColumnIndex,
    physicalColumnName,
    rowCount: rows.length,
    nonNullCount: nonNull.length,
    nullCount,
    physicalTypeCandidates: candidates,
    parseEvidence: parses,
    representativeRawValues,
    cardinality: cardinalityEvidence,
    uniqueness: {
      nonNullCount: nonNull.length,
      duplicateValueCount,
      duplicateRowCount,
      uniquenessRatio: nonNull.length > 0 ? cardinalityEvidence.distinctCount / nonNull.length : null,
      isUnique: cardinalityEvidence.mode === "exact" ? duplicateRowCount === 0 : null
    },
    numericSummary: numericValues.length / Math.max(1, nonNull.length) >= 0.5 ? numericSummary(numericValues) : null,
    dateTimeSummary: dateValues.length / Math.max(1, nonNull.length) >= 0.5 ? dateSummary(dateValues) : null,
    stringSummary: stringSummary(stringValues, cardinalityEvidence.distinctCount),
    technicalColumnEvidence: technicalEvidence,
    issues: columnIssues,
    limitations
  };
}

function structuralIssues(
  input: CanonicalPhysicalSourceInputV1,
  header: HeaderRegionV1,
  dataRows: PhysicalDataRow[],
  emptyRowsExcluded: number,
  columns: ColumnPhysicalProfileV1[]
): StructuralIssueV1[] {
  const issues: StructuralIssueV1[] = [];
  if (input.rawRows.length === 0) issues.push(issue("source_empty", "error", null, [], ["Source contains no physical rows."]));
  if (header.selectedHeaderRowIndex == null) issues.push(issue("header_not_found", "error", null, [], ["No header candidate passed the structural selection threshold."]));
  if (header.selectionStatus === "ambiguous") issues.push(issue("header_selection_ambiguous", "warning", null, header.candidates.slice(0, 3).map(candidate => candidate.sourceRowIndex), ["Multiple header candidates have materially similar scores."]));
  if ((header.selectedHeaderRowIndex ?? 0) > 0) {
    issues.push(issue("header_offset", "info", null, [header.selectedHeaderRowIndex!], [`Header selected at zero-based row ${header.selectedHeaderRowIndex}.`]));
    issues.push(issue("title_rows", "info", null, header.skippedRows.map(row => row.sourceRowIndex), [`${header.skippedRows.length} pre-header rows preserved as evidence.`]));
    issues.push(issue("merged_header_suspected", "info", null, header.skippedRows.map(row => row.sourceRowIndex), ["Pre-header content may be title or merged-header metadata."]));
  }
  if (emptyRowsExcluded > 0) issues.push(issue("empty_data_row", "info", null, [], [`${emptyRowsExcluded} fully empty rows excluded from the selected data region.`]));

  if (header.selectedHeaderRowIndex != null) {
    const headerRow = input.rawRows[header.selectedHeaderRowIndex];
    const namedWidth = effectiveWidth(headerRow);
    const maximumWidth = input.rawRows.reduce((maximum, row) => Math.max(maximum, row.length), 0);
    const emptyHeaderIndexes = headerRow.slice(0, namedWidth).map((value, index) => physicalHeaderCell(value) === "" ? index : -1).filter(index => index >= 0);
    if (emptyHeaderIndexes.length > 0) issues.push(issue("empty_header_column", "warning", null, [header.selectedHeaderRowIndex], [`Empty header positions: ${emptyHeaderIndexes.join(", ")}.`]));
    if (maximumWidth > namedWidth) {
      const trailingHasData = input.rawRows.slice(header.selectedHeaderRowIndex + 1).some(row => row.slice(namedWidth).some(value => !isNullish(value)));
      if (!trailingHasData) issues.push(issue("empty_trailing_columns", "info", null, [header.selectedHeaderRowIndex], [`${maximumWidth - namedWidth} physically present trailing columns are empty.`]));
    }
    const normalizedNames = headerRow
      .slice(0, namedWidth)
      .map(value => physicalHeaderCell(value).trim().toLocaleLowerCase())
      .filter(Boolean);
    const duplicateNames = [...new Set(normalizedNames.filter((name, index) => normalizedNames.indexOf(name) !== index))];
    if (duplicateNames.length > 0) issues.push(issue("duplicate_header", "warning", null, [header.selectedHeaderRowIndex], [`Duplicate headers: ${duplicateNames.join(", ")}.`]));
    const inconsistent = dataRows.filter(row => effectiveWidth(row.rawValues) > header.physicalColumnNames.length).map(row => row.sourceRowIndex);
    if (inconsistent.length > 0) issues.push(issue("inconsistent_row_width", "warning", null, inconsistent, [`${inconsistent.length} data rows extend beyond the selected header width.`]));
  }
  for (const column of columns) issues.push(...column.issues);
  if (columns.some(column => column.cardinality.mode === "lower_bound")) issues.push(issue("cardinality_bounded", "info", null, [], ["At least one column exceeded the exact distinct observation limit."]));
  return issues;
}

export function profilePhysicalSource(input: CanonicalPhysicalSourceInputV1): DatasetUnderstandingArtifactV1 {
  const header = detectHeader(input);
  const dataRows: PhysicalDataRow[] = [];
  let emptyRowsExcluded = 0;
  if (header.selectedHeaderRowIndex != null) {
    for (let sourceRowIndex = header.selectedHeaderRowIndex + 1; sourceRowIndex < input.rawRows.length; sourceRowIndex += 1) {
      const rawValues = input.rawRows[sourceRowIndex];
      if (!rawValues.some(value => !isNullish(value))) {
        emptyRowsExcluded += 1;
        continue;
      }
      dataRows.push({ dataRowIndex: dataRows.length, sourceRowIndex, rawValues });
    }
  }

  const columns = header.physicalColumnNames.map((physicalColumnName, sourceColumnIndex) =>
    profileColumn(input, dataRows, physicalColumnName, sourceColumnIndex)
  );
  const issues = structuralIssues(input, header, dataRows, emptyRowsExcluded, columns);
  const limitations: string[] = [
    "This artifact contains physical and structural facts only; it does not infer business semantics, grain, relationships, domains, questions, or actions."
  ];
  if (header.selectionStatus !== "selected") limitations.push("The data region could not be selected with high structural certainty.");
  if (!input.source.hash) limitations.push("No source content hash was supplied; source identity relies on the caller-provided stable sourceId.");
  const confidenceScore = header.selectedHeaderRowIndex == null
    ? 0
    : Math.max(0, Math.min(1, header.selectionConfidence - (header.selectionStatus === "ambiguous" ? 0.2 : 0)));
  const sourceProfile: SourceProfileV1 = {
    schemaVersion: PHYSICAL_PROFILE_SCHEMA_VERSION,
    source: { ...input.source, hash: input.source.hash ? { ...input.source.hash } : undefined },
    sourceRowCount: input.rawRows.length,
    profiledRowCount: dataRows.length,
    profilingScope: "full",
    header,
    dataRegion: {
      firstSourceRowIndex: dataRows[0]?.sourceRowIndex ?? null,
      lastSourceRowIndex: dataRows[dataRows.length - 1]?.sourceRowIndex ?? null,
      rowCount: dataRows.length,
      emptyRowsExcluded,
      selectionStatus: header.selectionStatus === "selected" ? "selected" : header.selectionStatus === "ambiguous" ? "uncertain" : "not_found"
    },
    columns,
    issues,
    limitations,
    confidence: {
      level: confidenceScore >= 0.8 ? "high" : confidenceScore >= 0.6 ? "medium" : confidenceScore > 0 ? "low" : "unknown",
      score: confidenceScore,
      evidence: [
        `header_status=${header.selectionStatus}`,
        `header_confidence=${header.selectionConfidence.toFixed(3)}`,
        `profiled_rows=${dataRows.length}`
      ]
    }
  };
  const representativeEvidence = createRepresentativeEvidence(input.source, header.physicalColumnNames, dataRows, columns, issues);
  return {
    schemaVersion: DATASET_UNDERSTANDING_ARTIFACT_SCHEMA_VERSION,
    sourceProfile,
    representativeEvidence,
    provenance: {
      sourceId: input.source.sourceId,
      sourceHash: input.source.hash ? { ...input.source.hash } : null,
      profileSchemaVersion: PHYSICAL_PROFILE_SCHEMA_VERSION,
      evidenceSchemaVersion: representativeEvidence.schemaVersion
    },
    limitations: [...limitations, ...representativeEvidence.limitations]
  };
}

export function physicalSourceFromRecords(args: {
  source: CanonicalPhysicalSourceInputV1["source"];
  columns: string[];
  rows: readonly Record<string, unknown>[];
}): CanonicalPhysicalSourceInputV1 {
  return {
    schemaVersion: "lightbi.physical-source-input.v1",
    source: args.source,
    rawRows: [args.columns, ...args.rows.map(row => args.columns.map(column => row[column] ?? null))]
  };
}
