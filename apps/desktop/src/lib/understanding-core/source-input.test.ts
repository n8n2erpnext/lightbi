import { describe, expect, it } from "vitest";
import { adaptCoreToUnderstandingNext } from "./next-adapter";
import { createUnderstandingCoreResult } from "./question-engine";
import { createUnderstandingCoreInputFromSource, type UnderstandingSourceDescriptor } from "./source-input";

const columns = ["Order Date", "Store", "Sales", "Cash", "Employee"];
const rows = Array.from({ length: 40 }, (_, index) => ({
  "Order Date": `2025-01-${String((index % 20) + 1).padStart(2, "0")}`,
  Store: `S${index % 5}`,
  Sales: 100 + index * 3.5,
  Cash: index % 2 === 0 ? 50 : 0,
  Employee: `E${index % 8}`
}));

function comparable(source: UnderstandingSourceDescriptor) {
  const result = createUnderstandingCoreResult(createUnderstandingCoreInputFromSource(source));
  return {
    signals: result.signals.map(signal => `${signal.id}:${signal.physicalColumn}`).sort(),
    questions: result.questions.map(question => question.id),
    actions: result.actions.map(action => ({
      id: action.id,
      kind: action.actionKind,
      dimensions: action.dimensions,
      measures: action.measures,
      measureAggregations: action.measureAggregations
    }))
  };
}

describe("understanding-core source input boundary", () => {
  it("normalizes local file metadata without changing data semantics", () => {
    const input = createUnderstandingCoreInputFromSource({
      kind: "local_file",
      fileNames: ["orders.xlsx"],
      sheetNames: ["Orders"],
      columns,
      rows,
      sourceRowCount: 1000
    });

    const result = createUnderstandingCoreResult(input);

    expect(result.source.kind).toBe("local_file");
    expect(result.source.label).toBe("orders.xlsx");
    expect(result.source.fileNames).toEqual(["orders.xlsx"]);
    expect(result.source.sheetNames).toEqual(["Orders"]);
    expect(result.source.sourceRowCount).toBe(1000);
    expect(result.source.sampleRowCount).toBe(40);
  });

  it("preserves source metadata when adapting to understanding-next UI shape", () => {
    const core = createUnderstandingCoreResult(createUnderstandingCoreInputFromSource({
      kind: "local_file",
      fileNames: ["orders.xlsx"],
      sheetNames: ["Orders"],
      columns,
      rows,
      sourceRowCount: 1000
    }));

    const adapted = adaptCoreToUnderstandingNext(core);

    expect(adapted.source.fileNames).toEqual(["orders.xlsx"]);
    expect(adapted.source.sheetNames).toEqual(["Orders"]);
    expect(adapted.source.sourceRowCount).toBe(1000);
    expect(adapted.source.sampleRowCount).toBe(40);
  });

  it("produces the same signal/question/action semantics for local, online, and database sources", () => {
    const local = comparable({
      kind: "local_file",
      fileNames: ["orders.xlsx"],
      sheetNames: ["Orders"],
      columns,
      rows,
      sourceRowCount: 1000
    });
    const online = comparable({
      kind: "online_file",
      title: "Orders Google Sheet",
      sheetNames: ["Orders"],
      columns,
      rows,
      sourceRowCount: 1000
    });
    const database = comparable({
      kind: "database_table",
      connectionName: "erpnext",
      schemaName: "sales",
      tableName: "orders",
      columns,
      rows,
      sourceRowCount: 1000
    });

    expect(online).toEqual(local);
    expect(database).toEqual(local);
  });
});
