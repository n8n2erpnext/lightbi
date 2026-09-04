import {
  SEMANTIC_SIGNAL_REGISTRY_V1,
  type SemanticSignalDefinition,
} from "../semantic-registry";
import type {
  ColumnPhysicalProfileV1,
  DatasetUnderstandingArtifactV1,
  PhysicalTypeName,
  RepresentativeEvidenceRowV1,
} from "./profiling-contracts";
import type { CompiledMicroBrainIndexV1 } from "./micro-brain/contracts";
import { augmentCandidateArtifactWithMicroBrain } from "./micro-brain/evidence-bridge";
import {
  CANDIDATE_ARTIFACT_SCHEMA_VERSION,
  COLUMN_OBSERVATION_SCHEMA_VERSION,
  SEMANTIC_CANDIDATE_SCHEMA_VERSION,
  SEMANTIC_CANDIDATE_SET_SCHEMA_VERSION,
  type CandidateArtifactV1,
  type ColumnObservationState,
  type ColumnObservationV1,
  type ConflictEvidenceV1,
  type EvidenceDirection,
  type EvidenceSource,
  type EvidenceV1,
  type EvidenceWitnessV1,
  type SemanticCandidateV1,
  type SemanticEvidenceType,
} from "./semantic-candidate-contracts";

const EVIDENCE_STRENGTH: Record<SemanticEvidenceType, number> = {
  canonical_header_exact: 1,
  header_alias_exact: 0.9,
  alias_exact: 0.82,
  alias_token_containment: 0.55,
  alias_collision: 0.5,
  micro_brain_retrieval: 0.2,
  value_alias: 0.66,
  value_pattern: 0.62,
  physical_type_compatible: 0.45,
  physical_type_conflict: 0.7,
  numeric_shape: 0.3,
  date_shape: 0.3,
  string_shape: 0.2,
  identifier_shape: 0.38,
  categorical_shape: 0.3,
  status_shape: 0.36,
  sibling_header_context: 0.18,
  technical_column: 0.85,
  structural_issue: 0.35,
  parse_failure: 0.45,
  mixed_type: 0.55,
  unsupported_value: 0.7,
};

type CandidateAccumulator = {
  definition: SemanticSignalDefinition;
  evidence: EvidenceV1[];
  limitations: Set<string>;
};

type EvidenceFactoryInput = {
  type: SemanticEvidenceType;
  source: EvidenceSource;
  candidateId: string | null;
  direction: EvidenceDirection;
  explanationCode: string;
  witnesses?: EvidenceWitnessV1[];
  limitations?: string[];
};

export type SemanticCandidateGeneratorOptionsV1 = {
  registry?: readonly SemanticSignalDefinition[];
  microBrain?: {
    index: CompiledMicroBrainIndexV1;
    mode?: "selective" | "all";
    maxCandidatesPerColumn?: number;
  };
};

export function normalizeSemanticSurface(value: unknown): string {
  return String(value ?? "")
    .replace(/đ/gi, (character) => (character === "Đ" ? "D" : "d"))
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compactSurface(value: string): string {
  return value.replace(/\s+/g, "");
}

function tokenContainmentMatch(header: string, surface: string): boolean {
  if (!header || !surface || header === surface) return false;
  const headerTokens = header.split(" ");
  const surfaceTokens = surface.split(" ");
  if (surface.length < 4) return false;
  return surfaceTokens.every((token) => headerTokens.includes(token));
}

const ACCOUNTING_AMOUNT_QUALIFIERS = new Set(["amount", "balance", "credit", "debit", "total", "value"]);
const GENERIC_TIME_SUFFIXES = new Set(["date", "month", "time", "year"]);

function accountingMeasureHeadMatch(
  header: string,
  surface: string,
  definition: SemanticSignalDefinition,
): boolean {
  if (definition.type !== "measure" || definition.semanticFamily !== "money") return false;
  const headerTokens = header.split(" ").filter(Boolean);
  const surfaceTokens = new Set(surface.split(" ").filter(Boolean));
  if (surfaceTokens.size === 0 || ![...surfaceTokens].every((token) => headerTokens.includes(token))) return false;
  const qualifiers = headerTokens.filter((token) => !surfaceTokens.has(token));
  return qualifiers.length > 0 && qualifiers.every((token) => ACCOUNTING_AMOUNT_QUALIFIERS.has(token));
}

function genericTimeSuffixMatch(
  header: string,
  surface: string,
  definition: SemanticSignalDefinition,
): boolean {
  if (definition.canonicalId !== "time_period") return false;
  const tokens = header.split(" ").filter(Boolean);
  const suffix = tokens[tokens.length - 1];
  return tokens.length > 1 && suffix === surface && GENERIC_TIME_SUFFIXES.has(suffix);
}

function shipmentDocumentReferenceMatch(
  header: string,
  definition: SemanticSignalDefinition,
): boolean {
  if (definition.canonicalId !== "shipment") return false;
  const tokens = new Set(header.split(" ").filter(Boolean));
  const vietnameseReference = tokens.has("ma") && tokens.has("phieu") && tokens.has("gui");
  const reference = ["code", "id", "no", "number"].some((token) => tokens.has(token));
  const consignmentReference = reference && tokens.has("consignment") && (tokens.has("note") || tokens.has("slip"));
  return vietnameseReference || consignmentReference;
}

function qualifiedBusinessHeaderMatch(
  header: string,
  definition: SemanticSignalDefinition,
  allHeaders: readonly string[],
): { surface: string; code: string } | null {
  const tokens = header.split(" ").filter(Boolean);
  const tokenSet = new Set(tokens);
  const identityQualifier = ["id", "code", "no", "number"].some((token) => tokenSet.has(token));
  const sourceTokenSets = allHeaders.map((value) => new Set(value.split(" ").filter(Boolean)));
  const hasQualified = (heads: readonly string[]) => sourceTokenSets.some((set) => heads.some((head) => set.has(head)) && ["id", "code", "no", "number"].some((qualifier) => set.has(qualifier)));
  const hasOnHand = sourceTokenSets.some((set) => (set.has("quantity") || set.has("qty")) && set.has("on") && set.has("hand"));
  const hasAsOf = sourceTokenSets.some((set) => set.has("as") && set.has("of") && (set.has("date") || set.has("time")));
  const hasUom = sourceTokenSets.some((set) => set.has("uom") || (set.has("unit") && set.has("measure")));
  const explicitSnapshotSchema = hasQualified(["item", "product", "material"])
    && hasQualified(["warehouse", "storage", "location"])
    && hasOnHand
    && hasAsOf
    && hasUom;
  if (!explicitSnapshotSchema) return null;
  if (definition.canonicalId === "sku" && identityQualifier && ["item", "product", "material"].some((token) => tokenSet.has(token))) {
    return { surface: "item-identity-composition", code: "header_matches_item_identity_composition" };
  }
  if (definition.canonicalId === "warehouse" && identityQualifier && ["warehouse", "storage", "location"].some((token) => tokenSet.has(token))) {
    return { surface: "warehouse-identity-composition", code: "header_matches_warehouse_identity_composition" };
  }
  const onHandQuantity = (tokenSet.has("quantity") || tokenSet.has("qty")) && tokenSet.has("on") && tokenSet.has("hand");
  const stockBalance = (tokenSet.has("stock") || tokenSet.has("inventory")) && (tokenSet.has("quantity") || tokenSet.has("qty") || tokenSet.has("balance"));
  if (definition.canonicalId === "stock_qty" && (onHandQuantity || stockBalance)) {
    return { surface: "stock-balance-composition", code: "header_matches_stock_balance_composition" };
  }
  return null;
}

function uniqueWitnesses(witnesses: EvidenceWitnessV1[]): EvidenceWitnessV1[] {
  const seen = new Set<string>();
  return witnesses.filter((witness) => {
    const key = JSON.stringify(witness);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function representativeValues(
  rows: readonly RepresentativeEvidenceRowV1[],
  physicalColumn: string,
): EvidenceWitnessV1[] {
  return uniqueWitnesses(
    rows
      .filter((row) => Object.prototype.hasOwnProperty.call(row.values, physicalColumn))
      .map((row) => ({
        sourceRowIndex: row.sourceRowIndex,
        dataRowIndex: row.dataRowIndex,
        rawValue: row.values[physicalColumn],
        normalizedValue: normalizeSemanticSurface(row.values[physicalColumn]),
      }))
      .filter((witness) => witness.rawValue !== null && witness.rawValue !== undefined && witness.normalizedValue),
  );
}

function physicalTypes(column: ColumnPhysicalProfileV1): PhysicalTypeName[] {
  return column.physicalTypeCandidates
    .filter((candidate) => candidate.confidence >= 0.2)
    .map((candidate) => candidate.type);
}

function registryTypeMatches(compatibleTypes: readonly string[], physicalType: PhysicalTypeName): boolean {
  const normalized = new Set(compatibleTypes.map((type) => type.toLowerCase()));
  if (physicalType === "excel_serial_date") {
    return ["date", "datetime", "timestamp"].some((type) => normalized.has(type));
  }
  if (physicalType === "number" || physicalType === "numeric_string") {
    return ["number", "integer", "float", "double", "decimal", "currency"].some((type) => normalized.has(type));
  }
  if (physicalType === "date" || physicalType === "date_string") {
    return ["date", "datetime", "timestamp", "string", "varchar", "text"].some((type) => normalized.has(type));
  }
  if (physicalType === "boolean") return normalized.has("boolean") || normalized.has("bool");
  if (physicalType === "string") return ["string", "varchar", "text"].some((type) => normalized.has(type));
  return false;
}

function valuePatternMatches(pattern: RegExp, value: string): boolean {
  pattern.lastIndex = 0;
  const matched = pattern.test(value);
  pattern.lastIndex = 0;
  return matched;
}

export function generateSemanticCandidateArtifact(
  physicalArtifact: DatasetUnderstandingArtifactV1,
  options: SemanticCandidateGeneratorOptionsV1 = {},
): CandidateArtifactV1 {
  const registry = [...(options.registry ?? SEMANTIC_SIGNAL_REGISTRY_V1)].sort((left, right) =>
    left.canonicalId.localeCompare(right.canonicalId),
  );
  const sourceId = physicalArtifact.sourceProfile.source.sourceId;
  const allHeaders = physicalArtifact.sourceProfile.columns.map((column) => normalizeSemanticSurface(column.physicalColumnName));

  const observations = physicalArtifact.sourceProfile.columns
    .map((column) => buildObservation(column, physicalArtifact, registry, allHeaders))
    .sort((left, right) => left.sourceColumnIndex - right.sourceColumnIndex);

  const initialCounts: Record<ColumnObservationState, number> = {
    candidates_present: 0,
    no_candidate: 0,
    technical_candidate: 0,
    unsupported_input: 0,
  };
  const stateCounts = observations.reduce((counts, observation) => {
    counts[observation.state] += 1;
    return counts;
  }, initialCounts);

  const artifact: CandidateArtifactV1 = {
    schemaVersion: CANDIDATE_ARTIFACT_SCHEMA_VERSION,
    sourceId,
    sourceHash: physicalArtifact.provenance.sourceHash ?? null,
    profileSchemaVersion: physicalArtifact.provenance.profileSchemaVersion,
    registryVersion: "semantic-signal-registry.v1",
    observations,
    coverage: {
      physicalColumnCount: physicalArtifact.sourceProfile.columns.length,
      observedColumnCount: observations.length,
      stateCounts,
    },
    limitations: [
      "This artifact contains semantic candidates and evidence only.",
      "No contextual resolution or final semantic mapping has been executed.",
      "Representative values are evidence witnesses, not full-file semantic truth.",
    ],
  };
  return options.microBrain
    ? augmentCandidateArtifactWithMicroBrain(physicalArtifact, artifact, options.microBrain.index, {
        mode: options.microBrain.mode,
        maxCandidatesPerColumn: options.microBrain.maxCandidatesPerColumn,
      })
    : artifact;
}

function buildObservation(
  column: ColumnPhysicalProfileV1,
  artifact: DatasetUnderstandingArtifactV1,
  registry: readonly SemanticSignalDefinition[],
  allHeaders: readonly string[],
): ColumnObservationV1 {
  const sourceId = column.sourceId;
  const normalizedHeader = normalizeSemanticSurface(column.physicalColumnName);
  let evidenceOrdinal = 0;
  const makeEvidence = (input: EvidenceFactoryInput): EvidenceV1 => ({
    schemaVersion: SEMANTIC_CANDIDATE_SCHEMA_VERSION,
    evidenceId: `${sourceId}:${column.sourceColumnIndex}:${input.candidateId ?? "column"}:${input.type}:${evidenceOrdinal++}`,
    type: input.type,
    source: input.source,
    sourceId,
    physicalColumn: column.physicalColumnName,
    candidateId: input.candidateId,
    direction: input.direction,
    strength: EVIDENCE_STRENGTH[input.type],
    explanationCode: input.explanationCode,
    witnesses: uniqueWitnesses(input.witnesses ?? []),
    limitations: [...(input.limitations ?? [])],
  });

  const candidateMap = new Map<string, CandidateAccumulator>();
  const values = representativeValues(artifact.representativeEvidence.rows, column.physicalColumnName);
  const ensureCandidate = (definition: SemanticSignalDefinition): CandidateAccumulator => {
    const existing = candidateMap.get(definition.canonicalId);
    if (existing) return existing;
    const created = { definition, evidence: [], limitations: new Set<string>() };
    candidateMap.set(definition.canonicalId, created);
    return created;
  };

  for (const definition of registry) {
    const candidateId = definition.canonicalId;
    const canonical = normalizeSemanticSurface(candidateId);
    const canonicalLabel = normalizeSemanticSurface(definition.label);
    const matchedHeaderSurfaces: Array<{ type: SemanticEvidenceType; surface: string; code: string }> = [];

    if (shipmentDocumentReferenceMatch(normalizedHeader, definition)) {
      matchedHeaderSurfaces.push({ type: "alias_exact", surface: "document-reference-composition", code: "header_matches_shipment_document_reference_composition" });
    }
    const qualifiedHeader = qualifiedBusinessHeaderMatch(normalizedHeader, definition, allHeaders);
    if (qualifiedHeader) matchedHeaderSurfaces.push({ type: "alias_exact", ...qualifiedHeader });

    if (normalizedHeader && (normalizedHeader === canonical || compactSurface(normalizedHeader) === compactSurface(canonical))) {
      matchedHeaderSurfaces.push({ type: "canonical_header_exact", surface: candidateId, code: "header_matches_canonical_id" });
    }
    if (normalizedHeader && normalizedHeader === canonicalLabel && canonicalLabel !== canonical) {
      matchedHeaderSurfaces.push({ type: "header_alias_exact", surface: definition.label, code: "header_matches_registry_label" });
    }
    for (const surface of definition.exactHeaderAliases ?? []) {
      if (normalizedHeader && normalizedHeader === normalizeSemanticSurface(surface)) {
        matchedHeaderSurfaces.push({ type: "header_alias_exact", surface, code: "header_matches_exact_header_alias" });
      }
    }
    for (const surface of definition.headerAliases) {
      const normalized = normalizeSemanticSurface(surface);
      if (normalizedHeader && normalizedHeader === normalized) {
        matchedHeaderSurfaces.push({ type: "header_alias_exact", surface, code: "header_matches_header_alias" });
      } else if (genericTimeSuffixMatch(normalizedHeader, normalized, definition)) {
        matchedHeaderSurfaces.push({ type: "header_alias_exact", surface, code: "generic_time_role_suffix" });
      } else if (accountingMeasureHeadMatch(normalizedHeader, normalized, definition)) {
        matchedHeaderSurfaces.push({ type: "header_alias_exact", surface, code: "header_matches_measure_head_with_accounting_qualifier" });
      } else if (tokenContainmentMatch(normalizedHeader, normalized)) {
        matchedHeaderSurfaces.push({ type: "alias_token_containment", surface, code: "header_contains_header_alias_tokens" });
      }
    }
    for (const surface of definition.aliases) {
      const normalized = normalizeSemanticSurface(surface);
      if (normalizedHeader && normalizedHeader === normalized) {
        matchedHeaderSurfaces.push({ type: "alias_exact", surface, code: "header_matches_registry_alias" });
      } else if (accountingMeasureHeadMatch(normalizedHeader, normalized, definition)) {
        matchedHeaderSurfaces.push({ type: "alias_exact", surface, code: "header_matches_measure_head_with_accounting_qualifier" });
      } else if (tokenContainmentMatch(normalizedHeader, normalized)) {
        matchedHeaderSurfaces.push({ type: "alias_token_containment", surface, code: "header_contains_alias_tokens" });
      }
    }

    const matchedValueAliases = definition.valueAliases.flatMap((alias) => {
      const normalizedAlias = normalizeSemanticSurface(alias);
      return values
        .filter((witness) => witness.normalizedValue === normalizedAlias)
        .map((witness) => ({ ...witness, registrySurface: alias }));
    });
    const matchedValuePatterns = definition.valuePatterns.flatMap((pattern) =>
      values
        .filter((witness) => valuePatternMatches(pattern, String(witness.rawValue ?? "")))
        .map((witness) => ({ ...witness, registrySurface: pattern.source })),
    );

    if (matchedHeaderSurfaces.length === 0 && matchedValueAliases.length === 0 && matchedValuePatterns.length === 0) continue;

    const candidate = ensureCandidate(definition);
    for (const match of matchedHeaderSurfaces) {
      candidate.evidence.push(
        makeEvidence({
          type: match.type,
          source: "semantic_registry",
          candidateId,
          direction: "support",
          explanationCode: match.code,
          witnesses: [{ normalizedValue: normalizedHeader, registrySurface: match.surface }],
          limitations: ["Header evidence alone cannot establish a final semantic mapping."],
        }),
      );
    }
    if (matchedValueAliases.length > 0) {
      candidate.evidence.push(
        makeEvidence({
          type: "value_alias",
          source: "representative_evidence",
          candidateId,
          direction: "support",
          explanationCode: "representative_value_matches_registry_alias",
          witnesses: matchedValueAliases.slice(0, 12),
          limitations: ["Representative evidence is not full-file semantic truth."],
        }),
      );
      candidate.limitations.add("Candidate includes representative-value evidence that requires later contextual resolution.");
    }
    if (matchedValuePatterns.length > 0) {
      candidate.evidence.push(
        makeEvidence({
          type: "value_pattern",
          source: "representative_evidence",
          candidateId,
          direction: "support",
          explanationCode: "representative_value_matches_registry_pattern",
          witnesses: matchedValuePatterns.slice(0, 12),
          limitations: ["Pattern matches are candidate evidence only."],
        }),
      );
    }

    appendPhysicalEvidence(candidate, column, makeEvidence);
    appendSiblingEvidence(candidate, normalizedHeader, allHeaders, registry, makeEvidence);
    appendStructuralCandidateEvidence(candidate, column, makeEvidence);
  }

  const headerLexicalTypes = new Set<SemanticEvidenceType>(["canonical_header_exact", "header_alias_exact", "alias_exact", "alias_token_containment"]);
  const lexicalCollisionCandidates = [...candidateMap.values()].filter((candidate) => candidate.evidence.some((item) => headerLexicalTypes.has(item.type)));
  const collision = lexicalCollisionCandidates.length > 1;
  if (collision) {
    for (const candidate of candidateMap.values()) {
      candidate.evidence.push(
        makeEvidence({
          type: "alias_collision",
          source: "candidate_generator",
          candidateId: candidate.definition.canonicalId,
          direction: "neutral",
          explanationCode: "multiple_registry_candidates_retained",
          witnesses: lexicalCollisionCandidates.map((item) => item.definition.canonicalId).sort().map((candidateId) => ({ registrySurface: candidateId })),
          limitations: ["All colliding candidates are retained for a later contextual phase."],
        }),
      );
    }
  }

  const columnEvidence = buildColumnEvidence(column, makeEvidence);
  const candidates = [...candidateMap.values()]
    .sort((left, right) => left.definition.canonicalId.localeCompare(right.definition.canonicalId))
    .map(toCandidateContract);
  const unsupported = !normalizedHeader || /^empty(?:\s+\d+)?$/.test(normalizedHeader) || column.physicalColumnName.startsWith("__EMPTY");
  const technical = column.technicalColumnEvidence.length > 0 || column.issues.some((issue) => issue.code === "technical_column");
  const state: ColumnObservationState = unsupported
    ? "unsupported_input"
    : technical
      ? "technical_candidate"
      : candidates.length > 0
        ? "candidates_present"
        : "no_candidate";

  return {
    schemaVersion: COLUMN_OBSERVATION_SCHEMA_VERSION,
    sourceId,
    columnId: column.columnId,
    sourceColumnIndex: column.sourceColumnIndex,
    physicalColumn: column.physicalColumnName,
    state,
    candidateSet: {
      schemaVersion: SEMANTIC_CANDIDATE_SET_SCHEMA_VERSION,
      sourceId,
      physicalColumn: column.physicalColumnName,
      candidates,
      hasAliasCollision: collision,
      candidateOnly: true,
      contextualResolution: {
        contractAvailable: true,
        executed: false,
        requiredEvidence: ["value_and_type", "sibling_context", "grain_context", "cross_source_context"],
      },
      limitations: candidates.length === 0
        ? ["No semantic registry candidate was generated from the available evidence."]
        : ["Candidates are not final semantic mappings."],
    },
    columnEvidence,
    limitations: state === "unsupported_input"
      ? ["The physical header is empty or unsupported; no business conclusion was inferred."]
      : state === "technical_candidate"
        ? ["Technical-column evidence is preserved separately from business candidates."]
        : [],
  };
}

function appendPhysicalEvidence(
  candidate: CandidateAccumulator,
  column: ColumnPhysicalProfileV1,
  makeEvidence: (input: EvidenceFactoryInput) => EvidenceV1,
): void {
  const candidateId = candidate.definition.canonicalId;
  const types = physicalTypes(column);
  const compatible = types.filter((type) => registryTypeMatches(candidate.definition.compatibleTypes, type));
  if (compatible.length > 0) {
    candidate.evidence.push(makeEvidence({
      type: "physical_type_compatible",
      source: "source_profile",
      candidateId,
      direction: "support",
      explanationCode: "profile_type_is_registry_compatible",
      witnesses: compatible.map((type) => ({ rawValue: type })),
    }));
  } else if (types.some((type) => !["empty", "unknown", "mixed"].includes(type))) {
    candidate.evidence.push(makeEvidence({
      type: "physical_type_conflict",
      source: "source_profile",
      candidateId,
      direction: "conflict",
      explanationCode: "profile_type_conflicts_with_registry_types",
      witnesses: types.map((type) => ({ rawValue: type })),
      limitations: ["A type conflict does not discard a candidate."],
    }));
  }

  if (column.numericSummary) {
    candidate.evidence.push(makeEvidence({
      type: "numeric_shape",
      source: "source_profile",
      candidateId,
      direction: candidate.definition.type === "measure" ? "support" : "neutral",
      explanationCode: "numeric_profile_available",
      witnesses: [{ rawValue: { minimum: column.numericSummary.minimum, maximum: column.numericSummary.maximum } }],
    }));
  }
  if (column.dateTimeSummary) {
    candidate.evidence.push(makeEvidence({
      type: "date_shape",
      source: "source_profile",
      candidateId,
      direction: candidate.definition.type === "time" ? "support" : "neutral",
      explanationCode: "date_profile_available",
      witnesses: [{ rawValue: { minimumIso: column.dateTimeSummary.minimumIso, maximumIso: column.dateTimeSummary.maximumIso } }],
    }));
  }
  if (column.stringSummary) {
    candidate.evidence.push(makeEvidence({
      type: column.stringSummary.likelyCategorical ? "categorical_shape" : "string_shape",
      source: "source_profile",
      candidateId,
      direction: "neutral",
      explanationCode: column.stringSummary.likelyCategorical ? "profile_is_categorical_like" : "profile_is_string_like",
    }));
    if (candidate.definition.role === "status" && column.stringSummary.likelyCategorical) {
      candidate.evidence.push(makeEvidence({
        type: "status_shape",
        source: "source_profile",
        candidateId,
        direction: "support",
        explanationCode: "status_candidate_has_categorical_shape",
      }));
    }
  }
  if (candidate.definition.role === "identifier" && (column.uniqueness.uniquenessRatio ?? 0) >= 0.9) {
    candidate.evidence.push(makeEvidence({
      type: "identifier_shape",
      source: "source_profile",
      candidateId,
      direction: "support",
      explanationCode: "identifier_candidate_has_high_uniqueness",
      witnesses: [{ rawValue: column.uniqueness.uniquenessRatio }],
    }));
  }
}

function appendSiblingEvidence(
  candidate: CandidateAccumulator,
  normalizedHeader: string,
  allHeaders: readonly string[],
  registry: readonly SemanticSignalDefinition[],
  makeEvidence: (input: EvidenceFactoryInput) => EvidenceV1,
): void {
  const siblingMatches = allHeaders
    .filter((header) => header && header !== normalizedHeader)
    .filter((header) => registry.some((definition) =>
      definition.canonicalId !== candidate.definition.canonicalId
      && definition.semanticFamily === candidate.definition.semanticFamily
      && [definition.canonicalId, definition.label, ...definition.headerAliases, ...definition.aliases]
        .some((surface) => normalizeSemanticSurface(surface) === header),
    ));
  if (siblingMatches.length === 0) return;
  candidate.evidence.push(makeEvidence({
    type: "sibling_header_context",
    source: "source_profile",
    candidateId: candidate.definition.canonicalId,
    direction: "neutral",
    explanationCode: "sibling_header_shares_semantic_family",
    witnesses: [...new Set(siblingMatches)].sort().map((header) => ({ normalizedValue: header })),
    limitations: ["Sibling context is recorded but not resolved in Phase 3A."],
  }));
}

function appendStructuralCandidateEvidence(
  candidate: CandidateAccumulator,
  column: ColumnPhysicalProfileV1,
  makeEvidence: (input: EvidenceFactoryInput) => EvidenceV1,
): void {
  const candidateId = candidate.definition.canonicalId;
  if (column.technicalColumnEvidence.length > 0) {
    candidate.evidence.push(makeEvidence({
      type: "technical_column",
      source: "structural_profile",
      candidateId,
      direction: "conflict",
      explanationCode: "profile_marks_column_as_technical",
      witnesses: column.technicalColumnEvidence.map((value) => ({ rawValue: value })),
      limitations: ["Technical evidence is not used to silently discard registry candidates."],
    }));
  }
  if (column.issues.some((issue) => issue.code === "mixed_type")) {
    candidate.evidence.push(makeEvidence({
      type: "mixed_type",
      source: "structural_profile",
      candidateId,
      direction: "conflict",
      explanationCode: "column_contains_mixed_physical_types",
    }));
  }
  const physicalTypes = new Set(column.physicalTypeCandidates.map((candidateType) => candidateType.type));
  const compatibleTypes = new Set(candidate.definition.compatibleTypes);
  const numericTypes = ["number", "integer", "float", "double", "decimal", "currency"];
  const dateTypes = ["date", "datetime", "timestamp"];
  const stringTypes = ["string", "varchar", "text"];
  const acceptsNumericTypes = numericTypes.some((type) => compatibleTypes.has(type));
  const acceptsStringTypes = stringTypes.some((type) => compatibleTypes.has(type));
  // Business document identifiers legitimately mix numeric-only and prefixed string
  // values. A failed numeric parse is not a structural conflict when the registry
  // explicitly permits the same identifier to be represented as a string.
  const flexibleDocumentIdentifier = candidate.definition.role === "identifier"
    && acceptsNumericTypes
    && acceptsStringTypes;
  const relevantParsers = new Set<string>();
  if (acceptsNumericTypes
    && !flexibleDocumentIdentifier
    && (physicalTypes.has("number") || physicalTypes.has("numeric_string"))) relevantParsers.add("numeric");
  if ((candidate.definition.role === "time" || dateTypes.some((type) => compatibleTypes.has(type)))
    && (physicalTypes.has("date") || physicalTypes.has("date_string") || physicalTypes.has("excel_serial_date"))) relevantParsers.add("date");
  if (stringTypes.some((type) => compatibleTypes.has(type))
    && physicalTypes.has("string")
    && !physicalTypes.has("numeric_string")) relevantParsers.add("string");
  const failures = column.parseEvidence
    .filter((parse) => relevantParsers.has(parse.parser))
    .flatMap((parse) => parse.representativeFailures);
  if (failures.length > 0) {
    candidate.evidence.push(makeEvidence({
      type: "parse_failure",
      source: "source_profile",
      candidateId,
      direction: "conflict",
      explanationCode: "column_contains_parse_failures",
      witnesses: failures.slice(0, 12).map((failure) => ({ sourceRowIndex: failure.sourceRowIndex, rawValue: failure.rawValue })),
    }));
  }
}

function buildColumnEvidence(
  column: ColumnPhysicalProfileV1,
  makeEvidence: (input: EvidenceFactoryInput) => EvidenceV1,
): EvidenceV1[] {
  const evidence: EvidenceV1[] = [];
  if (column.technicalColumnEvidence.length > 0) {
    evidence.push(makeEvidence({
      type: "technical_column",
      source: "structural_profile",
      candidateId: null,
      direction: "neutral",
      explanationCode: "technical_column_evidence_preserved",
      witnesses: column.technicalColumnEvidence.map((value) => ({ rawValue: value })),
    }));
  }
  for (const issue of column.issues) {
    evidence.push(makeEvidence({
      type: issue.code === "mixed_type" ? "mixed_type" : "structural_issue",
      source: "structural_profile",
      candidateId: null,
      direction: "neutral",
      explanationCode: `structural_issue_${issue.code}`,
      witnesses: issue.sourceRowIndices.map((sourceRowIndex) => ({ sourceRowIndex })),
    }));
  }
  return evidence;
}

function toCandidateContract(accumulator: CandidateAccumulator): SemanticCandidateV1 {
  const evidence = [...accumulator.evidence].sort((left, right) => left.evidenceId.localeCompare(right.evidenceId));
  return {
    schemaVersion: SEMANTIC_CANDIDATE_SCHEMA_VERSION,
    candidateId: accumulator.definition.canonicalId,
    label: accumulator.definition.label,
    domain: accumulator.definition.domain,
    domains: [...accumulator.definition.domains],
    semanticFamily: accumulator.definition.semanticFamily,
    signalType: accumulator.definition.type,
    role: accumulator.definition.role,
    registryCoverage: accumulator.definition.coverageStatus,
    evidence,
    conflictEvidence: evidence.filter((item): item is ConflictEvidenceV1 => item.direction === "conflict"),
    limitations: [...accumulator.limitations].sort(),
  };
}
