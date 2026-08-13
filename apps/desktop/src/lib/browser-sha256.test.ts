import { describe, expect, it } from "vitest";
import { browserSha256 } from "./browser-sha256";

const EXPECTED_ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

describe("browserSha256", () => {
  const input = () => new TextEncoder().encode("abc").buffer;

  it("uses the deterministic fallback when Web Crypto is unavailable", async () => {
    expect(await browserSha256(input(), undefined)).toBe(EXPECTED_ABC);
  });

  it("uses the deterministic fallback when digest is absent on an insecure origin", async () => {
    expect(await browserSha256(input(), {} as SubtleCrypto)).toBe(EXPECTED_ABC);
  });

  it("uses the deterministic fallback when the exposed digest capability throws", async () => {
    const subtle = {
      digest: async () => {
        throw new TypeError("digest unavailable");
      },
    } as unknown as SubtleCrypto;
    expect(await browserSha256(input(), subtle)).toBe(EXPECTED_ABC);
  });

  it("matches the Web Crypto result when digest is available", async () => {
    expect(await browserSha256(input())).toBe(EXPECTED_ABC);
  });
});
