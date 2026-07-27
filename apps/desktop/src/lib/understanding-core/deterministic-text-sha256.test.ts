import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { deterministicTextSha256 } from "./deterministic-text-sha256";

describe("browser-safe deterministic text SHA-256", () => {
  it.each(["", "OrderID|InvoiceNo", "Thẻ", "source:a|source:b"])(
    "matches node crypto for %j",
    value => {
      expect(deterministicTextSha256(value)).toBe(
        createHash("sha256").update(value).digest("hex"),
      );
    },
  );
});
