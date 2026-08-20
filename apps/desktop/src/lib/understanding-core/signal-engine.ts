import type { IndustryOverlay, UnderstandingCoreInput, UniversalSignal } from "./contracts";
import { profileColumn, normalizeHeader } from "./column-profile";
import { UNIVERSAL_SIGNAL_RULES } from "./ontology";

function healthFromInputProfile(input: UnderstandingCoreInput, column: string): UniversalSignal["health"] | null {
  const profile = input.columnProfiles?.[column];
  if (!profile) return null;

  const sourceRowCount = input.sourceRowCount ?? input.rows.length;
  const profiledRowCount = profile.profiledRowCount ?? sourceRowCount;
  const nullPercent = profile.nullPercent ?? 0;
  const estimatedNonEmpty = Math.max(0, Math.round(profiledRowCount * (1 - nullPercent / 100)));
  const nonEmptyCount = profile.nonEmptyCount ?? estimatedNonEmpty;
  const topValueCounts = profile.topValueCounts?.length
    ? profile.topValueCounts
    : (profile.topValues ?? []).map(value => ({ value, count: 1 }));

  let inferredType: UniversalSignal["health"]["inferredType"] = "empty";
  if (nonEmptyCount > 0) {
    if (profile.dataType === "number") inferredType = "number";
    else if (profile.dataType === "date") inferredType = "date";
    else if (profile.dataType === "unknown") inferredType = "mixed";
    else inferredType = "string";
  }

  return {
    inferredType,
    nonEmptyCount,
    distinctCount: profile.distinctCount ?? topValueCounts.length,
    dominanceRatio: profile.dominanceRatio ?? (
      nonEmptyCount > 0 && topValueCounts[0]
        ? topValueCounts[0].count / nonEmptyCount
        : undefined
    ),
    topValues: topValueCounts.slice(0, 10)
  };
}

function signalUsability(signal: UniversalSignal, rowCount: number): boolean {
  if (signal.role === "quality") return false;
  if (signal.role === "identifier") return false;
  if (signal.health.nonEmptyCount === 0) return false;
  if (signal.role === "time") {
    // A month/year mentioned inside a KPI label (for example
    // "Total score from 06/2016 to 05/2017") is not a row-level time
    // dimension. Only accept profiled date values, or a column whose whole
    // header explicitly denotes a date/period field. This keeps the rule
    // dictionary extensible without turning every dated report title into a
    // trend axis.
    const header = normalizeHeader(signal.physicalColumn).trim();
    const explicitTimeHeader = /^(date|day|month|year|period|fiscal month|fiscal year|transaction date|invoice date|order date|report date|ngay|thang|nam|ky|ngay bao cao|ngay giao dich|ngày|tháng|năm|kỳ|ngày báo cáo|ngày giao dịch)$/i.test(header);
    if (signal.health.inferredType !== "date" && !explicitTimeHeader) return false;
  }
  if (signal.id === "engagement.outcome") {
    return signal.health.distinctCount >= 2 && signal.health.distinctCount <= 20;
  }
  if (signal.health.dominanceRatio != null && signal.health.dominanceRatio >= 0.9) return false;
  if (signal.role === "dimension" || signal.role === "status") {
    if (signal.health.distinctCount > Math.max(100, rowCount * 0.5)) return false;
  }
  return true;
}

function confidenceFor(ruleMatched: boolean, healthNonEmpty: boolean): number {
  if (ruleMatched && healthNonEmpty) return 0.9;
  if (ruleMatched) return 0.7;
  return 0.3;
}

const EXPLICIT_IDENTIFIER_HEADER = /(^|\s)(id|code|key|no|number|uuid|guid|ma)(\s|$)|identifier|reference|tracking/i;
const EXPLICIT_ADDITIVE_HEADER = /amount|total|value|revenue|sales|cost|expense|fee|price|profit|margin|balance|discount|tax|cod|quantity|qty|weight|volume|distance|duration|(?:^|\s)(?:tiền|doanh thu|chi phí|giá|cước|phí|trọng lượng)(?:\s|$)/i;

/**
 * A broad dictionary can legitimately match more than one semantic role. Keep
 * all candidates as evidence, but never let an identifier-looking physical
 * column become a default additive measure merely because another broad alias
 * also matched it (for example `Mã Phiếu Gửi` matching both shipment identity
 * and a money-like rule).
 */
function resolveIdentifierMeasureConflicts(signals: UniversalSignal[]): UniversalSignal[] {
  const identifierColumns = new Set(
    signals
      .filter(signal => signal.role === "identifier")
      .filter(signal => {
        const normalized = normalizeHeader(signal.physicalColumn);
        const distinctRatio = signal.health.nonEmptyCount > 0
          ? signal.health.distinctCount / signal.health.nonEmptyCount
          : 0;
        return !EXPLICIT_ADDITIVE_HEADER.test(normalized)
          && (EXPLICIT_IDENTIFIER_HEADER.test(normalized) || distinctRatio >= 0.8);
      })
      .map(signal => signal.physicalColumn)
  );

  return signals.map(signal => {
    if (signal.role !== "measure" || !identifierColumns.has(signal.physicalColumn)) return signal;
    return {
      ...signal,
      usableForDefaultQuestion: false,
      evidence: [
        ...signal.evidence,
        `Excluded from additive analysis because ${signal.physicalColumn} is an identifier candidate.`
      ]
    };
  });
}

function resolveGeographicStatusConflicts(signals: UniversalSignal[]): UniversalSignal[] {
  const geographicStateColumns = new Set(
    signals
      .filter(signal => signal.id === "location.state_province")
      .map(signal => signal.physicalColumn)
  );

  return signals.map(signal => {
    if (signal.id !== "status.lifecycle" || !geographicStateColumns.has(signal.physicalColumn)) return signal;
    return {
      ...signal,
      usableForDefaultQuestion: false,
      evidence: [
        ...signal.evidence,
        `Excluded from lifecycle analysis because ${signal.physicalColumn} is geographic state/province evidence.`
      ]
    };
  });
}

export function detectUniversalSignals(input: UnderstandingCoreInput): UniversalSignal[] {
  const columns = input.columns.map(column => String(column ?? "").trim()).filter(Boolean);
  const rowCount = input.sourceRowCount ?? input.rows.length;
  const signals: UniversalSignal[] = [];

  for (const column of columns) {
    const normalized = normalizeHeader(column);
    const health = healthFromInputProfile(input, column) ?? profileColumn(input.rows, column);

    for (const rule of UNIVERSAL_SIGNAL_RULES) {
      if (!rule.patterns.some(pattern => pattern.test(normalized))) continue;
      if (rule.family === "indicator" && health.inferredType !== "number") continue;

      const baseSignal: UniversalSignal = {
        id: rule.id,
        family: rule.family,
        role: rule.role,
        label: rule.label,
        physicalColumn: column,
        confidence: confidenceFor(true, health.nonEmptyCount > 0),
        evidence: [`Header matched ${rule.id}: ${column}`],
        health,
        usableForDefaultQuestion: rule.defaultUsable === false ? false : true
      };

      baseSignal.usableForDefaultQuestion =
        baseSignal.usableForDefaultQuestion && signalUsability(baseSignal, rowCount);
      signals.push(baseSignal);
    }

    if (/^__.*__$|^__empty|uuid|guid|powerapps/i.test(normalized)) {
      signals.push({
        id: "quality.technical_column",
        family: "quality",
        role: "quality",
        label: "Technical Column",
        physicalColumn: column,
        confidence: 0.95,
        evidence: [`Technical-looking header: ${column}`],
        health,
        usableForDefaultQuestion: false
      });
    }

    if (health.topValues.some(value => /^#(REF|VALUE|DIV\/0|N\/A|NAME|NULL|NUM)!?$/i.test(value.value))) {
      signals.push({
        id: "quality.formula_error",
        family: "quality",
        role: "quality",
        label: "Formula Error",
        physicalColumn: column,
        confidence: 0.95,
        evidence: [`Formula/export error values in ${column}`],
        health,
        usableForDefaultQuestion: false
      });
    }

    if (health.dominanceRatio != null && health.dominanceRatio >= 0.9 && health.distinctCount > 1) {
      signals.push({
        id: "quality.dominant_single_value",
        family: "quality",
        role: "quality",
        label: "Dominant Single Value",
        physicalColumn: column,
        confidence: 0.85,
        evidence: [`${health.topValues[0]?.value ?? "One value"} dominates ${column}`],
        health,
        usableForDefaultQuestion: false
      });
    }
  }

  return resolveGeographicStatusConflicts(resolveIdentifierMeasureConflicts(dedupeSignals(signals)));
}

function dedupeSignals(signals: UniversalSignal[]): UniversalSignal[] {
  const byKey = new Map<string, UniversalSignal>();
  for (const signal of signals) {
    const key = `${signal.id}::${signal.physicalColumn}`;
    const existing = byKey.get(key);
    if (!existing || signal.confidence > existing.confidence) byKey.set(key, signal);
  }
  return [...byKey.values()];
}

export function inferOverlays(signals: UniversalSignal[]): IndustryOverlay[] {
  const ids = new Set(signals.map(signal => signal.id));
  const overlays = new Set<IndustryOverlay>(["generic_business"]);

  if (ids.has("item.medicine") || ids.has("entity.patient") || ids.has("entity.doctor") || ids.has("document.prescription")) {
    overlays.add("healthcare");
  }
  if (ids.has("document.shipment") || ids.has("location.route") || ids.has("entity.driver") || ids.has("status.delivery")) {
    overlays.add("logistics");
  }
  if (ids.has("inventory.age") || ids.has("inventory.age_bucket") || ids.has("status.stock")) {
    overlays.add("inventory");
  }
  if (ids.has("engagement.outcome") || ids.has("engagement.campaign_attempts") || ids.has("engagement.contact_channel")) {
    overlays.add("campaign");
  }
  if (ids.has("location.store") && (ids.has("money.revenue") || ids.has("money.receivable"))) {
    overlays.add("retail");
  }
  if (ids.has("entity.vendor") || ids.has("document.invoice")) {
    overlays.add("b2b");
  }
  if (ids.has("quality.formula_error") || ids.has("quality.technical_column")) {
    overlays.add("dirty_manual");
  }

  return [...overlays];
}
