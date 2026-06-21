import { describe, expect, it } from "vitest";
import { createFileSourceCandidate } from "./source-preflight";
import { inspectLocalFile } from "./local-file-inspector";

describe("inspectLocalFile", () => {
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
});
