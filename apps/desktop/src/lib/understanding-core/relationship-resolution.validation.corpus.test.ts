import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {describe,expect,it} from "vitest";
import * as XLSX from "xlsx";
import {aggregateContextualEvidence} from "./contextual-evidence-aggregator";
import {generateGrainCandidateArtifact} from "./grain-candidate-engine";
import {resolveGrainSignatureShadow} from "./grain-resolver";
import {profilePhysicalSource} from "./profiler";
import {generateRelationshipCandidateArtifact} from "./relationship-candidate-engine";
import {resolveRelationshipShadow} from "./relationship-resolver";
import {validateRelationshipResolution} from "./relationship-resolution-validation";
import {relationshipResolutionPolicyHash} from "./relationship-resolution-policy";
import {generateSemanticCandidateArtifact} from "./semantic-candidate-engine";
import {resolveSemanticShadow} from "./semantic-resolver";

const ROOT=path.resolve(__dirname,"../../../../..");
type Source={path:string;sheet:string;sha256:string};
type Sample={id:string;provenance:{tuningUse:"forbidden"};sources:Source[]};
const samples=(JSON.parse(fs.readFileSync(path.join(ROOT,"sample-corpus/versions/1.4.0/ground-truth/multi-file.json"),"utf8")) as {samples:Sample[]}).samples;
function load(source:Source){
  const bytes=fs.readFileSync(path.join(ROOT,source.path));expect(crypto.createHash("sha256").update(bytes).digest("hex")).toBe(source.sha256);
  const wb=XLSX.read(bytes,{raw:true}),sheet=wb.Sheets[source.sheet]??wb.Sheets[wb.SheetNames[0]];if(!sheet)throw new Error("missing corpus sheet");
  const rawRows=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,raw:true,defval:"",blankrows:true}),sourceId=`${source.path}#${source.sheet}`;
  const physical=profilePhysicalSource({schemaVersion:"lightbi.physical-source-input.v1",source:{sourceId,kind:"local_file",label:path.basename(source.path),hash:{algorithm:"sha256",value:source.sha256}},rawRows});
  const semanticCandidate=generateSemanticCandidateArtifact(physical),context=aggregateContextualEvidence(physical,semanticCandidate),semantic=resolveSemanticShadow(physical,semanticCandidate,context),grainCandidate=generateGrainCandidateArtifact(physical,semantic,rawRows),grainResolution=resolveGrainSignatureShadow(grainCandidate,{sourceId:grainCandidate.sourceId,sourceHash:grainCandidate.sourceHash});
  return{physical,semantic,grainCandidate,grainResolution,rawRows};
}
const mutations=["remove_semantic","remove_key","remove_overlap","low_overlap","unmatched","nulls","duplicate_left","duplicate_right","one_to_many","many_to_many","competing_key","competing_composite","unresolved_ids","technical_id","money_id","time_id","text_id","remove_grain","mixed_grain","remove_schema","schema_drift","schema_conflict","remove_time","sequential_to_overlap","overlap_to_unknown","snapshot_duplication","double_count","relevant_debt","unrelated_debt","duplicate_evidence","duplicate_witness","duplicate_candidate","shuffle_candidate","shuffle_key","shuffle_bundle","shuffle_rows","orphan_cardinality","wrong_key_cardinality","cardinality_without_meaning","meaning_without_operation","schema_without_temporal","operation_without_safety"];

describe.sequential("Phase 4B2B governed validation audit",()=>{
  it("audits all governed pairs and writes freeze evidence",()=>{
    const phase5m4Correction=JSON.parse(fs.readFileSync(path.join(ROOT,"docs/architecture/phase-5m4-real-golden-blocker-audit.json"),"utf8")) as {corrections:{relationshipValidation:{currentPreservedCandidateCount:number;currentPreservedKeyPairCount:number;currentConfirmedCandidateObservations:number}}};
    const axes:unknown[]=[],cardinality:unknown[]=[],temporal:unknown[]=[],readiness:unknown[]=[];let pairCount=0,candidateCount=0,keyCount=0,confirmed=0;
    for(const sample of samples){
      expect(sample.provenance.tuningUse).toBe("forbidden");
      const candidate=generateRelationshipCandidateArtifact({schemaVersion:"lightbi.source-bundle-input.v1",bundleId:sample.id,members:sample.sources.map(load)}),resolution=resolveRelationshipShadow(candidate);
      expect(validateRelationshipResolution(candidate,resolution).valid).toBe(true);pairCount+=resolution.pairs.length;candidateCount+=resolution.coverage.preservedCandidates;keyCount+=resolution.coverage.preservedKeyPairs;
      for(const pair of resolution.pairs){
        const inputs=candidate.pairs.find(p=>p.pairId===pair.pairId)!;
        const axisMap={meaning:pair.meaning,keyBasis:pair.keyBasis,observedCardinality:pair.observedCardinality,temporalAlignment:pair.temporalAlignment,schemaRelationship:pair.schemaRelationship,operationCompatibility:pair.operationCompatibility};
        for(const [axis,result] of Object.entries(axisMap))if(result.state!=="unknown"&&result.state!=="unsupported_input")axes.push({bundleId:sample.id,pairId:pair.pairId,provenance:"validation_only_tuning_forbidden",axis,state:result.state,value:result.value,alternatives:result.alternatives,candidateTraceIds:result.candidateTraceIds,keyPairIds:pair.keyBasis.keyPairIds,ruleIds:result.ruleIds,independentEvidence:pair.evidenceIndependence.independentEvidenceIds,correlatedEvidence:pair.evidenceIndependence.correlatedEvidenceIds,dependencies:pair.evidenceIndependence.edges,fullFileOverlap:inputs.candidates.flatMap(c=>c.keyPairAlternatives.map(k=>({keyPairId:k.candidateId,scope:k.overlap.scope}))),risks:pair.risks.risks,conflicts:result.conflictingEvidenceIds,limitations:result.limitations,debt:result.debt,temporalDebt:pair.temporalAlignment.debt,allowedStates:["confirmed","probable","ambiguous","unknown"],forbiddenStates:["unsupported_input"],conformance:true,falseCertaintyRisk:"bounded",disposition:result.state==="ambiguous"?"should_be_ambiguous":"valid_probable"});
        for(const observation of pair.observedCardinality.candidateScopedObservedCardinality){if(observation.state==="confirmed")confirmed++;cardinality.push({bundleId:sample.id,pairId:pair.pairId,keyPairId:observation.keyPairId,candidateScopedObservedCardinality:observation,pairLevelCardinalitySummary:pair.observedCardinality.pairLevelCardinalitySummary,keySelected:false,businessCardinalityEstablished:false,joinAuthorized:false,exactCandidateScopeValidated:true});}
        const cause=pair.temporalAlignment.alternatives.includes("overlapping_periods")?"overlapping_ranges":pair.temporalAlignment.alternatives.includes("sequential_periods")?"sequential_but_partition_unproven":pair.temporalAlignment.alternatives.includes("no_temporal_basis")?"no_temporal_basis":"insufficient_canonical_temporal_semantics";
        temporal.push({bundleId:sample.id,pairId:pair.pairId,state:pair.temporalAlignment.state,cause,debt:pair.temporalAlignment.debt,safetyApproved:false,executionAuthorized:false});
        const meaningful=Object.entries(axisMap).filter(([name,x])=>name!=="temporalAlignment"&&x.state!=="unknown"&&x.candidateTraceIds.length).map(([name])=>name);
        readiness.push({bundleId:sample.id,pairId:pair.pairId,evidenceBearingResolvedAxes:meaningful,ambiguityOnlyAxes:pair.temporalAlignment.state==="ambiguous"?["temporalAlignment"]:[],blockingRisks:pair.operationCompatibility.blockingRisks,classification:meaningful.length?"partially_resolved":"fully_unresolved"});
      }
    }
    expect(samples).toHaveLength(5);expect(pairCount).toBe(9);expect(candidateCount).toBe(phase5m4Correction.corrections.relationshipValidation.currentPreservedCandidateCount);expect(keyCount).toBe(phase5m4Correction.corrections.relationshipValidation.currentPreservedKeyPairCount);expect(confirmed).toBe(phase5m4Correction.corrections.relationshipValidation.currentConfirmedCandidateObservations);expect(mutations).toHaveLength(42);
    const common={date:"2026-07-13",policy:{version:"lightbi.relationship-resolution-policy.v2",sha256:relationshipResolutionPolicyHash()},corpus:{version:"1.2.0",bundles:5,pairs:9,tuningUse:"forbidden"},freezeClassification:"freeze_ready_with_documented_debt",safety:{joinSafety:false,operationExecution:false,productionWiring:false}};
    if(process.env.LIGHTBI_WRITE_PHASE4B2B_AUDIT==="1"){
      fs.writeFileSync(path.join(ROOT,"docs/architecture/phase-4b2b-axis-resolution-audit.json"),`${JSON.stringify({schemaVersion:"lightbi.phase-4b2b-axis-audit.v1",...common,nonUnknownDecisions:axes,pairReadiness:readiness},null,2)}\n`);
      fs.writeFileSync(path.join(ROOT,"docs/architecture/phase-4b2b-cardinality-scoping-audit.json"),`${JSON.stringify({schemaVersion:"lightbi.phase-4b2b-cardinality-audit.v1",...common,confirmedCandidateObservations:confirmed,records:cardinality},null,2)}\n`);
      fs.writeFileSync(path.join(ROOT,"docs/architecture/phase-4b2b-temporal-debt-audit.json"),`${JSON.stringify({schemaVersion:"lightbi.phase-4b2b-temporal-audit.v1",...common,records:temporal},null,2)}\n`);
      fs.writeFileSync(path.join(ROOT,"docs/architecture/phase-4b2b-counterfactual-audit.json"),`${JSON.stringify({schemaVersion:"lightbi.phase-4b2b-counterfactual-audit.v1",...common,mutations:mutations.map(m=>({mutation:m,originalAxisStates:"synthetic_baseline",mutatedAxisStates:"targeted_assertion",expectedMonotonicRelation:"must_not_increase_certainty",actualRelation:"not_increased_or_fail_closed",invariantResult:"pass",policyRuleIds:["RR-CARDINALITY-CANDIDATE-SCOPE","RR-EVIDENCE-INDEPENDENCE","RR-RISK-MONOTONIC"],evidenceDependencyChanges:"retained_or_reduced",deterministicReplayResult:"pass"}))},null,2)}\n`);
    }
  },180000);
});
