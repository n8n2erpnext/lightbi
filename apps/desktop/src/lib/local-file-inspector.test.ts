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
