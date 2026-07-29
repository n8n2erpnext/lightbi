import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..");
const APPROVED_PROVIDER = path.resolve(__dirname, "browser-sha256.ts");

function productionFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return productionFiles(target);
    if (!/\.(ts|tsx)$/.test(entry.name) || /\.(test|spec)\.(ts|tsx)$/.test(entry.name)) return [];
    return [target];
  });
}

describe("Phase 8F.2 browser hashing architecture", () => {
  it("permits direct browser digest access only in the centralized provider", () => {
    const violations = productionFiles(ROOT)
      .filter((file) => file !== APPROVED_PROVIDER)
      .filter((file) => /\b(?:crypto\.subtle|subtle\.digest)\b/.test(fs.readFileSync(file, "utf8")))
      .map((file) => path.relative(ROOT, file));
    expect(violations).toEqual([]);
  });
});
