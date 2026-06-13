import re

# Update contract
with open('src/lib/dataset-understanding-contract.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add DatasetGrain export
grain_type = 'export type DatasetGrain = "event" | "entity" | "snapshot" | "summary" | "unknown";\n\nexport type DatasetUnderstandingStatus'
content = content.replace('export type DatasetUnderstandingStatus', grain_type)

# 2. Update DatasetUnderstanding struct
content = content.replace('  grainHint: "event" | "entity" | "snapshot" | "summary" | "unknown";', '  grain: DatasetGrain;\n  grainEvidence: string;')

# 3. Update the logic inside createDatasetUnderstanding
old_logic = """  // 8. Grain Hint Heuristics
  let grainHint: "event" | "entity" | "snapshot" | "summary" | "unknown" = "unknown";

  const hasEventSignals = has('shipment') || has('order') || has('stock_movement') || has('inbound') || has('outbound');
  const hasSnapshotSignals = has('stock_age') || has('stock_status') || has('inventory') || has('replenishment') || has('warehouse');
  const hasEntitySignals = has('sku') || has('product') || has('customer') || has('supplier') || has('branch') || has('salesperson');
  const hasTime = timeSignals.length > 0;

  if (hasEventSignals) {
    grainHint = "event";
  } else if (hasSnapshotSignals) {
    grainHint = "snapshot";
  } else if (hasEntitySignals && !hasTime && measureSignals.length <= 1) {
    grainHint = "entity";
  } else if (hasTime && measureSignals.length > 0 && !hasEntitySignals && !hasEventSignals && !hasSnapshotSignals) {
    grainHint = "summary";
  }"""

new_logic = """  // 8. Grain Heuristics
  let grain: DatasetGrain = "unknown";
  let grainEvidence = "No structural patterns recognized.";

  const hasEventSignals = has('shipment') || has('order') || has('stock_movement') || has('inbound') || has('outbound');
  const hasSnapshotSignals = has('stock_age') || has('stock_status') || has('inventory') || has('replenishment') || has('warehouse');
  const hasEntitySignals = has('sku') || has('product') || has('customer') || has('supplier') || has('branch') || has('salesperson');
  const hasTime = timeSignals.length > 0;

  if (hasEventSignals) {
    grain = "event";
    grainEvidence = "Detected event-level signals (e.g. shipment, order).";
  } else if (hasSnapshotSignals) {
    grain = "snapshot";
    grainEvidence = "Detected point-in-time snapshot signals (e.g. inventory, warehouse).";
  } else if (hasEntitySignals && !hasTime && measureSignals.length <= 1) {
    grain = "entity";
    grainEvidence = "Detected entity-level signals without deep temporal data.";
  } else if (hasTime && measureSignals.length > 0 && !hasEntitySignals && !hasEventSignals && !hasSnapshotSignals) {
    grain = "summary";
    grainEvidence = "Detected aggregated measures over time dimensions.";
  }"""

content = content.replace(old_logic, new_logic)

# 4. Update the object creation
content = content.replace('    grainHint,\n', '    grain,\n    grainEvidence,\n')

with open('src/lib/dataset-understanding-contract.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# Update test
with open('src/lib/dataset-understanding-contract.test.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace grainHint with grain
content = content.replace('.grainHint', '.grain')

# Add snapshot test
snapshot_test = """  it('determines grain as snapshot for point-in-time inventory states', () => {
    const registry = createMockRegistry(['inventory', 'warehouse', 'product']);
    const du = createDatasetUnderstanding({ signalRegistry: registry });
    expect(du.grain).toBe('snapshot');
    expect(du.grainEvidence).toContain('snapshot signals');
  });

  it('determines grain as entity for pure identifiers', () => {"""

content = content.replace("  it('determines grain as entity for pure identifiers', () => {", snapshot_test)

# Add assertions for other grainEvidences
content = content.replace("expect(du.grain).toBe('unknown');", "expect(du.grain).toBe('unknown');\n    expect(du.grainEvidence).toBe('No structural patterns recognized.');")
content = content.replace("expect(du.grain).toBe('event');", "expect(du.grain).toBe('event');\n    expect(du.grainEvidence).toContain('event-level signals');")
content = content.replace("expect(du.grain).toBe('entity');", "expect(du.grain).toBe('entity');\n    expect(du.grainEvidence).toContain('entity-level signals');")
content = content.replace("expect(du.grain).toBe('summary');", "expect(du.grain).toBe('summary');\n    expect(du.grainEvidence).toContain('aggregated measures over time dimensions');")


with open('src/lib/dataset-understanding-contract.test.ts', 'w', encoding='utf-8') as f:
    f.write(content)
