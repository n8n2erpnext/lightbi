import { CONTEXTUAL_EVIDENCE_POLICY_VERSION, type AggregationPolicyV1, type ContextRelationPolicyV1, type EvidenceFamily } from "./contextual-evidence-contracts";
import type { SemanticEvidenceType } from "./semantic-candidate-contracts";

export const EVIDENCE_FAMILY_ORDER: EvidenceFamily[] = [
  "lexical_identity", "physical_compatibility", "value_semantics",
  "cardinality_role", "sibling_context", "structural_integrity",
];
export const EVIDENCE_FAMILY_BY_TYPE: Record<SemanticEvidenceType, EvidenceFamily> = {
  canonical_header_exact: "lexical_identity", header_alias_exact: "lexical_identity",
  alias_exact: "lexical_identity", alias_token_containment: "lexical_identity", alias_collision: "lexical_identity",
  micro_brain_retrieval: "lexical_identity",
  value_alias: "value_semantics", value_pattern: "value_semantics",
  physical_type_compatible: "physical_compatibility", physical_type_conflict: "physical_compatibility",
  numeric_shape: "physical_compatibility", date_shape: "physical_compatibility", string_shape: "physical_compatibility",
  identifier_shape: "cardinality_role", categorical_shape: "cardinality_role", status_shape: "cardinality_role",
  sibling_header_context: "sibling_context", technical_column: "structural_integrity",
  structural_issue: "structural_integrity", parse_failure: "structural_integrity",
  mixed_type: "structural_integrity", unsupported_value: "structural_integrity",
};
export const CONTEXTUAL_EVIDENCE_POLICY: AggregationPolicyV1 = {
  schemaVersion: CONTEXTUAL_EVIDENCE_POLICY_VERSION,
  familyOrder: EVIDENCE_FAMILY_ORDER,
  withinFamilyMagnitude: "maximum_distinct_rule_strength",
  rules: [
    "deduplicate evidence by canonical content excluding evidenceId",
    "same rule and normalized witnesses contribute once per family",
    "exact lexical, containment, and Micro Brain retrieval evidence remain one independent lexical contribution",
    "Micro Brain retrieval similarity is candidate recall provenance and never an independent confidence family",
    "repeated value witnesses do not create independent value families",
    "representative evidence never becomes full-file truth",
    "family magnitude is bounded to zero through one",
    "missing evidence is unavailable and not conflict",
    "absence of conflict is not support",
    "candidate order is inherited unchanged from Phase 3A",
  ],
};
const relation = (relationId: string, relationType: ContextRelationPolicyV1["relations"][number]["relationType"], explanationCode: string): ContextRelationPolicyV1["relations"][number] => ({
  relationId, relationType, directionality: "bidirectional", supportConflictEligibility: "support_only",
  requiredEvidence: ["both_columns_have_phase3a_candidates", "declared_atomic_relation", "source_local_physical_compatibility"],
  forbiddenInference: ["ordinary_cooccurrence", "domain_inference", "grain_inference", "relationship_inference", "candidate_selection"],
  explanationCode, provenanceLimitations: ["Source-local candidate evidence only.", "Relation support is not a final mapping."],
});
export const CONTEXT_RELATION_POLICY: ContextRelationPolicyV1 = {
  schemaVersion: "lightbi.context-relation-policy.v1",
  relations: [
    relation("generic.identifier-label.v1", "identifier_label", "identifier_has_corresponding_label_candidate"),
    relation("generic.quantity-uom.v1", "quantity_uom", "quantity_has_unit_of_measure_candidate"),
    relation("generic.amount-currency.v1", "amount_currency", "amount_has_currency_candidate"),
    relation("generic.status-timestamp.v1", "status_timestamp", "status_has_directly_corresponding_timestamp_candidate"),
    relation("generic.origin-destination.v1", "origin_destination", "origin_and_destination_candidates_coexist"),
  ],
};

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
export function deterministicPolicyHash(policy: AggregationPolicyV1 = CONTEXTUAL_EVIDENCE_POLICY): string {
  let hash = 0x811c9dc5;
  for (const char of canonicalJson(policy)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 0x01000193); }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function rotateRight(value: number, bits: number) { return (value >>> bits) | (value << (32 - bits)); }
export function deterministicPolicySha256(value: unknown = { aggregation: CONTEXTUAL_EVIDENCE_POLICY, relations: CONTEXT_RELATION_POLICY }): string {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const bitLength = bytes.length * 8, padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6); padded.set(bytes); padded[bytes.length] = 0x80;
  new DataView(padded.buffer).setUint32(padded.length - 4, bitLength, false);
  const h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const k = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  for(let offset=0;offset<padded.length;offset+=64){const w=new Uint32Array(64),view=new DataView(padded.buffer,offset,64);for(let i=0;i<16;i++)w[i]=view.getUint32(i*4,false);for(let i=16;i<64;i++){const s0=rotateRight(w[i-15],7)^rotateRight(w[i-15],18)^(w[i-15]>>>3),s1=rotateRight(w[i-2],17)^rotateRight(w[i-2],19)^(w[i-2]>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0}let [a,b,c,d,e,f,g,hh]=h;for(let i=0;i<64;i++){const s1=rotateRight(e,6)^rotateRight(e,11)^rotateRight(e,25),ch=(e&f)^(~e&g),t1=(hh+s1+ch+k[i]+w[i])>>>0,s0=rotateRight(a,2)^rotateRight(a,13)^rotateRight(a,22),maj=(a&b)^(a&c)^(b&c),t2=(s0+maj)>>>0;hh=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0}const values=[a,b,c,d,e,f,g,hh];for(let i=0;i<8;i++)h[i]=(h[i]+values[i])>>>0}
  return h.map((item)=>item.toString(16).padStart(8,"0")).join("");
}
