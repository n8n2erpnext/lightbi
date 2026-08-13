import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFileSourceCandidate, type SourceCandidate } from "./source-preflight";
import { inspectLocalFile } from "./local-file-inspector";
import { browserSha256 } from "./browser-sha256";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("inspectLocalFile", () => {
  it("rejects a Git LFS pointer instead of presenting it as an empty dataset", async () => {
    const pointer = "version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 118492\n";
    const file = new File([pointer], "sales.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const candidate = createFileSourceCandidate(file);
    if ("status" in candidate) throw new Error("Expected local Excel candidate");

    const result = await inspectLocalFile(candidate);

    expect(result.status).toBe("invalid_format");
    if (result.status === "invalid_format") expect(result.message).toContain("Git LFS placeholder");
  });

  it("keeps full CSV rows for analysis while exposing bounded preview rows", async () => {
    const csv = [
      "contact,y",
      "telephone,no",
      "telephone,no",
      "cellular,yes"
    ].join("\n");
    const file = new File([csv], "campaign.csv", { type: "text/csv" });
    const candidate = createFileSourceCandidate(file);
    if ("status" in candidate) throw new Error("Expected local CSV candidate");

    const result = await inspectLocalFile(candidate);

    expect(result.status).toBe("accessible");
    if (result.status === "accessible") {
      expect(result.metadata.rows_count).toBe(3);
      expect(result.metadata.preview_rows).toHaveLength(3);
      expect(result.metadata.semantic_rows).toHaveLength(3);
      expect(result.metadata.semantic_sample?.strategy).toBe("full");
      expect(result.metadata.analysis_row_scope).toBe("full");
      expect(result.metadata.analysis_rows).toEqual([
        { contact: "telephone", y: "no" },
        { contact: "telephone", y: "no" },
        { contact: "cellular", y: "yes" }
      ]);
      expect(result.metadata.profiles?.contact.distinctCount).toBe(2);
    }
  });

  it("preserves blank, duplicate, quoted and multiline CSV columns losslessly", async () => {
    const csv = 'Name,"","",Name\n"North, Hub",A,B,"line 1\nline 2"';
    const file = new File([csv], "messy.csv", { type: "text/csv" });
    const candidate = createFileSourceCandidate(file);
    if ("status" in candidate) throw new Error("Expected local CSV candidate");

    const result = await inspectLocalFile(candidate);

    expect(result.status).toBe("accessible");
    if (result.status === "accessible") {
      expect(result.metadata.columns).toEqual([
        "Name", "__EMPTY_2", "__EMPTY_3", "Name__DUPLICATE_2"
      ]);
      expect(result.metadata.analysis_rows).toEqual([{
        Name: "North, Hub",
        __EMPTY_2: "A",
        __EMPTY_3: "B",
        Name__DUPLICATE_2: "line 1\nline 2",
      }]);
      expect(result.metadata.canonical_full_file_profile?.artifact.sourceProfile.issues)
        .toEqual(expect.arrayContaining([
          expect.objectContaining({ code: "duplicate_header" }),
          expect.objectContaining({ code: "empty_header_column" }),
        ]));
    }
  });

  it("uses matrix semantic sampling and avoids retaining oversized analysis rows", async () => {
    const rowCount = 20_050;
    const csv = [
      "id,contact,y",
      ...Array.from({ length: rowCount }, (_, index) => {
        const contact = index < 19_500 ? "telephone" : "cellular";
        const y = index % 7 === 0 ? "yes" : "no";
        return `${index},${contact},${y}`;
      })
    ].join("\n");
    const file = new File([csv], "campaign-large.csv", { type: "text/csv" });
    const candidate = createFileSourceCandidate(file);
    if ("status" in candidate) throw new Error("Expected local CSV candidate");

    const result = await inspectLocalFile(candidate);

    expect(result.status).toBe("accessible");
    if (result.status === "accessible") {
      expect(result.metadata.rows_count).toBe(rowCount);
      expect(result.metadata.preview_rows).toHaveLength(1000);
      expect(result.metadata.semantic_sample?.strategy).toBe("matrix_sample");
      expect(result.metadata.semantic_sample?.source_row_count).toBe(rowCount);
      expect(result.metadata.semantic_rows?.length).toBeLessThanOrEqual(2000);
      expect(result.metadata.semantic_rows?.some(row => row.contact === "cellular")).toBe(true);
      expect(result.metadata.analysis_rows).toBeUndefined();
      expect(result.metadata.analysis_row_scope).toBe("not_retained");
      expect(result.metadata.profiles?.contact.distinctCount).toBe(2);
      expect(result.metadata.profiles?.contact.profilingScope).toBe("sample");
    }
  });

  it("produces the standard SHA-256 fingerprint without Web Crypto", async () => {
    const bytes = new TextEncoder().encode("abc");
    const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

    await expect(browserSha256(input, undefined))
      .resolves.toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("inspects XLSX on an insecure HTTP-style browser without crypto.subtle", async () => {
    vi.stubGlobal("crypto", undefined);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ["OrderID", "Revenue"],
      ["SO-001", 125_000],
      ["SO-002", 275_000],
    ]), "Sales");
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const file = new File([bytes], "sales.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const candidate = createFileSourceCandidate(file);
    if ("status" in candidate) throw new Error("Expected local XLSX candidate");

    const result = await inspectLocalFile(candidate);

    expect(result.status).toBe("accessible");
    if (result.status === "accessible") {
      const sheet = result.metadata.sheets?.Sales;
      const expectedFingerprint = createHash("sha256").update(new Uint8Array(bytes)).digest("hex");
      expect(sheet?.rows_count).toBe(2);
      expect(sheet?.columns).toEqual(["OrderID", "Revenue"]);
      expect(sheet?.canonical_full_file_profile?.sourceFingerprint).toBe(expectedFingerprint);
      expect(sheet?.canonical_full_file_profile?.artifact.provenance.sourceHash?.value).toBe(expectedFingerprint);
    }
  });

  it("returns a lightweight manifest for a multi-sheet workbook before profiling", async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ["Inventory report"],
      ["February 2025"],
      [],
      ["Item", "UOM", "Opening", "In", "Out", "Closing"],
      ["Bolt", "pcs", 10, 5, 2, 13],
    ]), "Summary");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ["ZONE A", null, "ZONE B"],
      [null, "Door", null],
    ]), "Warehouse map");
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const file = new File([bytes], "inventory.xlsx");
    const candidate = createFileSourceCandidate(file);
    if ("status" in candidate) throw new Error("Expected local XLSX candidate");

    const result = await inspectLocalFile(candidate, { workbookManifestOnly: true });

    expect(result.status).toBe("accessible");
    if (result.status === "accessible") {
      expect(result.metadata.requires_sheet_selection).toBe(true);
      expect(result.metadata.default_sheet).toBeUndefined();
      expect(result.metadata.sheets?.Summary.inspection_state).toBe("summary");
      expect(result.metadata.sheets?.Summary.preview_matrix?.length).toBeGreaterThan(0);
      expect(result.metadata.sheets?.["Warehouse map"].canonical_full_file_profile).toBeUndefined();
    }
  });

  it("profiles only explicitly selected workbook sheets and preserves the detected header", async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ["COMPANY"],
      ["INVENTORY REPORT"],
      ["February 2025"],
      [],
      ["STT", "TÊN VẬT TƯ", "MVT", "ĐVT", "Đầu kỳ", "Nhập", "Xuất", "Cuối kỳ", "Ghi chú"],
      [1, "Bolt", "B01", "Cái", 10, 5, 2, 13, null],
      [2, "Nut", "N01", "Kg", 20, 4, 1, 23, null],
    ]), "Tổng hợp");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["A"], [1]]), "Scratch");
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const file = new File([bytes], "inventory.xlsx");
    const candidate = createFileSourceCandidate(file);
    if ("status" in candidate) throw new Error("Expected local XLSX candidate");

    const result = await inspectLocalFile(candidate, { selectedSheetNames: ["Tổng hợp"] });

    expect(result.status).toBe("accessible");
    if (result.status === "accessible") {
      expect(result.metadata.requires_sheet_selection).toBe(false);
      expect(result.metadata.default_sheet).toBe("Tổng hợp");
      expect(result.metadata.selected_sheet_names).toEqual(["Tổng hợp"]);
      expect(result.metadata.sheets?.["Tổng hợp"].inspection_state).toBe("profiled");
      expect(result.metadata.sheets?.["Tổng hợp"].columns).toEqual([
        "STT", "TÊN VẬT TƯ", "MVT", "ĐVT", "Đầu kỳ", "Nhập", "Xuất", "Cuối kỳ", "Ghi chú",
      ]);
      expect(result.metadata.sheets?.["Tổng hợp"].canonical_full_file_profile?.artifact.sourceProfile.header.selectedHeaderRowIndex).toBe(4);
      expect(result.metadata.sheets?.["Tổng hợp"].canonical_full_file_profile?.sourceRowCount).toBe(2);
      expect(result.metadata.sheets?.["Tổng hợp"].rows_count).toBe(2);
      const semantic = result.metadata.sheets?.["Tổng hợp"].canonical_full_file_profile?.fullFileUnderstanding.semantic;
      const mappings = Object.fromEntries(semantic?.columns.map(column => [column.physicalColumn, column.selectedCandidateId]) ?? []);
      expect(mappings).toMatchObject({
        'TÊN VẬT TƯ': 'product',
        MVT: 'material',
        'ĐVT': 'uom',
        'Đầu kỳ': 'inventory',
        'Nhập': 'received_qty',
        'Xuất': 'outbound',
        'Cuối kỳ': 'stock_qty',
      });
      expect(result.metadata.sheets?.Scratch.inspection_state).toBe("summary");
    }
  });

  it("keeps a valid sibling accessible when another XLSX is corrupt", async () => {
    vi.stubGlobal("crypto", undefined);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ["ShipmentID", "Status"],
      ["SHIP-001", "Delivered"],
    ]), "Logistics");
    const validBytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const files = [
      new File([validBytes], "valid.xlsx"),
      new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0])], "corrupt.xlsx"),
    ];
    const candidates = files.map(file => createFileSourceCandidate(file));
    if (candidates.some(candidate => "status" in candidate)) {
      throw new Error("Expected local XLSX candidates");
    }

    const results = await Promise.all(candidates.map(candidate => inspectLocalFile(candidate as SourceCandidate)));

    expect(results[0].status).toBe("accessible");
    expect(results[1].status).toBe("invalid_format");
    if (results[1].status === "invalid_format") {
      expect(results[1].label).toBe("corrupt.xlsx");
      expect(results[1].message).toMatch(/^Failed to parse file:/);
      expect(results[1].diagnostic).toMatchObject({
        fileName: "corrupt.xlsx",
        extension: ".xlsx",
        byteSize: 8,
        fileObjectAvailable: true,
        parser: "sheetjs",
        workerRequestId: null,
        exceptionName: "Error",
        exceptionMessage: "Unsupported ZIP file",
      });
    }
  });
});
