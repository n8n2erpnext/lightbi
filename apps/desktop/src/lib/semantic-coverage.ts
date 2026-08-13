export type SemanticCoverageStatus =
  | 'recognized'
  | 'partial'
  | 'unknown_business_like'
  | 'technical_or_noise';

export interface SemanticCoverageInputColumn {
  name: string;
  type?: string;
  sampleValues?: unknown[];
  uniqueValuesCount?: number;
  distinctRatio?: number;
}

export interface SemanticCoverageItem {
  physicalColumn: string;
  status: SemanticCoverageStatus;
  inferredSignal?: string;
  confidence: number;
  dataType: 'number' | 'date' | 'boolean' | 'string' | 'empty' | 'unknown';
  nonEmptySampleCount: number;
  distinctCount: number;
  topValues: string[];
  reason: string;
  suggestedActions: string[];
}

export interface SemanticCoverageReport {
  items: SemanticCoverageItem[];
  summary: {
    totalColumns: number;
    recognized: number;
    partial: number;
    unknownBusinessLike: number;
    technicalOrNoise: number;
    nonEmptyColumns: number;
    coverageScore: number;
  };
}

export interface MappingReviewLike {
  physicalColumn: string;
  inferredSignal?: string;
  issueType: 'recognized' | 'ambiguous' | 'unrecognized' | 'conflicting';
  confidence: number;
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stringify(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function isNumeric(value: string): boolean {
  if (!value) return false;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed);
}

function isDateLike(value: string): boolean {
  if (!value) return false;
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(value)) return true;
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(value)) return true;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && /\d/.test(value) && value.length >= 8;
}

function inferDataType(values: string[], declaredType?: string): SemanticCoverageItem['dataType'] {
  if (values.length === 0) return 'empty';
  const declared = normalize(declaredType || '');
  if (/(int|float|double|decimal|number|numeric|currency)/.test(declared)) return 'number';
  if (/(date|time|timestamp)/.test(declared)) return 'date';
  if (/(bool)/.test(declared)) return 'boolean';

  const numberCount = values.filter(isNumeric).length;
  const dateCount = values.filter(isDateLike).length;
  if (dateCount / values.length >= 0.8) return 'date';
  if (numberCount / values.length >= 0.8) return 'number';
  return 'string';
}

function isTechnicalColumn(columnName: string, values: string[], distinctRatio: number | undefined): boolean {
  const name = normalize(columnName);
  if (/^(__|unnamed|empty|index$|row number|row no|uuid|guid|hash|checksum|created by|modified by|owner)$/i.test(name)) return true;
  if (/^(id|uuid|guid)$/.test(name) && (distinctRatio ?? 0) > 0.9) return true;
  if (values.length === 0) return true;
  return false;
}

function looksBusinessLike(column: SemanticCoverageInputColumn, values: string[], dataType: SemanticCoverageItem['dataType']): boolean {
  if (values.length === 0) return false;
  const name = normalize(column.name);
  const distinctCount = column.uniqueValuesCount ?? new Set(values).size;
  const distinctRatio = column.distinctRatio ?? (values.length > 0 ? distinctCount / values.length : 1);

  if (/(amount|total|revenue|sales|cost|fee|price|profit|margin|qty|quantity|count|rate|score|balance|debit|credit|ar|ap|tax|vat|discount|budget|actual|target|value)/.test(name)) return true;
  if (/(date|period|month|year|time|status|state|type|category|product|item|sku|store|branch|warehouse|customer|supplier|vendor|employee|salesperson|carrier|route|driver|payment|invoice|order|shipment|delivery|account|brand|channel|region|location)/.test(name)) return true;

  if (dataType === 'number' && !/(^id$| id$|_id$|code|no$|number$)/.test(name)) return true;
  if (dataType === 'date') return true;
  if (dataType === 'string' && distinctCount >= 2 && distinctCount <= 80 && distinctRatio <= 0.8) return true;
  return false;
}

export function createSemanticCoverageReport(
  columns: SemanticCoverageInputColumn[],
  mappingItems: MappingReviewLike[] = []
): SemanticCoverageReport {
  const mappingByColumn = new Map(mappingItems.map(item => [item.physicalColumn, item]));

  const items: SemanticCoverageItem[] = columns.map(column => {
    const values = (column.sampleValues || []).map(stringify).filter(Boolean);
    const valueCounts = new Map<string, number>();
    for (const value of values) valueCounts.set(value, (valueCounts.get(value) ?? 0) + 1);
    const topValues = [...valueCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value]) => value);
    const distinctCount = column.uniqueValuesCount ?? valueCounts.size;
    const distinctRatio = column.distinctRatio ?? (values.length > 0 ? distinctCount / values.length : undefined);
    const dataType = inferDataType(values, column.type);
    const mapping = mappingByColumn.get(column.name);

    if (mapping?.issueType === 'recognized') {
      return {
        physicalColumn: column.name,
        status: 'recognized',
        inferredSignal: mapping.inferredSignal,
        confidence: mapping.confidence,
        dataType,
        nonEmptySampleCount: values.length,
        distinctCount,
        topValues,
        reason: mapping.inferredSignal ? `Mapped to ${mapping.inferredSignal}.` : 'Recognized by semantic mapping.',
        suggestedActions: []
      };
    }

    if (mapping?.issueType === 'ambiguous' || mapping?.issueType === 'conflicting') {
      return {
        physicalColumn: column.name,
        status: 'partial',
        inferredSignal: mapping.inferredSignal,
        confidence: mapping.confidence,
        dataType,
        nonEmptySampleCount: values.length,
        distinctCount,
        topValues,
        reason: mapping.issueType === 'ambiguous'
          ? 'Multiple possible business meanings were detected.'
          : 'The same business signal appears to be represented by multiple columns.',
        suggestedActions: ['Review mapping before making a decision from this field.']
      };
    }

    if (isTechnicalColumn(column.name, values, distinctRatio)) {
      return {
        physicalColumn: column.name,
        status: 'technical_or_noise',
        confidence: 60,
        dataType,
        nonEmptySampleCount: values.length,
        distinctCount,
        topValues,
        reason: values.length === 0 ? 'Column is empty in the sampled rows.' : 'Column looks technical, identifier-only, or non-business.',
        suggestedActions: []
      };
    }

    if (looksBusinessLike(column, values, dataType)) {
      return {
        physicalColumn: column.name,
        status: 'unknown_business_like',
        confidence: 35,
        dataType,
        nonEmptySampleCount: values.length,
        distinctCount,
        topValues,
        reason: 'Column has business-like data but no safe canonical signal mapping yet.',
        suggestedActions: ['Surface this field in coverage review.', 'Do not ignore it in BA/AI narrative.', 'Add mapping or domain playbook support if it matters to the selected angle.']
      };
    }

    return {
      physicalColumn: column.name,
      status: 'technical_or_noise',
      confidence: 40,
      dataType,
      nonEmptySampleCount: values.length,
      distinctCount,
      topValues,
      reason: 'No reliable business meaning was inferred from header or values.',
      suggestedActions: []
    };
  });

  const recognized = items.filter(item => item.status === 'recognized').length;
  const partial = items.filter(item => item.status === 'partial').length;
  const unknownBusinessLike = items.filter(item => item.status === 'unknown_business_like').length;
  const technicalOrNoise = items.filter(item => item.status === 'technical_or_noise').length;
  const nonEmptyColumns = items.filter(item => item.nonEmptySampleCount > 0).length;
  const coverageScore = nonEmptyColumns === 0
    ? 0
    : Math.round(((recognized + partial * 0.5) / nonEmptyColumns) * 100);

  return {
    items,
    summary: {
      totalColumns: items.length,
      recognized,
      partial,
      unknownBusinessLike,
      technicalOrNoise,
      nonEmptyColumns,
      coverageScore
    }
  };
}
