import { describe, expect, it } from "vitest";
import { selectFirstNonEmptyRows } from "./row-surface";

describe("selectFirstNonEmptyRows", () => {
  it("skips empty retained analysis rows and falls back to semantic rows", () => {
    const semanticRows = [{ id: 1 }, { id: 2 }];

    expect(selectFirstNonEmptyRows([], semanticRows, [{ id: 3 }])).toBe(semanticRows);
  });

  it("returns an empty row set when no usable rows exist", () => {
    expect(selectFirstNonEmptyRows(undefined, null, [])).toEqual([]);
  });
});
