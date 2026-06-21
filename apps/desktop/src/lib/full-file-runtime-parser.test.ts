import { describe, expect, it } from "vitest";
import { materializeRuntimeFilePayloads } from "./full-file-runtime-parser";

function textBuffer(value: string): ArrayBuffer {
  return new TextEncoder().encode(value).buffer as ArrayBuffer;
}

describe("materializeRuntimeFilePayloads", () => {
  it("materializes full CSV rows with normalized physical headers", () => {
    const result = materializeRuntimeFilePayloads([{
      name: "campaign.csv",
      buffer: textBuffer("Month,Duration\nmay,120\njun,240")
    }]);

    expect(result.rowCount).toBe(2);
    expect(JSON.parse(result.jsonText)).toEqual([
      { month: "may", duration: 120 },
      { month: "jun", duration: 240 }
    ]);
  });

  it("combines JSON files without retaining rows in React state", () => {
    const result = materializeRuntimeFilePayloads([
      { name: "a.json", buffer: textBuffer('[{"Region":"North"}]') },
      { name: "b.json", buffer: textBuffer('[{"Region":"South"}]') }
    ]);

    expect(result.rowCount).toBe(2);
    expect(JSON.parse(result.jsonText)).toEqual([
      { region: "North" },
      { region: "South" }
    ]);
  });
});
