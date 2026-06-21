import { describe, expect, it } from "vitest";
import { profileColumns } from "./column-profiler";

describe("profileColumns", () => {
  it("profiles the full row set instead of only the first 1000 rows", () => {
    const rows = Array.from({ length: 1200 }, (_, index) => ({
      contact: index < 1000 ? "telephone" : "cellular"
    }));

    const profiles = profileColumns(["contact"], rows, rows.length);
    const profile = profiles.contact;

    expect(profile.distinctCount).toBe(2);
    expect(profile.nonEmptyCount).toBe(1200);
    expect(profile.profiledRowCount).toBe(1200);
    expect(profile.profilingScope).toBe("full");
    expect(profile.topValueCounts).toEqual([
      { value: "telephone", count: 1000 },
      { value: "cellular", count: 200 }
    ]);
  });
});
