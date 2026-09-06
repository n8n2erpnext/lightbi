import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(process.cwd(), "../..");
const SCRIPT = path.join(ROOT, "scripts/micro-brain/compile-foundation-v1.mjs");
const INDEX = path.join(process.cwd(), "src/lib/understanding-core/micro-brain/compiled/foundation.index.v1.json");
const PRESENTATION_SCRIPT = path.join(ROOT, "scripts/micro-brain/compile-presentation-v1.mjs");
const PRESENTATION_INDEX = path.join(process.cwd(), "src/lib/understanding-core/micro-brain/compiled/presentation.index.v1.json");

function sha256(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function compile(): string {
  const result = spawnSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: "utf8", timeout: 30_000 });
  if (result.status !== 0) throw new Error(`compiler failed: ${result.stdout}\n${result.stderr}`);
  return sha256(INDEX);
}

function compilePresentation(): string {
  const result = spawnSync(process.execPath, [PRESENTATION_SCRIPT], { cwd: ROOT, encoding: "utf8", timeout: 30_000 });
  if (result.status !== 0) throw new Error(`presentation compiler failed: ${result.stdout}\n${result.stderr}`);
  return sha256(PRESENTATION_INDEX);
}

describe("Micro Brain compiler determinism", () => {
  it("rebuilds the same semantic byte identity from identical source", () => {
    const before = sha256(INDEX);
    const first = compile();
    const second = compile();
    expect(first).toBe(before);
    expect(second).toBe(first);
  }, 30_000);

  it("rebuilds the same presentation byte identity from identical source", () => {
    const before = sha256(PRESENTATION_INDEX);
    const first = compilePresentation();
    const second = compilePresentation();
    expect(first).toBe(before);
    expect(second).toBe(first);
  }, 30_000);
});