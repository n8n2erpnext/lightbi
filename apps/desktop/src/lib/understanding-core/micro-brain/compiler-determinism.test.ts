import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(process.cwd(), "../..");
const SCRIPT = path.join(ROOT, "scripts/micro-brain/compile-foundation-v1.mjs");
const INDEX = path.join(process.cwd(), "src/lib/understanding-core/micro-brain/compiled/foundation.index.v1.json");

function sha256(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function compile(): string {
  const result = spawnSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: "utf8", timeout: 30_000 });
  if (result.status !== 0) throw new Error(`compiler failed: ${result.stdout}\n${result.stderr}`);
  return sha256(INDEX);
}

describe("Micro Brain compiler determinism", () => {
  it("rebuilds the same byte identity from identical source", () => {
    const before = sha256(INDEX);
    const first = compile();
    const second = compile();
    expect(first).toBe(before);
    expect(second).toBe(first);
  }, 30_000);
});