import type { ColumnObservationV1 } from "../semantic-candidate-contracts";
import type { ColumnPhysicalProfileV1, SourceProfileV1 } from "../profiling-contracts";
import type { MicroBrainQueryV1 } from "./retrieval";

export const MICRO_BRAIN_QUERY_SIGNATURE_VERSION = "lightbi.micro-brain.query-signature.v1" as const;

export type MicroBrainShadowInvocationReasonV1 =
  | "no_lexical_candidate"
  | "alias_collision"
  | "weak_lexical_candidate"
  | "all_columns_benchmark";

export type MicroBrainQuerySignatureV1 = {
  schemaVersion: typeof MICRO_BRAIN_QUERY_SIGNATURE_VERSION;
  physicalColumn: string;
  query: MicroBrainQueryV1;
  evidenceRefs: string[];
  limitations: string[];
};

const STRONG_LEXICAL_EVIDENCE = new Set([
  "canonical_header_exact",
  "header_alias_exact",
  "alias_exact",
]);

export function microBrainShadowInvocationReason(
  observation: ColumnObservationV1,
): MicroBrainShadowInvocationReasonV1 | null {
  if (observation.state === "technical_candidate" || observation.state === "unsupported_input") return null;
  if (observation.state === "no_candidate") return "no_lexical_candidate";
  if (observation.candidateSet.hasAliasCollision) return "alias_collision";
  const hasStrongLexicalEvidence = observation.candidateSet.candidates.some((candidate) =>
    candidate.evidence.some((evidence) => evidence.direction === "support" && STRONG_LEXICAL_EVIDENCE.has(evidence.type)),
  );
  return hasStrongLexicalEvidence ? null : "weak_lexical_candidate";
}
function physicalTypeTags(column: ColumnPhysicalProfileV1): string[] {
  const tags = new Set<string>();
  for (const candidate of column.physicalTypeCandidates.slice(0, 3)) {
    if (candidate.confidence < 0.25) continue;
    if (candidate.type === "number" || candidate.type === "numeric_string") tags.add("type:number");
    else if (["date", "date_string", "excel_serial_date"].includes(candidate.type)) tags.add("type:date");
    else if (candidate.type === "string") tags.add("type:string");
    else if (candidate.type === "boolean") tags.add("type:boolean");
  }
  return [...tags].sort();
}

function boundedRepresentativeValues(column: ColumnPhysicalProfileV1): string[] {
  const values = new Set<string>();
  for (const rawValue of column.representativeRawValues) {
    if (values.size >= 6) break;
    if (rawValue == null) continue;
    const value = String(rawValue).replace(/\s+/g, " ").trim();
    if (!value || value.length > 64) continue;
    if (/^[-+]?\d+(?:[.,]\d+)?$/.test(value)) continue;
    values.add(value);
  }
  if (column.stringSummary) {
    for (const item of column.stringSummary.topValues) {
      if (values.size >= 6) break;
      const value = String(item.value).replace(/\s+/g, " ").trim();
      if (value && value.length <= 64) values.add(value);
    }
  }
  return [...values];
}

function shapeDescriptors(column: ColumnPhysicalProfileV1): string[] {
  const descriptors: string[] = [];
  if (column.numericSummary) descriptors.push("numeric values");
  if (column.dateTimeSummary) descriptors.push("date or time values");
  if (column.stringSummary?.likelyCategorical) descriptors.push("categorical values");
  if ((column.uniqueness.uniquenessRatio ?? 0) >= 0.9) descriptors.push("high uniqueness identifier-like values");
  if (column.nullCount > 0) descriptors.push("contains missing values");
  return descriptors;
}
export function buildMicroBrainQuerySignature(
  sourceProfile: SourceProfileV1,
  column: ColumnPhysicalProfileV1,
  options: { includeSiblingHeaders?: boolean; limit?: number } = {},
): MicroBrainQuerySignatureV1 {
  const representativeValues = boundedRepresentativeValues(column);
  const descriptors = shapeDescriptors(column);
  const pieces = [
    `column ${column.physicalColumnName}`,
    descriptors.length ? `shape ${descriptors.join(" ; ")}` : "",
    representativeValues.length ? `representative values ${representativeValues.join(" ; ")}` : "",
  ].filter(Boolean);

  if (options.includeSiblingHeaders) {
    const siblings = sourceProfile.header.physicalColumnNames
      .filter((name) => name !== column.physicalColumnName)
      .slice(0, 8);
    if (siblings.length) pieces.push(`sibling headers ${siblings.join(" ; ")}`);
  }

  const evidenceRefs = [
    `${column.columnId}:header`,
    ...column.physicalTypeCandidates.slice(0, 3).map((candidate) => `${column.columnId}:type:${candidate.type}`),
  ];
  if (representativeValues.length) evidenceRefs.push(`${column.columnId}:representative_values`);
  if (column.stringSummary) evidenceRefs.push(`${column.columnId}:string_summary`);
  if (column.numericSummary) evidenceRefs.push(`${column.columnId}:numeric_summary`);
  if (column.dateTimeSummary) evidenceRefs.push(`${column.columnId}:date_summary`);

  return {
    schemaVersion: MICRO_BRAIN_QUERY_SIGNATURE_VERSION,
    physicalColumn: column.physicalColumnName,
    query: {
      text: pieces.join(" . "),
      typedTags: physicalTypeTags(column),
      limit: options.limit ?? 8,
    },
    evidenceRefs,
    limitations: [
      "Representative values are bounded witnesses, not full-column truth.",
      "The query contains no file name, fixture ID, expected answer, or customer-specific dictionary.",
      "Sibling headers are excluded by default to avoid circular semantic proof.",
    ],
  };
}
