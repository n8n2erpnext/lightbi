import type { BusinessSignal, DatasetUnderstandingResult, DomainId } from "./understanding-next/contracts";

export type FocusSubjectOption = {
  value: string;
  displayLabel: string;
  searchText: string;
};

export type FocusSubjectCandidate = {
  id: string;
  canonicalId: string;
  domain: DomainId;
  field: string;
  fieldLabel: string;
  labelField?: string;
  options: FocusSubjectOption[];
  confidence: number;
};

export type FocusSubjectSelection = {
  candidateId: string;
  canonicalId: string;
  domain: DomainId;
  field: string;
  value: string;
  displayLabel: string;
  labelField?: string;
  metricFields: string[];
  metricBindings?: Array<{ canonicalId: string; field: string }>;
  dimensionBindings?: Array<{
    canonicalId: string;
    field: string;
    role: BusinessSignal["role"];
    cardinality: number;
  }>;
  rankField?: string;
};

export type FocusPerspectiveCandidate = {
  perspectiveId: string;
  state: string;
  matchedSignalIds: string[];
};

export function resolveFocusAutoPerspectiveId(
  subject: FocusSubjectSelection | null | undefined,
  perspectives: FocusPerspectiveCandidate[],
): string | null {
  if (!subject) return null;
  return (
    perspectives
      .filter(
        (perspective) => perspective.state === "governed_action_available",
      )
      .map((perspective) => ({
        perspective,
        score:
          Number(perspective.matchedSignalIds.includes(subject.canonicalId)) *
            3 +
          Number(perspective.perspectiveId === subject.domain) * 2,
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)[0]?.perspective
      .perspectiveId ?? null
  );
}

const ENTITY_DIMENSIONS = new Set([
  "employee",
  "manager",
  "person",
  "salesperson",
  "buyer",
  "coach",
  "team",
  "customer",
  "product",
  "sku",
  "item",
  "category",
  "brand",
  "branch",
  "store",
  "warehouse",
  "current_location",
  "destination_location",
  "location",
  "region",
  "territory",
  "route",
  "driver",
  "vehicle",
  "supplier",
  "vendor",
  "carrier",
  "project",
  "asset",
  "sensor",
  "channel",
  "account",
  "company",
  "department",
]);
const NEVER_FOCUS = new Set(["performance_rank", "rank", "ranking", "status"]);
const LABELISH_HEADER =
  /(name|label|description|title|manager|employee|customer|product|item|supplier|vendor|branch|warehouse|person|salesperson|buyer|coach|team|project|ten|tên|ho ten|họ tên)/i;
const IDENTIFIERISH_HEADER =
  /(^|[^a-z0-9])(id|code|no|number|stt)([^a-z0-9]|$)|uuid|guid|phone|postal|row[^a-z0-9]*id|record[^a-z0-9]*id|rank|ranking|xep hang|xếp hạng|msnv/i;
const TIMEISH_HEADER =
  /(^|[ _-])(date|day|month|year|period|ngay|ngày|thang|tháng|nam|năm|ky|kỳ)($|[ _-])/i;
const MEASUREISH_HEADER =
  /(amount|total|revenue|price|cost|margin|profit|qty|quantity|discount|fee|tax|score|rate|percent|pct|balance|value|doanh thu|giá|chi phí|phí|thuế|điểm|tổng)/i;

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

const MISSING_LIKE_FOCUS_VALUES = new Set([
  "n/a",
  "#n/a",
  "null",
  "undefined",
  "(blank)",
  "#ref!",
  "#value!",
  "#div/0!",
  "#name?",
]);

function usableFocusValue(value: unknown): string {
  const normalized = text(value);
  return normalized &&
    !MISSING_LIKE_FOCUS_VALUES.has(normalized.toLocaleLowerCase())
    ? normalized
    : "";
}

function normalizedField(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function rowValue(
  row: Record<string, unknown>,
  field: string | undefined,
): unknown {
  if (!field) return undefined;
  if (Object.prototype.hasOwnProperty.call(row, field)) return row[field];
  const wanted = normalizedField(field);
  const resolved = Object.keys(row).find(
    (key) => normalizedField(key) === wanted,
  );
  return resolved ? row[resolved] : undefined;
}

function eligibleSignal(signal: BusinessSignal): boolean {
  if (signal.confidence < 0.55 || NEVER_FOCUS.has(signal.canonicalId))
    return false;
  if (signal.role === "identifier") return true;
  return (
    signal.role === "dimension" && ENTITY_DIMENSIONS.has(signal.canonicalId)
  );
}

function companionScore(
  identity: BusinessSignal,
  candidate: BusinessSignal,
  rows: Record<string, unknown>[],
): number {
  if (
    candidate.physicalColumn === identity.physicalColumn ||
    candidate.role !== "dimension" ||
    NEVER_FOCUS.has(candidate.canonicalId)
  )
    return -1;
  const mapping = new Map<string, Set<string>>();
  let paired = 0;
  for (const row of rows) {
    const id = text(row[identity.physicalColumn]);
    const label = text(row[candidate.physicalColumn]);
    if (!id || !label || id === label) continue;
    paired += 1;
    const values = mapping.get(id) ?? new Set<string>();
    values.add(label);
    mapping.set(id, values);
  }
  if (mapping.size < 2 || paired < Math.min(3, Math.max(1, rows.length)))
    return -1;
  const unambiguous = [...mapping.values()].filter(
    (values) => values.size === 1,
  ).length;
  const consistency = unambiguous / mapping.size;
  if (consistency < 0.98) return -1;
  const identityValues = new Set(
    rows.map((row) => text(row[identity.physicalColumn])).filter(Boolean),
  );
  const coverage = identityValues.size ? mapping.size / identityValues.size : 0;
  if (coverage < 0.6) return -1;
  const distinctLabels = new Set(
    [...mapping.values()].flatMap((values) => [...values]),
  ).size;
  if (distinctLabels < 2) return -1;
  let score = consistency * 4 + coverage * 3;
  if (LABELISH_HEADER.test(candidate.physicalColumn)) score += 2;
  if (candidate.domain === identity.domain) score += 0.5;
  if (
    Math.abs(distinctLabels - mapping.size) <= Math.max(2, mapping.size * 0.1)
  )
    score += 1;
  return score;
}

function bestLabelSignal(
  identity: BusinessSignal,
  signals: BusinessSignal[],
  rows: Record<string, unknown>[],
): BusinessSignal | undefined {
  return signals
    .map((signal) => ({
      signal,
      score: companionScore(identity, signal, rows),
    }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score)[0]?.signal;
}

export function deriveFocusSubjectCandidates(
  understanding: DatasetUnderstandingResult | null | undefined,
  rows: Record<string, unknown>[],
): FocusSubjectCandidate[] {
  if (!understanding || rows.length === 0) return [];
  const signals = understanding.signals.filter((signal) =>
    rows.some((row) => text(rowValue(row, signal.physicalColumn))),
  );
  const eligibleByField = new Map<string, BusinessSignal>();
  for (const signal of signals
    .filter(eligibleSignal)
    .sort((a, b) => b.confidence - a.confidence)) {
    if (TIMEISH_HEADER.test(signal.physicalColumn)) continue;
    if (
      signal.role === "identifier" &&
      MEASUREISH_HEADER.test(signal.physicalColumn) &&
      !IDENTIFIERISH_HEADER.test(signal.physicalColumn)
    )
      continue;
    const key = normalizedField(signal.physicalColumn);
    const existing = eligibleByField.get(key);
    if (
      !existing ||
      (!ENTITY_DIMENSIONS.has(existing.canonicalId) &&
        ENTITY_DIMENSIONS.has(signal.canonicalId))
    )
      eligibleByField.set(key, signal);
  }
  const eligible = [...eligibleByField.values()];
  return eligible
    .map((signal) => {
      const labelSignal =
        signal.role === "identifier"
          ? bestLabelSignal(signal, signals, rows)
          : undefined;
      const optionMap = new Map<string, FocusSubjectOption>();
      for (const row of rows) {
        const value = usableFocusValue(rowValue(row, signal.physicalColumn));
        if (!value || optionMap.has(value)) continue;
        const label = labelSignal
          ? usableFocusValue(rowValue(row, labelSignal.physicalColumn))
          : "";
        const displayLabel =
          label && label !== value ? `${value} — ${label}` : value;
        optionMap.set(value, {
          value,
          displayLabel,
          searchText: `${value} ${label}`.trim().toLocaleLowerCase(),
        });
      }
      return {
        id: `${signal.canonicalId}:${signal.physicalColumn}`,
        canonicalId: signal.canonicalId,
        domain: signal.domain,
        field: signal.physicalColumn,
        fieldLabel: signal.label,
        labelField: labelSignal?.physicalColumn,
        options: [...optionMap.values()].sort((a, b) =>
          a.displayLabel.localeCompare(b.displayLabel, undefined, {
            numeric: true,
          }),
        ),
        confidence: signal.confidence,
      };
    })
    .filter((candidate) => candidate.options.length >= 2)
    .sort((a, b) => {
      const aIdentifier =
        understanding.signals.find(
          (signal) => signal.physicalColumn === a.field,
        )?.role === "identifier"
          ? 1
          : 0;
      const bIdentifier =
        understanding.signals.find(
          (signal) => signal.physicalColumn === b.field,
        )?.role === "identifier"
          ? 1
          : 0;
      return (
        bIdentifier - aIdentifier ||
        b.confidence - a.confidence ||
        a.fieldLabel.localeCompare(b.fieldLabel)
      );
    });
}

export function createFocusSubjectSelection(
  candidate: FocusSubjectCandidate,
  option: FocusSubjectOption,
  understanding: DatasetUnderstandingResult,
): FocusSubjectSelection {
  const metricSignals = understanding.signals.filter(
    (signal) => signal.role === "measure" && signal.confidence >= 0.55,
  );
  const metricFields = metricSignals.map((signal) => signal.physicalColumn);
  const rankField = understanding.signals.find(
    (signal) => signal.canonicalId === "performance_rank",
  )?.physicalColumn;
  return {
    candidateId: candidate.id,
    canonicalId: candidate.canonicalId,
    domain: candidate.domain,
    field: candidate.field,
    value: option.value,
    displayLabel: option.displayLabel,
    labelField: candidate.labelField,
    metricFields: [...new Set(metricFields)],
    metricBindings: metricSignals.map((signal) => ({
      canonicalId: signal.canonicalId,
      field: signal.physicalColumn,
    })),
    dimensionBindings: understanding.signals
      .filter(
        (signal) => signal.role !== "measure" && signal.role !== "technical",
      )
      .filter(
        (signal, index, all) =>
          all.findIndex(
            (other) =>
              other.canonicalId === signal.canonicalId &&
              normalizedField(other.physicalColumn) ===
                normalizedField(signal.physicalColumn),
          ) === index,
      )
      .map((signal) => ({
        canonicalId: signal.canonicalId,
        field: signal.physicalColumn,
        role: signal.role,
        cardinality: signal.cardinality,
      })),
    rankField,
  };
}

export function searchFocusSubjectOptions(
  candidate: FocusSubjectCandidate,
  query: string,
  limit = 30,
): FocusSubjectOption[] {
  const normalized = query.trim().toLocaleLowerCase();
  const source = normalized
    ? candidate.options.filter((option) =>
        option.searchText.includes(normalized),
      )
    : candidate.options;
  return source.slice(0, Math.max(1, limit));
}
