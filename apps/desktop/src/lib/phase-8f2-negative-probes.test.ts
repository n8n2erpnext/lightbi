import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { browserSha256 } from "./browser-sha256";
import { dedupeCanonicalRemediations } from "./canonical-remediation-dedup";
import {
  projectGovernedBundleCandidates,
  type CanonicalSourceCandidateProjectionV1,
} from "./canonical-source-candidate-projection";
import type { CanonicalRemediationOperationV1 } from "./understanding-core/canonical-consumer-presentation-contract";

const ROOT = path.resolve(__dirname, "..");
const read = (relative: string) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const home = read("pages/Home.tsx");
const multiSourceReview = read("components/analysis/CanonicalMultiSourceReview.tsx");
const understandingCard = read("components/analysis/UnderstandingNextCard.tsx");
const evidenceReview = read("components/analysis/CanonicalEvidenceReview.tsx");
const persistence = read("hooks/useHomeWorkspaceSessions.ts");
const materializer = read("lib/full-file-runtime-materializer.ts");
const executor = read("lib/local-duckdb-executor.ts");
const candidateProjection = read("lib/canonical-source-candidate-projection.ts");

function candidate(id: string, role: "sales" | "accounting" | "logistics", month: string): CanonicalSourceCandidateProjectionV1 {
  const base = { sourceId: id, sourceFingerprint: `${id}-fingerprint`, sourceArtifactId: `${id}-artifact` };
  return {
    schemaVersion: "lightbi.canonical-source-candidate-projection.v1",
    ...base,
    roleCandidates: [{ candidateId: `${id}:role`, value: role, ...base, scope: { level: "source_file", physicalColumn: null }, supportingEvidence: ["canonical"], contradictingEvidence: [], confidence: 0.9, provenance: "inferred_candidate" }],
    documentIdentityCandidates: [],
    reportingPeriodCandidates: [{ candidateId: `${id}:period`, value: { start: `${month}-01`, end: `${month}-28`, physicalColumn: "Date" }, ...base, scope: { level: "physical_column", physicalColumn: "Date" }, supportingEvidence: ["full_file_range"], contradictingEvidence: [], confidence: 0.9, provenance: "inferred_candidate" }],
    monetaryColumnCandidates: [],
    observedCurrencyCandidates: [],
  };
}

const sixSources = [
  { key: "sales-may", candidates: candidate("sales-may", "sales", "2026-05") },
  { key: "sales-june", candidates: candidate("sales-june", "sales", "2026-06") },
  { key: "accounting-may", candidates: candidate("accounting-may", "accounting", "2026-05") },
  { key: "accounting-june", candidates: candidate("accounting-june", "accounting", "2026-06") },
  { key: "logistics-may", candidates: candidate("logistics-may", "logistics", "2026-05") },
  { key: "logistics-june", candidates: candidate("logistics-june", "logistics", "2026-06") },
];

function remediation(sourceId: string, operationId: string): CanonicalRemediationOperationV1 {
  return {
    operationId,
    kind: "open_currency_declaration",
    label: "Provide reporting currency",
    sourceId,
    sheetOrTable: "Data",
    physicalColumn: null,
    canonicalSignal: null,
    remediationCode: "confirm_currency",
  };
}

describe("Phase 8F.2 negative probes", () => {
  it("01 rejects direct digest calls outside the centralized provider", () => {
    expect(materializer).not.toMatch(/\b(?:crypto\.subtle|subtle\.digest)\b/);
    expect(materializer).toContain("browserSha256");
  });

  it("02 survives an exposed digest capability throwing on remote HTTP", async () => {
    const throwing = { digest: async () => { throw new TypeError("digest unavailable"); } } as unknown as SubtleCrypto;
    await expect(browserSha256(new TextEncoder().encode("remote").buffer, throwing))
      .resolves.toMatch(/^[a-f0-9]{64}$/);
  });

  it("03 does not treat a currency placeholder as source evidence", () => {
    expect(home).toMatch(/currency:\s*''/);
    expect(multiSourceReview).toContain("Currency: Missing");
    expect(multiSourceReview).not.toMatch(/value=\{?["']VND["']\}?/);
  });

  it("04 keeps suggested roles separate from user confirmation", () => {
    expect(multiSourceReview).toContain("Suggested by LightBI");
    expect(multiSourceReview).toContain("Confirmed by user");
    expect(home).toMatch(/role:\s*''/);
  });

  it("05 does not use filenames to determine source role", () => {
    expect(candidateProjection).not.toMatch(/fileName|filename|sourceLabel/);
  });

  it("06 does not use filenames to determine reporting period", () => {
    expect(candidateProjection).toContain("dateTimeSummary");
    expect(candidateProjection).not.toMatch(/May|June|Jan|Feb|Mar|Apr|Jul|Aug|Sep|Oct|Nov|Dec/);
  });

  it("07 never selects all imported sources by default", () => {
    expect(home).toMatch(/selected:\s*false/);
    expect(projectGovernedBundleCandidates(sixSources).some((bundle) => bundle.sourceKeys.length === 6)).toBe(false);
  });

  it("08 refuses cross-period sales and accounting pairing", () => {
    const grossProfit = projectGovernedBundleCandidates(sixSources).filter((bundle) => bundle.kind === "gross_profit_period");
    expect(grossProfit.map((bundle) => bundle.sourceKeys)).toEqual([
      ["sales-may", "accounting-may"],
      ["sales-june", "accounting-june"],
    ]);
  });

  it("09 excludes logistics from gross-profit execution candidates", () => {
    const grossProfit = projectGovernedBundleCandidates(sixSources).filter((bundle) => bundle.kind === "gross_profit_period");
    expect(grossProfit.every((bundle) => bundle.sourceKeys.every((key) => !key.startsWith("logistics")))).toBe(true);
  });

  it("10 keeps currency confirmation source-bound", () => {
    expect(multiSourceReview).toMatch(/onChange\(source\.key,\s*\{\s*\.\.\.value,\s*currency:/);
    expect(multiSourceReview).not.toMatch(/sources\.map[\s\S]{0,120}currency:\s*currencyCandidate/);
  });

  it("11 keeps period confirmation source-bound", () => {
    expect(multiSourceReview).toMatch(/onChange\(source\.key,\s*\{\s*\.\.\.value,\s*periodStart:/);
  });

  it("12 deduplicates the same remediation operation and scope", () => {
    expect(dedupeCanonicalRemediations([remediation("a", "one"), remediation("a", "two")])).toHaveLength(1);
  });

  it("13 preserves distinct remediation source scopes", () => {
    expect(dedupeCanonicalRemediations([remediation("a", "one"), remediation("b", "two")])).toHaveLength(2);
  });

  it("14 keeps candidate evidence non-authoritative", () => {
    expect(candidateProjection).toContain('provenance: "inferred_candidate"');
    expect(projectGovernedBundleCandidates(sixSources).filter((bundle) => bundle.kind !== "revenue_period_comparison").every((bundle) => bundle.state === "needs_confirmation")).toBe(true);
  });

  it("15 never marks a projected bundle ready without M3", () => {
    expect(candidateProjection).not.toMatch(/state:\s*"ready"/);
    expect(candidateProjection).toContain('"unsupported_current_mvp"');
  });

  it("16 keeps Delivery materialization on browser-safe hashing", () => {
    expect(materializer).toContain("await browserSha256");
  });

  it("17 restores sessions as stale without complete source handles", () => {
    expect(persistence).toMatch(/status:\s*'stale'.*runtimeDatasetSource:\s*undefined/s);
  });

  it("18 has no representative-row fallback after runtime materialization failure", () => {
    expect(executor).not.toMatch(/materializeRuntimeDatasetSource[\s\S]{0,500}catch[\s\S]{0,500}input\.rows/);
  });

  it("19 keeps raw source hashes out of the primary analysis card", () => {
    expect(understandingCard).not.toMatch(/scope === 'physical_column' \? item\.physicalColumns\.join\(', '\) : item\.sourceId/);
    expect(evidenceReview).toContain("<summary className=\"cursor-pointer font-medium text-gray-600\">Developer diagnostics</summary>");
  });

  it("20 retains exact governed metric oracle coverage", () => {
    const revenueTest = read("lib/understanding-core/phase-5m4-real-golden.test.ts");
    const grossProfitTest = read("lib/understanding-core/phase-8d1-production-multisource.test.ts");
    expect(revenueTest).toContain("22973896244");
    expect(grossProfitTest).toContain("3_075_721_244");
  });
});
