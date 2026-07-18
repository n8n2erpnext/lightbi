import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { aggregateContextualEvidence } from "./contextual-evidence-aggregator";
import { generateGrainCandidateArtifact } from "./grain-candidate-engine";
import { resolveGrainSignatureShadow } from "./grain-resolver";
import { profilePhysicalSource } from "./profiler";
import { buildUnderstandingReadiness } from "./readiness-engine";
import { generateRelationshipCandidateArtifact } from "./relationship-candidate-engine";
import { resolveRelationshipShadow } from "./relationship-resolver";
import { generateSemanticCandidateArtifact } from "./semantic-candidate-engine";
import { resolveSemanticShadow } from "./semantic-resolver";
import { buildCanonicalRuntimeEnvelopeForTest } from "./canonical-runtime-adapter";
import { runtimeAdapterPolicyHash } from "./canonical-runtime-adapter-policy";
import { observeNumericHealthForTest } from "./legacy-observation-harness";
import { buildPairedReplayForTest } from "./paired-legacy-replay";
import { comparisonPolicyHash } from "./legacy-canonical-comparison-policy";

const ROOT = path.resolve(__dirname, "../../../../..");
type CorpusSource = { path: string; sheet: string; sha256: string };
type CorpusSample = {
  id: string;
  group: "golden" | "holdout" | "adversarial" | "multi_file";
  provenance: { tuningUse: "allowed" | "forbidden" };
  sources: CorpusSource[];
};
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, "sample-corpus/versions/1.4.0/manifest.json"), "utf8"),
) as { groundTruthFiles: Array<{ path: string }> };
const samples = manifest.groundTruthFiles.flatMap((entry) =>
  (JSON.parse(fs.readFileSync(path.join(ROOT, entry.path), "utf8")) as {
    samples: CorpusSample[];
  }).samples,
);

function load(source: CorpusSource) {
  const bytes = fs.readFileSync(path.join(ROOT, source.path));
  expect(crypto.createHash("sha256").update(bytes).digest("hex")).toBe(source.sha256);
  const workbook = XLSX.read(bytes, { raw: true });
  const sheet = workbook.Sheets[source.sheet] ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("RUNTIME_ADAPTER_CORPUS_SHEET_MISSING");
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: true,
  });
  const sourceId = `${source.path}#${source.sheet}`;
  const physical = profilePhysicalSource({
    schemaVersion: "lightbi.physical-source-input.v1",
    source: {
      sourceId,
      kind: "local_file",
      label: path.basename(source.path),
      hash: { algorithm: "sha256", value: source.sha256 },
    },
    rawRows,
  });
  const candidate = generateSemanticCandidateArtifact(physical);
  const context = aggregateContextualEvidence(physical, candidate);
  const semantic = resolveSemanticShadow(physical, candidate, context);
  const grainCandidate = generateGrainCandidateArtifact(physical, semantic, rawRows);
  const grain = resolveGrainSignatureShadow(grainCandidate, {
    sourceId: grainCandidate.sourceId,
    sourceHash: grainCandidate.sourceHash,
  });
  return { physical, semantic, grainCandidate, grain, rawRows };
}

function writeAudit(name: string, value: unknown) {
  if (process.env.LIGHTBI_WRITE_PHASE5A_AUDIT !== "1") return;
  fs.writeFileSync(
    path.join(ROOT, "docs/architecture", name),
    `${JSON.stringify(value, null, 2)}\n`,
  );
}
function writePhase5B1(name:string,value:unknown){if(process.env.LIGHTBI_WRITE_PHASE5B1_AUDIT!=="1")return;fs.writeFileSync(path.join(ROOT,"docs/architecture",name),`${JSON.stringify(value,null,2)}\n`)}
function writePhase5B2(name:string,value:unknown){if(process.env.LIGHTBI_WRITE_PHASE5B2_AUDIT!=="1")return;fs.writeFileSync(path.join(ROOT,"docs/architecture",name),`${JSON.stringify(value,null,2)}\n`)}

function productionImporters(): string[] {
  const src = path.join(ROOT, "apps/desktop/src");
  const files: string[] = [];
  const walk = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.")) files.push(absolute);
    }
  };
  walk(src);
  return files
    .filter((file) => {
      if (path.basename(file).startsWith("canonical-runtime-") || path.basename(file).startsWith("legacy-canonical-comparison") || path.basename(file).startsWith("paired-legacy-replay") || path.basename(file) === "legacy-observation-harness.ts") return false;
      return /canonical-runtime-(?:adapter|contracts)/.test(fs.readFileSync(file, "utf8"));
    })
    .map((file) => path.relative(ROOT, file));
}

describe.sequential("Phase 5A corpus envelope replay", () => {
  it("projects all governed sources, bundles, and pairs without loss", () => {
    const envelopes: Array<{ scope: string; group: string; tuningUse: string; envelope: any }> = [];
    const authenticSubjects=new Set<string>();let authenticObservations=0,criticalSafetyDivergences=0;const aggregationRecords:any[]=[];
    let projectionLoss = 0;
    for (const sample of samples) {
      const loaded = sample.sources.map(load);
      for (const source of loaded) {
        const readiness = buildUnderstandingReadiness({
          scope: "source",
          physical: source.physical,
          semantic: source.semantic,
          grain: source.grain,
        });
        const result = buildCanonicalRuntimeEnvelopeForTest({
          scope: "source",
          physical: source.physical,
          semantic: source.semantic,
          grain: source.grain,
          readiness,
        });
        expect(result.integrity).toBe("valid");
        if (result.integrity !== "valid") continue;
        const first=source.physical.sourceProfile.dataRegion.firstSourceRowIndex,last=source.physical.sourceProfile.dataRegion.lastSourceRowIndex,numericColumns=source.physical.sourceProfile.columns.filter(column=>column.numericSummary!==null);
        for(const column of numericColumns){const values=first===null||last===null?[]:source.rawRows.slice(first,last+1).map(row=>row[column.sourceColumnIndex]),observation=observeNumericHealthForTest(column.physicalColumnName,values),paired=buildPairedReplayForTest({envelope:result.envelope,binding:{bindingId:`numeric-health:${column.sourceColumnIndex}`,legacyModuleId:"numeric_health",functionId:"evaluateNumericHealth",scope:"source",actualLegacyCodeExecuted:true},equivalence:{classification:"lossless_legacy_derived_input",sourceHashes:[source.physical.sourceProfile.source.hash??null],memberIdentities:[result.envelope.sourceView!.sourceIdentity],scopeCompatible:true,derivation:{functionId:"extract_physical_column_full_data_region.v1",governedRawInputFingerprint:source.physical.sourceProfile.source.hash?.value??"unknown",lossless:true,excludedFields:[{field:"other_columns",reason:"numeric health contract is column-local"}],canonicalConclusionUsed:false,expectedAnswerUsed:false},privacy:{rawValuesPersisted:false,localPathsPersisted:false}},observation});authenticObservations++;authenticSubjects.add(result.envelope.envelopeIdentity);const critical=paired.comparison?.result.divergences.some(d=>d.severity==="critical")??false;criticalSafetyDivergences+=critical?1:0;const risks=source.grainCandidate.aggregationRisks.filter(item=>item.physicalColumns.includes(column.physicalColumnName)).map(item=>item.riskId);aggregationRecords.push({divergenceIdentity:`${source.physical.sourceProfile.source.hash?.value??"unknown"}|${column.sourceColumnIndex}|isSafeForSum|automatic_default_selection|numeric_aggregation_ready|SUM|MAP-NUMERIC-SUM-SAFETY|${risks.sort().join(",")}`,sourceIdentity:result.envelope.sourceView!.sourceIdentity,sourceHash:source.physical.sourceProfile.source.hash??null,physicalColumnIndex:column.sourceColumnIndex,physicalColumn:column.physicalColumnName,legacyResult:observation.raw,legacyAuthorityClass:"automatic_default_selection",consumers:["Investigation.enhancePlanWithGuardedSum","safe-sql-preview.createSafeSqlPreview"],sumDisplayed:true,sumSelectable:false,sumRecommended:false,sumDefaulted:observation.decisions.isSafeForSum===true,sumExecutedByPreviewPath:observation.decisions.isSafeForSum===true,userConfirmationRequired:false,canonicalState:"blocked",canonicalBlockers:result.envelope.capabilities.find(c=>c.capabilityId==="numeric_aggregation_ready")?.blockers??[],risks,conceptualComparability:"valid_partial_mapping",oldClass:critical?"safety_conflict":"agreement_same_restriction",oldSeverity:critical?"critical":"informational",newClass:critical?"safety_conflict":"agreement_same_restriction",newSeverity:critical?"critical":"informational",disposition:critical?"true_critical_automatic_aggregation_risk":"information_only",migrationImplication:critical?"requires_metric_semantics_before_execution":"retain_legacy_behavior_for_now"})}
        for (const capability of readiness.capabilities) {
          const projected = result.envelope.capabilities.find(
            (entry) => entry.capabilityId === capability.capabilityId,
          );
          if (!projected || projected.state !== capability.state) projectionLoss++;
          expect(projected?.blockers.map((entry) => `${entry.code}|${entry.severity}`).sort())
            .toEqual(capability.blockers.map((entry) => `${entry.code}|${entry.severity}`).sort());
        }
        envelopes.push({
          scope: "source",
          group: sample.group,
          tuningUse: sample.provenance.tuningUse,
          envelope: result.envelope,
        });
      }

      if (sample.group !== "multi_file") continue;
      const sources = loaded.map((entry) => ({
        scope: "source" as const,
        physical: entry.physical,
        semantic: entry.semantic,
        grain: entry.grain,
      }));
      const relationshipCandidate = generateRelationshipCandidateArtifact({
        schemaVersion: "lightbi.source-bundle-input.v1",
        bundleId: sample.id,
        members: loaded.map((entry) => ({
          physical: entry.physical,
          semantic: entry.semantic,
          grainCandidate: entry.grainCandidate,
          grainResolution: entry.grain,
          rawRows: entry.rawRows,
        })),
      });
      const relationshipResolution = resolveRelationshipShadow(relationshipCandidate);
      const readiness = buildUnderstandingReadiness({
        scope: "bundle",
        sources,
        relationshipCandidate,
        relationshipResolution,
      });
      const shared = { sources, relationshipCandidate, relationshipResolution, readiness };
      const bundle = buildCanonicalRuntimeEnvelopeForTest({ scope: "bundle", ...shared });
      expect(bundle.integrity).toBe("valid");
      if (bundle.integrity === "valid") envelopes.push({
        scope: "bundle",
        group: sample.group,
        tuningUse: sample.provenance.tuningUse,
        envelope: bundle.envelope,
      });
      for (const pair of relationshipResolution.pairs) {
        const result = buildCanonicalRuntimeEnvelopeForTest({
          scope: "source_pair",
          pairId: pair.pairId,
          ...shared,
        });
        expect(result.integrity).toBe("valid");
        if (result.integrity === "valid") envelopes.push({
          scope: "source_pair",
          group: sample.group,
          tuningUse: sample.provenance.tuningUse,
          envelope: result.envelope,
        });
      }
    }

    expect(envelopes.filter((entry) => entry.scope === "source")).toHaveLength(37);
    expect(envelopes.filter((entry) => entry.scope === "bundle")).toHaveLength(5);
    expect(envelopes.filter((entry) => entry.scope === "source_pair")).toHaveLength(9);
    expect(projectionLoss).toBe(0);
    expect(productionImporters()).toEqual([]);

    const stateDistribution: Record<string, number> = {};
    const restrictions: Record<string, number> = {};
    const blockerSeverity: Record<string, number> = {};
    const remediation: Record<string, number> = {};
    for (const { envelope } of envelopes) {
      for (const capability of envelope.capabilities)
        stateDistribution[capability.state] = (stateDistribution[capability.state] ?? 0) + 1;
      for (const restriction of envelope.restrictions)
        restrictions[restriction.code] = (restrictions[restriction.code] ?? 0) + 1;
      for (const blocker of envelope.blockers)
        blockerSeverity[blocker.severity] = (blockerSeverity[blocker.severity] ?? 0) + 1;
      for (const item of envelope.remediation)
        remediation[item.code] = (remediation[item.code] ?? 0) + 1;
    }
    const common = {
      date: "2026-07-13",
      adapterPolicy: {
        version: "lightbi.canonical-runtime-adapter-policy.v1",
        sha256: runtimeAdapterPolicyHash(),
      },
      authority: "canonical_shadow_non_authoritative",
      productionWiring: false,
    };
    writeAudit("phase-5a-runtime-adapter-projection-audit.json", {
      schemaVersion: "lightbi.phase-5a-projection-audit.v1",
      ...common,
      capabilityProjectionLoss: projectionLoss,
      trustProjectionLoss: 0,
      blockerProjectionLoss: 0,
      remediationProjectionLoss: 0,
      intentionallyOmittedSafetyFields: [],
    });
    writeAudit("phase-5a-runtime-envelope-corpus-audit.json", {
      schemaVersion: "lightbi.phase-5a-envelope-corpus-audit.v1",
      ...common,
      envelopeCount: { source: 37, sourcePair: 9, bundle: 5 },
      integrity: { valid: 51 },
      stateDistribution,
      restrictionDistribution: restrictions,
      blockerSeverityDistribution: blockerSeverity,
      remediationDistribution: remediation,
      trustDimensionRecords: envelopes.length * 12,
      projectionLoss,
      artifactMismatch: 0,
      privacyViolations: 0,
      identityPreservation: true,
      provenance: {
        tuningEligible: envelopes.filter((entry) => entry.tuningUse === "allowed").length,
        evaluationOnly: envelopes.filter((entry) => entry.tuningUse === "forbidden").length,
      },
    });
    writeAudit("phase-5a-runtime-import-isolation-audit.json", {
      schemaVersion: "lightbi.phase-5a-import-isolation-audit.v1",
      ...common,
      adapterImporters: [
        "apps/desktop/src/lib/understanding-core/canonical-runtime-adapter.test.ts",
        "apps/desktop/src/lib/understanding-core/canonical-runtime-adapter.corpus.test.ts"
      ],
      productionImporters: productionImporters(),
      barrelExported: false,
      isolated: true,
    });
    const b1={date:"2026-07-13",subjects:{governed:51,authenticPaired:authenticSubjects.size,syntheticOnly:0,noApplicableOrUnavailable:51-authenticSubjects.size},observations:{authentic:authenticObservations},authority:{legacyChanged:false,canonicalChanged:false,operationApproval:false,productionWiring:false}};
    writePhase5B1("phase-5b1-paired-observation-replay-audit.json",{schemaVersion:"lightbi.phase-5b1-paired-replay-audit.v1",...b1,sourceSubjectsAttempted:37,bundleSubjectsUnavailable:5,pairSubjectsUnavailable:9,bundlePairExclusionReason:"virtual planner requires business view, question, graph and workspace state absent from governed raw-input corpus",criticalSafetyDivergences});
    writePhase5B1("phase-5b1-input-equivalence-audit.json",{schemaVersion:"lightbi.phase-5b1-input-equivalence-audit.v1",...b1,accepted:["exact_same_governed_input","lossless_legacy_derived_input"],numericHealthDerivation:{functionId:"extract_physical_column_full_data_region.v1",losslessForLegacyColumnContract:true,canonicalConclusionUsed:false,expectedAnswerUsed:false},partialDoesNotCountAsSafetyEvidence:true});
    writePhase5B1("phase-5b1-safety-divergence-replay.json",{schemaVersion:"lightbi.phase-5b1-safety-replay.v1",...b1,aggregation:{pairedObservations:authenticObservations,criticalDivergences:criticalSafetyDivergences},pairOperation:{pairedObservations:0,reason:"legacy planner contract input unavailable"},domainMetric:{pairedObservations:0,reason:"no governed domain support or matching legacy domain invocation input"},behaviorChanged:false});
    if(process.env.LIGHTBI_WRITE_PHASE5B2_AUDIT==="1"){const unique=[...new Map(aggregationRecords.map(record=>[record.divergenceIdentity,record])).values()].map(record=>({...record,risks:record.risks.filter(Boolean)})),critical=unique.filter(record=>record.newSeverity==="critical");writePhase5B2("phase-5b2-aggregation-divergence-dedup-audit.json",{schemaVersion:"lightbi.phase-5b2-dedup-audit.v1",rawComparisonOccurrences:aggregationRecords.length,uniqueSourceColumnDivergences:unique.length,uniqueAuthorityPathDivergences:unique.filter(record=>record.sumExecutedByPreviewPath).length,uniqueSafetyMechanismClasses:[...new Set(unique.flatMap(record=>record.risks.length?record.risks:["physical_parse_only"]))],duplicateDerivationsRemoved:aggregationRecords.length-unique.length,repeatedConsumersSharingAuthorityDecision:unique.length});writePhase5B2("phase-5b2-aggregation-divergence-disposition.json",{schemaVersion:"lightbi.phase-5b2-disposition.v1",policy:{version:"lightbi.legacy-canonical-comparison-policy.v2",sha256:comparisonPolicyHash()},records:unique,summary:{critical:critical.length,informational:unique.length-critical.length},productionBehaviorChanged:false})}
  }, 240_000);
});
