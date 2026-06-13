import re

# 1. Fix dataset-understanding-contract.ts dim vs time
with open('src/lib/dataset-understanding-contract.ts', 'r', encoding='utf-8') as f:
    contract = f.read()

# Fix the time signals loop where I accidentally used dim.canonicalId
contract = contract.replace("dimensions: [dim.canonicalId], measures: ['record_count']", "dimensions: [time.canonicalId], measures: ['record_count']")
# Wait, I might have replaced it wrong. Let's look exactly at what caused ReferenceError: dim is not defined
# "createDatasetUnderstanding src/lib/dataset-understanding-contract.ts:238"
# Let's fix it safely:
contract = re.sub(r"for \(const time of timeSignals\) \{\s*if \(capId > 16\) break;\s*const capability = \{ id: `cap_\$\{capId\}`, actionType: 'distribution' as const, dimensions: \[dim.canonicalId\]", 
                  "for (const time of timeSignals) {\n      if (capId > 16) break;\n      const capability = { id: `cap_${capId}`, actionType: 'distribution' as const, dimensions: [time.canonicalId]", contract)

# Wait, what if there's also a group_by inside time loop?
contract = re.sub(r"const capability = \{ id: `cap_\$\{capId\}`, actionType: 'group_by' as const, dimensions: \[dim.canonicalId\]", 
                  "const capability = { id: `cap_${capId}`, actionType: 'group_by' as const, dimensions: [time.canonicalId]", contract)

with open('src/lib/dataset-understanding-contract.ts', 'w', encoding='utf-8') as f:
    f.write(contract)

# I should probably just replace all `dim.canonicalId` that are inside `time` loop.
# Let's write a targeted bash replace instead if this fails, but this should work.

# 2. Fix analysis-opportunity-actions.ts to merge arrays
with open('src/lib/analysis-opportunity-actions.ts', 'r', encoding='utf-8') as f:
    actions = f.read()

actions = actions.replace(
    "const sourceItems = understanding.opportunities || understanding.availableAnalysis || [];",
    "const sourceItems = [...(understanding.opportunities || []), ...(understanding.availableAnalysis || [])];"
)

with open('src/lib/analysis-opportunity-actions.ts', 'w', encoding='utf-8') as f:
    f.write(actions)

# 3. Fix dataset-understanding-contract.test.ts expectations
with open('src/lib/dataset-understanding-contract.test.ts', 'r', encoding='utf-8') as f:
    tests = f.read()

tests = tests.replace("const opportunityLabels = du.opportunities.map(a => a.label);", "const opportunityLabels = du.availableAnalysis.map(a => a.label);")

with open('src/lib/dataset-understanding-contract.test.ts', 'w', encoding='utf-8') as f:
    f.write(tests)
