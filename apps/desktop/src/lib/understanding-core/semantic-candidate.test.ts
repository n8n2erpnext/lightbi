import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { profilePhysicalSource } from "./profiler";
import { generateSemanticCandidateArtifact } from "./semantic-candidate-engine";

const REPO_ROOT = path.resolve(__dirname, "../../../../..");
const collisionDocument = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, "sample-corpus/versions/1.4.0/ground-truth/adversarial-dirty.json"), "utf8"),
) as {
  aliasCollisionCases: Array<{
    id: string;
    inputHeader: string;
    candidateSignals: string[];
    contextualResolution: { requiredEvidence: string[] };
  }>;
};

function artifactFor(rows: unknown[][]) {
  return generateSemanticCandidateArtifact(profilePhysicalSource({
    schemaVersion: "lightbi.physical-source-input.v1",
    source: { sourceId: "candidate:test", kind: "local_file", label: "candidate-test.xlsx" },
    rawRows: rows,
  }));
}

describe("Phase 3A canonical semantic candidates and evidence", () => {
  it("distinguishes exact canonical, alias, value, type, and conflict evidence without final mapping", () => {
    const artifact = artifactFor([
      ["revenue", "Payment", "OrderID", "__PowerAppsId__", "unfamiliar business note"],
      [120, "Cash", "ORD-001", "technical-1", "call customer"],
      ["bad", "Card", "ORD-002", "technical-2", "follow up"],
    ]);
    const byColumn = new Map(artifact.observations.map((observation) => [observation.physicalColumn, observation]));

    const revenue = byColumn.get("revenue")?.candidateSet.candidates.find((candidate) => candidate.candidateId === "revenue");
    expect(revenue?.evidence.map((evidence) => evidence.type)).toContain("canonical_header_exact");
    expect(revenue?.conflictEvidence.map((evidence) => evidence.type)).toContain("mixed_type");

    const payment = byColumn.get("Payment")?.candidateSet.candidates.find((candidate) => candidate.candidateId === "payment_method");
    expect(payment?.evidence.map((evidence) => evidence.type)).toEqual(expect.arrayContaining(["header_alias_exact", "value_alias"]));

    expect(byColumn.get("unfamiliar business note")?.state).toBe("no_candidate");
    expect(byColumn.get("__PowerAppsId__")?.state).toBe("technical_candidate");
    expect(byColumn.get("__PowerAppsId__")?.columnEvidence.some((evidence) => evidence.type === "technical_column")).toBe(true);
    expect(JSON.stringify(artifact)).not.toMatch(/"(?:finalState|mappingState|confidence|candidateScore)"/);
  });

  it("is deterministic, source-stable, and covers each physical column exactly once", () => {
    const rows = [
      ["Status", "amount", "__EMPTY_3"],
      ["Open", 10, "x"],
      ["Closed", 20, "y"],
    ];
    const first = artifactFor(rows);
    const second = artifactFor(rows);

    expect(first).toEqual(second);
    expect(first.observations).toHaveLength(first.coverage.physicalColumnCount);
    expect(new Set(first.observations.map((observation) => observation.columnId)).size).toBe(first.observations.length);
    expect(first.coverage.observedColumnCount).toBe(first.coverage.physicalColumnCount);
    expect(first.observations.find((observation) => observation.physicalColumn === "__EMPTY_3")?.state).toBe("unsupported_input");
  });

  it("retains every registry candidate for all 84 header-only alias collisions", () => {
    expect(collisionDocument.aliasCollisionCases).toHaveLength(84);
    for (const collision of collisionDocument.aliasCollisionCases) {
      const artifact = artifactFor([[collision.inputHeader], ["header-only witness"]]);
      const observation = artifact.observations[0];
      const actual = observation.candidateSet.candidates.map((candidate) => candidate.candidateId);

      expect(actual, collision.id).toEqual(expect.arrayContaining(collision.candidateSignals));
      expect(observation.candidateSet.hasAliasCollision, collision.id).toBe(true);
      expect(observation.candidateSet.candidateOnly, collision.id).toBe(true);
      expect(observation.candidateSet.contextualResolution.executed, collision.id).toBe(false);
      expect(observation.candidateSet.contextualResolution.requiredEvidence.length, collision.id).toBeGreaterThan(0);
      expect(observation.candidateSet.candidates.every((candidate) =>
        candidate.evidence.some((evidence) => evidence.type === "alias_collision")), collision.id).toBe(true);
    }
  });

  it("preserves genuine type conflicts without rejecting numeric customer identifiers", () => {
    const artifact = artifactFor([
      ["revenue", "customer"],
      ["not numeric", 100],
      ["still text", 101],
    ]);
    const revenue = artifact.observations[0].candidateSet.candidates.find((candidate) => candidate.candidateId === "revenue");
    const customer = artifact.observations[1].candidateSet.candidates.find((candidate) => candidate.candidateId === "customer");

    expect(revenue).toBeDefined();
    expect(revenue?.conflictEvidence.some((evidence) => evidence.type === "physical_type_conflict")).toBe(true);
    expect(customer).toBeDefined();
    expect(customer?.conflictEvidence.some((evidence) => evidence.type === "physical_type_conflict")).toBe(false);
  });

  it("applies generic multilingual registry corrections without source-specific rules", () => {
    const artifact = artifactFor([
      ["Total Amount", "Nhóm sản phẩm", "DeliveredAt", "License Plate"],
      [125_000, "Fresh food", "2026-05-01 10:30", "50H-12345"],
    ]);
    const candidates = new Map(artifact.observations.map((observation) => [
      observation.physicalColumn,
      observation.candidateSet.candidates.map((candidate) => candidate.candidateId),
    ]));

    expect(candidates.get("Total Amount")).toContain("invoice_total");
    expect(candidates.get("Nhóm sản phẩm")).toContain("category");
    expect(candidates.get("DeliveredAt")).toContain("delivery_date");
    expect(candidates.get("License Plate")).toContain("vehicle");
  });

  it("requires every containment token and does not match on one common word", () => {
    const artifact = artifactFor([
      ["Tổng tiền"],
      [100_000],
    ]);
    const candidates = new Map(artifact.observations.map((observation) => [
      observation.physicalColumn,
      observation.candidateSet.candidates.map((candidate) => candidate.candidateId),
    ]));

    expect(candidates.get("Tổng tiền")).toContain("invoice_total");
    expect(candidates.get("Tổng tiền")).not.toEqual(expect.arrayContaining(["currency", "progress_pct", "withdrawal_amount"]));
  });

  it("contains no sample, file, sheet, or expected-answer keyed production rule", () => {
    const engineSource = fs.readFileSync(path.join(__dirname, "semantic-candidate-engine.ts"), "utf8");
    expect(engineSource).not.toMatch(/sample-corpus|\.xlsx|\.csv|sheet1|rev\.|inv\.|ops\.|adv\.|multi\./i);
  });
});
