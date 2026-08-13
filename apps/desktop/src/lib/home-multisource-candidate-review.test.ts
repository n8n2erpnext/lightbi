import { describe, expect, it } from "vitest";
import { mapCollectionPerspectiveToDatasetPerspective } from "./home-multisource-candidate-review";

describe("single-source perspective handoff", () => {
  it("bridges collection role perspectives to canonical dataset domains", () => {
    expect(mapCollectionPerspectiveToDatasetPerspective("sales_performance")).toBe("revenue");
    expect(mapCollectionPerspectiveToDatasetPerspective("profitability")).toBe("finance");
    expect(mapCollectionPerspectiveToDatasetPerspective("fulfillment_operations")).toBe("operations");
    expect(mapCollectionPerspectiveToDatasetPerspective("data_trust")).toBeNull();
  });
});
