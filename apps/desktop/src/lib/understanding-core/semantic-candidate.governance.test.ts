import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type Mapping = { physicalColumn: string; canonicalSignal: string };
type Ambiguity = { physicalColumn: string; candidateSignals: string[] };
type Sample = {
  id: string;
  corpusVersion: string;
  sources: Array<{ path: string; sha256: string }>;
  recognition: {
    requiredMappings: Mapping[];
    expectedAmbiguousMappings: Ambiguity[];
    expectedUnknownBusinessColumns: string[];
  };
  verifiedMetricAnswers: Record<string, unknown>;
};

const REPO_ROOT = path.resolve(__dirname, "../../../../..");
const readJson = <T>(relativePath: string): T => JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8"),
) as T;
const manifest = readJson<{
  corpusVersion: string;
  groundTruthFiles: Array<{ path: string }>;
  verifiedMetricTruth: { digest: string };
  acceptanceTruthGovernance: {
    phase: string;
    freshHoldoutRequiredBeforeMvpProven: boolean;
    inspectedGroupsNoLongerPristine: string[];
  };
}>("sample-corpus/manifest.json");
const documents = manifest.groundTruthFiles.map((entry) => readJson<{
  samples: Sample[];
  aliasCollisionCases?: unknown[];
}>(entry.path));
const samples = documents.flatMap((document) => document.samples);
const byId = new Map(samples.map((sample) => [sample.id, sample]));
const pair = (sampleId: string, column: string, candidate: string) => {
  const sample = byId.get(sampleId);
  return {
    required: sample?.recognition.requiredMappings.some(
      (mapping) => mapping.physicalColumn === column && mapping.canonicalSignal === candidate,
    ) ?? false,
    ambiguous: sample?.recognition.expectedAmbiguousMappings.some(
      (mapping) => mapping.physicalColumn === column && mapping.candidateSignals.includes(candidate),
    ) ?? false,
    unknown: sample?.recognition.expectedUnknownBusinessColumns.includes(column) ?? false,
  };
};

describe("Phase 3A.2 acceptance truth governance", () => {
  it("governs corpus version and records contaminated evaluation groups", () => {
    expect(manifest.corpusVersion).toBe("1.2.0");
    expect(samples).toHaveLength(30);
    expect(samples.every((sample) => sample.corpusVersion === manifest.corpusVersion)).toBe(true);
    expect(manifest.acceptanceTruthGovernance).toMatchObject({
      phase: "3A.2",
      freshHoldoutRequiredBeforeMvpProven: true,
      inspectedGroupsNoLongerPristine: ["holdout", "adversarial", "multi_file"],
    });
  });

  it("removes broad status, customer, UOM, money, event, and opaque-header truth", () => {
    for (const sampleId of [
      "rev.sales_erp_may_2026",
      "rev.sales_erp_june_2026",
      "fin.sales_june_missing_cost",
      "multi.commerce_may_2026",
      "multi.commerce_june_2026",
      "multi.sales_period_pair",
    ]) {
      expect(pair(sampleId, "Status", "fulfillment_status").ambiguous, sampleId).toBe(false);
    }
    expect(pair("multi.logistics_period_pair", "DeliveryStatus", "fulfillment_status").ambiguous).toBe(false);
    expect(pair("rev.bhx_pos_export", "Khách hàng", "customer").required).toBe(true);
    expect(pair("rev.bhx_pos_export", "Khách hàng", "buyer").ambiguous).toBe(false);
    expect(pair("rev.bhx_pos_export", "Khách hàng", "account").ambiguous).toBe(false);
    expect(pair("inv.plu_product_master", "Đơn vị tính", "uom").required).toBe(true);
    expect(pair("inv.plu_product_master", "Đơn vị tính", "unit").ambiguous).toBe(false);
    expect(pair("adv.motodetail_dirty_export", "CHARGE", "fee").required).toBe(true);
    expect(pair("adv.motodetail_dirty_export", "CHARGE", "cost").ambiguous).toBe(false);
    expect(pair("adv.motodetail_dirty_export", "CHARGE", "revenue").ambiguous).toBe(false);
    expect(pair("adv.world_cup_events", "Event", "error_event").ambiguous).toBe(false);
    expect(pair("adv.world_cup_events", "Event", "audit_action").ambiguous).toBe(false);
    expect(pair("adv.world_cup_events", "Event", "status").unknown).toBe(true);
    expect(pair("adv.bank_marketing_generic_headers", "y", "conversion").ambiguous).toBe(false);
    expect(pair("adv.bank_marketing_generic_headers", "y", "conversion").unknown).toBe(true);
  });

  it("uses atomic candidate truth and leaves explicit taxonomy debt", () => {
    expect(pair("adv.bank_marketing_generic_headers", "campaign", "campaign").required).toBe(true);
    expect(pair("adv.bank_marketing_generic_headers", "campaign", "campaign_attempts").required).toBe(false);
    expect(pair("rev.bhx_pos_export", "Mã phiếu xuất", "receipt").required).toBe(false);
    expect(pair("rev.bhx_pos_export", "Mã phiếu xuất", "receipt").unknown).toBe(true);
    expect(pair("adv.motodetail_dirty_export", "MET.\nID", "row_type").required).toBe(true);
    expect(pair("adv.motodetail_dirty_export", "MET.\nID", "document_type").ambiguous).toBe(false);
    expect(pair("adv.world_bank_cross_domain", "Date", "time_period").required).toBe(true);
    expect(pair("adv.world_bank_cross_domain", "Date", "report_date").ambiguous).toBe(false);
    expect(pair("adv.world_bank_cross_domain", "Date", "effective_date").ambiguous).toBe(false);
  });

  it("keeps metrics, physical hashes, collision contracts, and production files frozen", () => {
    const phase5m4Correction = readJson<{
      corrections: { productionFiles: Record<string, { beforeSha256: string; afterSha256: string }> };
    }>("docs/architecture/phase-5m4-real-golden-blocker-audit.json");
    const metricTruth = samples
      .map((sample) => ({ id: sample.id, verifiedMetricAnswers: sample.verifiedMetricAnswers }))
      .sort((left, right) => left.id.localeCompare(right.id));
    expect(crypto.createHash("sha256").update(JSON.stringify(metricTruth)).digest("hex"))
      .toBe("27f1bc7122a58ad2179442c7319326e522c1e5422c69e659b17bd595fd661866");
    expect(manifest.verifiedMetricTruth.digest).toBe(
      "27f1bc7122a58ad2179442c7319326e522c1e5422c69e659b17bd595fd661866",
    );
    for (const sample of samples) {
      for (const source of sample.sources) {
        const digest = crypto.createHash("sha256")
          .update(fs.readFileSync(path.join(REPO_ROOT, source.path)))
          .digest("hex");
        expect(digest, `${sample.id}:${source.path}`).toBe(source.sha256);
      }
    }
    const collisionCases = documents.flatMap((document) => document.aliasCollisionCases ?? []);
    expect(collisionCases).toHaveLength(84);
    for (const [relativePath, correction] of Object.entries(phase5m4Correction.corrections.productionFiles)) {
      expect(correction.beforeSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(crypto.createHash("sha256").update(fs.readFileSync(path.join(REPO_ROOT, relativePath))).digest("hex"))
        .toBe(correction.afterSha256);
    }
  });

  it("keeps the machine audit complete and Phase 3A free of final mapping states", () => {
    const audit = readJson<{
      reviewedRecordCount: number;
      entries: Array<Record<string, unknown>>;
    }>("docs/architecture/phase-3a2-acceptance-truth-audit.json");
    expect(audit.reviewedRecordCount).toBe(46);
    expect(audit.entries).toHaveLength(46);
    for (const entry of audit.entries) {
      for (const field of [
        "sampleId", "corpusGroup", "physicalColumn", "physicalType", "representativeValues",
        "siblingHeaders", "candidate", "priorExpectationType", "registryMeaning", "semanticAssessment",
        "disposition", "reasonCode", "evidenceInspected", "corpusChanged", "taxonomyDebt",
        "phaseDeferredTo", "notes",
      ]) expect(entry).toHaveProperty(field);
    }
    const candidateContracts = fs.readFileSync(
      path.join(REPO_ROOT, "apps/desktop/src/lib/understanding-core/semantic-candidate-contracts.ts"),
      "utf8",
    );
    expect(candidateContracts).not.toMatch(/finalMapping|finalState|mappingState|candidateScore/);
  });
});
