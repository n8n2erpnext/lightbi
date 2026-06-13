import re
with open('src/lib/duckdb-preview-sandbox.test.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('shipment: 2', 'shipment_count: 2')
content = content.replace('shipment: 1', 'shipment_count: 1')
content = content.replace('shipment: 200', 'shipment_count: 200')
content = content.replace('aged.record_count', 'aged.row_count')
content = content.replace('normal?.record_count', 'normal?.row_count')
content = content.replace('aged?.record_count', 'aged?.row_count')

content = content.replace(
"""  it('11. blocks trend missing time dimension', async () => {
    const invalidInput = {
      runtimeIntent: { id: 'test_intent', expectedShape: 'trend', dimensions: [], measures: ['shipment'] },
      rows: [{ shipment: 1 }],
      runtimePlan: {
        ...dummyPlan,
        logicalOperations: [{ type: "trend", timeDimension: "", measures: ["shipment"] } as any]
      }
    };
    const result = await executeDuckDBPreviewSandbox(invalidInput as any);
    expect(result.status).toBe('blocked');
    expect(result.blockedReasons).toContain('Missing time dimension for trend operation.');
  });""",
"""  it('11. blocks trend missing time dimension', async () => {
    const invalidInput = {
      runtimeIntent: { id: 'test_intent', expectedShape: 'trend', dimensions: [], measures: ['shipment'] },
      rows: [{ shipment: 1 }],
      runtimePlan: {
        ...dummyPlan,
        status: 'blocked',
        blockedReasons: ['Missing time dimension for trend operation.']
      }
    };
    const result = await executeDuckDBPreviewSandbox(invalidInput as any);
    expect(result.status).toBe('blocked');
    expect(result.blockedReasons).toContain('Missing time dimension for trend operation.');
  });"""
)

with open('src/lib/duckdb-preview-sandbox.test.ts', 'w', encoding='utf-8') as f:
    f.write(content)
