import { describe, expect, it } from "vitest";
import type { FocusSubjectCandidate } from "./focus-subject-analysis";
import { createMultiSourceFocusSelection, deriveMultiSourceFocusCandidates, filterRowsForMultiSourceFocus, focusBindingForSource } from "./multisource-focus-subject";

const candidate = (field: string, values: Array<[string, string]>, confidence = 0.9): FocusSubjectCandidate => ({
  id: `product:${field}`, canonicalId: "product", domain: "inventory", field, fieldLabel: "Product", confidence,
  options: values.map(([value, displayLabel]) => ({ value, displayLabel, searchText: `${value} ${displayLabel}`.toLowerCase() })),
});

describe("multi-source Focus Subject contract", () => {
  const sources = [
    { key: "sales", name: "Sales.xlsx", focusCandidates: [candidate("Product ID", [["P1", "P1 — Widget"], ["P2", "P2 — Cable"]])] },
    { key: "accounting", name: "Accounting.xlsx", focusCandidates: [candidate("Item Code", [["P1", "P1 — Widget"], ["P3", "P3 — Case"]], 0.8)] },
    { key: "logistics", name: "Logistics.xlsx", focusCandidates: [] },
  ];

  it("merges one canonical concept without pretending fields are physically identical", () => {
    const [merged] = deriveMultiSourceFocusCandidates(sources);
    expect(merged.canonicalId).toBe("product");
    expect(merged.sourceKeys).toEqual(["accounting", "sales"]);
    expect(merged.options.map((item) => item.value)).toEqual(["P2", "P3", "P1"].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
  });

  it("requires exact value evidence per source and discloses unavailable bindings", () => {
    const merged = deriveMultiSourceFocusCandidates(sources)[0];
    const option = merged.options.find((item) => item.value === "P1")!;
    const selection = createMultiSourceFocusSelection(merged, option, sources);
    expect(focusBindingForSource(selection, "sales")?.state).toBe("matched_exact");
    expect(focusBindingForSource(selection, "accounting")?.state).toBe("matched_exact");
    expect(focusBindingForSource(selection, "logistics")?.state).toBe("concept_unavailable");
  });

  it("does not fuzzy-match a label when the selected identifier differs", () => {
    const localSources = [
      { key: "a", name: "A", focusCandidates: [candidate("SKU", [["A-1", "A-1 — Widget"], ["A-2", "A-2 — Cable"]])] },
      { key: "b", name: "B", focusCandidates: [candidate("Item", [["B-9", "B-9 — Widget"], ["B-8", "B-8 — Case"]])] },
    ];
    const merged = deriveMultiSourceFocusCandidates(localSources)[0];
    const selection = createMultiSourceFocusSelection(merged, merged.options.find((item) => item.value === "A-1")!, localSources);
    expect(focusBindingForSource(selection, "b")?.state).toBe("concept_available_value_absent");
  });

  it("filters only exact matched rows and returns no rows for unresolved sources", () => {
    const merged = deriveMultiSourceFocusCandidates(sources)[0];
    const selection = createMultiSourceFocusSelection(merged, merged.options.find((item) => item.value === "P1")!, sources);
    const rows = [{ "Product ID": "P1", amount: 10 }, { "Product ID": "P2", amount: 20 }];
    expect(filterRowsForMultiSourceFocus(rows, selection, focusBindingForSource(selection, "sales"))).toEqual([{ "Product ID": "P1", amount: 10 }]);
    expect(filterRowsForMultiSourceFocus(rows, selection, focusBindingForSource(selection, "logistics"))).toEqual([]);
  });
});
