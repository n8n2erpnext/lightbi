import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const DIR = path.resolve(process.cwd(), "src/lib/understanding-core/micro-brain");
const INDEX = path.join(DIR, "compiled/foundation.index.v1.json");
const SIDECAR = `${INDEX}.sha256`;
const RUNTIME_FILES = [
  "built-in-index.ts", "contracts.ts", "evidence-bridge.ts", "index-loader.ts", "index.ts",
  "knowledge-schema.ts", "normalization.ts", "query-signature.ts", "retrieval.ts",
];
const FORBIDDEN_NETWORK = [
  /\bfetch\s*\(/, /\bWebSocket\b/, /\bXMLHttpRequest\b/, /\bEventSource\b/,
  /from\s+["']node:http/, /from\s+["']node:https/, /from\s+["']node:net/, /from\s+["']node:dgram/,
];

describe("MB-7 runtime invariants", () => {
  it("has no network dependency in the Micro Brain runtime path", () => {
    const violations: string[] = [];
    for (const file of RUNTIME_FILES) {
      const text = fs.readFileSync(path.join(DIR, file), "utf8");
      for (const pattern of FORBIDDEN_NETWORK) if (pattern.test(text)) violations.push(`${file}:${pattern}`);
    }
    expect(violations).toEqual([]);
  });

  it("keeps the compiled index within the local-first footprint budget and matches its checksum sidecar", () => {
    const bytes = fs.readFileSync(INDEX);
    expect(bytes.byteLength).toBeLessThan(64 * 1024 * 1024);
    const actual = crypto.createHash("sha256").update(bytes).digest("hex");
    const declared = fs.readFileSync(SIDECAR, "utf8").trim().split(/\s+/)[0];
    expect(actual).toBe(declared);
  });
});
