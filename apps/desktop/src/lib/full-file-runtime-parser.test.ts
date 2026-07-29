import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
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

  it("keeps UTF-8 Vietnamese headers from Google Sheets CSV intact", () => {
    const result = materializeRuntimeFilePayloads([{
      name: "Google Sheet.csv",
      buffer: textBuffer("Mã nhân viên xuất,Ngày xuất,Tên kho xuất\n123,2024-12-19,BHX HCM")
    }]);

    expect(JSON.parse(result.jsonText)).toEqual([
      {
        "mã nhân viên xuất": 123,
        "ngày xuất": "2024-12-19",
        "tên kho xuất": "BHX HCM"
      }
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

  it("excludes fully empty workbook rows to match the canonical data region", () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Employee ID", "Quality Score"],
      [101, 4.5],
      [null, null],
      [102, 4.8],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Performance");
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    const result = materializeRuntimeFilePayloads([{
      name: "performance.xlsx",
      buffer: bytes,
      sheetName: "Performance",
    }]);

    expect(result.rowCount).toBe(2);
    expect(JSON.parse(result.jsonText)).toEqual([
      { "employee id": 101, "quality score": 4.5 },
      { "employee id": 102, "quality score": 4.8 },
    ]);
  });

  it("starts workbook materialization at the canonical header row", () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["National manager performance report"],
      ["Employee ID", "Quality Score"],
      [101, 4.5],
      [102, 4.8],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Performance");
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    const result = materializeRuntimeFilePayloads([{
      name: "performance.xlsx",
      buffer: bytes,
      sheetName: "Performance",
      headerRowIndex: 1,
    }]);

    expect(result.rowCount).toBe(2);
    expect(JSON.parse(result.jsonText)[0]).toEqual({
      "employee id": 101,
      "quality score": 4.5,
    });
  });

  it("normalizes surrounding workbook-header whitespace like the query planner", () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      [" Quality Score "],
      [4.5],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Performance");
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    const result = materializeRuntimeFilePayloads([{
      name: "performance.xlsx",
      buffer: bytes,
      sheetName: "Performance",
    }]);

    expect(JSON.parse(result.jsonText)).toEqual([{ "quality score": 4.5 }]);
  });
});
