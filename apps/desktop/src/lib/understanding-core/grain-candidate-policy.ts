import { deterministicPolicySha256 } from "./contextual-evidence-policy";
import { GRAIN_CANDIDATE_POLICY_VERSION,type GrainPolicyV1 } from "./grain-candidate-contracts";
export const GRAIN_CANDIDATE_POLICY:GrainPolicyV1={schemaVersion:GRAIN_CANDIDATE_POLICY_VERSION,maxCompositeWidth:3,maxEligibleKeyColumns:8,maxCompositeCombinations:92,minimumIdentityNonNullRatio:.95,minimumIdentityUniquenessRatio:.98,minimumPhysicalFormatStability:.8,rules:[
{ruleId:"G-IDENTITY-ELIGIBILITY",description:"Identity candidates require stable physical facts plus resolved, ambiguous, or explicitly unresolved physical identifier evidence; uniqueness alone is insufficient."},
{ruleId:"G-PHYSICAL-IDENTIFIER",description:"Structured string codes may remain unresolved physical identity hypotheses when full-file format, coverage, and uniqueness or governed repetition evidence is strong."},
{ruleId:"G-IDENTITY-NEGATIVE-GUARDS",description:"Technical indices, UUID traces, measures, timestamps, phones, formulas, free text, mixed values, and floating measurements cannot become identity from uniqueness alone."},
{ruleId:"G-COMPOSITE-BOUNDED",description:"Composite candidates use at most three pruned columns in stable source-column order."},
{ruleId:"G-PARENT-REPETITION",description:"Parent hypotheses require repeated parent values and a more granular identity candidate."},
{ruleId:"G-TEMPORAL-ALTERNATIVES",description:"Physical dates are retained as unresolved temporal bases; dates never prove a row unit alone."},
{ruleId:"G-MEASURE-SAFETY",description:"Numeric type alone is not additive; codes, rates, prices, ratings and uncertain semantics abstain."},
{ruleId:"G-REPEATED-MEASURE",description:"Measures constant within repeated parents create aggregation risk."},
{ruleId:"G-SEMANTIC-UNCERTAINTY",description:"Probable and ambiguous semantics remain limited evidence; unknown semantics never become semantic truth."},
{ruleId:"G-STRUCTURAL-SCOPE",description:"Source blockers, candidate limitations, evidence limitations, and harmless issues remain distinguishable."},
{ruleId:"G-CANDIDATES-ONLY",description:"Competing universal row-unit candidates remain present without selection or ranking."}],forbiddenInference:["final_grain","grain_ranking","aggregate_grain_confidence","cross_source_relationship","join_key","domain_activation","filename_rule","sample_rule","domain_specific_row_type"],extensionBoundary:{allowed:["declare_domain_roles","declare_row_unit_specializations","declare_relation_templates","declare_domain_constraints","declare_measure_semantics","supply_domain_corpus"],forbidden:["override_core_decision","set_confirmed_grain","inject_filename_or_sample_rules","weaken_abstention","change_global_policy","alter_other_domain_evidence"]}};
export const grainCandidatePolicyHash=(value:unknown=GRAIN_CANDIDATE_POLICY)=>deterministicPolicySha256(value);
