import re

# 1. Update dataset-understanding-contract.ts
with open('src/lib/dataset-understanding-contract.ts', 'r', encoding='utf-8') as f:
    contract = f.read()

# Add import
contract = "import { detectCapabilities, generateOpportunities } from './dataset-capability-engine';\nimport type { DatasetCapability, AnalysisOpportunity } from './dataset-capability-engine';\n" + contract

# Remove old DatasetCapability and AnalysisOpportunity
contract = re.sub(r"export type AnalysisOpportunity = {[\s\S]*?};\n\n", "", contract)
contract = re.sub(r"export type DatasetCapability = {[\s\S]*?};\n\n", "", contract)

# Add availableAnalysis
contract = contract.replace("  const unavailableAnalysis: UnavailableAnalysisItem[] = [];", "  const availableAnalysis: any[] = [];\n  const unavailableAnalysis: UnavailableAnalysisItem[] = [];")

old_logic1 = """  const capabilities: DatasetCapability[] = [];
  const opportunities: AnalysisOpportunity[] = [];"""
new_logic1 = """  // opportunities and capabilities generated at the end"""
contract = contract.replace(old_logic1, new_logic1)

# Replace the delivery performance legacy push
old_logic2 = """opportunities.push(
      { id: 'opp1', label: 'Shipment activity by route', basedOnSignals: ['shipment', 'route'], source: 'heuristic', actionType: 'group_by', dimensions: ['route'], measures: ['shipment'] },
      { id: 'opp2', label: 'Shipment activity by driver', basedOnSignals: ['shipment', 'driver'], source: 'heuristic', actionType: 'group_by', dimensions: ['driver'], measures: ['shipment'] },
      { id: 'opp3', label: 'Satisfaction by route', basedOnSignals: ['satisfaction', 'route'], source: 'heuristic', actionType: 'group_by', dimensions: ['route'], measures: ['satisfaction'] },
      { id: 'opp4', label: 'Satisfaction by driver', basedOnSignals: ['satisfaction', 'driver'], source: 'heuristic', actionType: 'group_by', dimensions: ['driver'], measures: ['satisfaction'] },
      { id: 'opp5', label: 'Activity over report date', basedOnSignals: ['report_date'], source: 'heuristic', actionType: 'trend', dimensions: ['report_date'], measures: ['shipment'] }
    );"""
new_logic2 = """availableAnalysis.push(
      { id: 'opp1', label: 'Shipment activity by route', basedOnSignals: ['shipment', 'route'], source: 'signals', actionType: 'group_by', dimensions: ['route'], measures: ['shipment'] },
      { id: 'opp2', label: 'Shipment activity by driver', basedOnSignals: ['shipment', 'driver'], source: 'signals', actionType: 'group_by', dimensions: ['driver'], measures: ['shipment'] },
      { id: 'opp3', label: 'Satisfaction by route', basedOnSignals: ['satisfaction', 'route'], source: 'signals', actionType: 'group_by', dimensions: ['route'], measures: ['satisfaction'] },
      { id: 'opp4', label: 'Satisfaction by driver', basedOnSignals: ['satisfaction', 'driver'], source: 'signals', actionType: 'group_by', dimensions: ['driver'], measures: ['satisfaction'] },
      { id: 'opp5', label: 'Activity over report date', basedOnSignals: ['report_date'], source: 'signals', actionType: 'trend', dimensions: ['report_date'], measures: ['shipment'] }
    );"""
contract = contract.replace(old_logic2, new_logic2)

# Fix loop pushing to capabilities by REPLACING 'opportunities.push' to 'availableAnalysis.push' in generic loop
# AND 'capabilities.push(capability)' with nothing!
contract = re.sub(r"const capability: DatasetCapability = \{[\s\S]*?\};\n\s+capabilities\.push\(capability\);", 
                  "// we don't push legacy capability anymore", contract)

contract = contract.replace("opportunities.push({", "availableAnalysis.push({")

# Because we removed `capability` variable above, we need to replace `capability.actionType` etc. in availableAnalysis.push!
# Let's just fix it by string replacements on the specific blocks:
contract = contract.replace("actionType: capability.actionType,", "actionType: 'distribution',")
contract = contract.replace("dimensions: capability.dimensions,", "dimensions: [dim.canonicalId],")
contract = contract.replace("measures: capability.measures", "measures: ['record_count']")

# Wait, for the group by and trend loop, dim.canonicalId is wrong. 
# Inside the measure-time loop, the dimensions was [time.canonicalId] and actionType was 'trend'.
# And inside the measure-dim loop, dimensions was [dim.canonicalId] and actionType was 'group_by'.

# Let's just rewrite the entire Generic generator block correctly using regex.
block_regex = r"// Generic generator builds structural capabilities[\s\S]*?// Generic Missing analysis"
replacement_block = """// Generic generator builds structural capabilities
    let capId = 1;

    let hasPromotedDist = false;
    for (const dim of dimensionSignals) {
      if (capId > 8) break;
      if (!hasPromotedDist) {
        availableAnalysis.push({
          id: `gen_aa_${capId}`,
          label: `${dim.label} distribution`,
          basedOnSignals: [dim.canonicalId],
          source: 'signals',
          actionType: 'distribution',
          dimensions: [dim.canonicalId],
          measures: ['record_count']
        });
        hasPromotedDist = true;
      }
      capId++;
    }

    let hasPromotedTrend = false;
    let hasPromotedGroupBy = false;

    for (const measure of measureSignals) {
      for (const time of timeSignals) {
        if (capId > 16) break;
        if (!hasPromotedTrend) {
          availableAnalysis.push({
            id: `gen_aa_${capId}`,
            label: `${measure.label} over ${time.label}`,
            basedOnSignals: [measure.canonicalId, time.canonicalId],
            source: 'signals',
            actionType: 'trend',
            dimensions: [time.canonicalId],
            measures: [measure.canonicalId]
          });
          hasPromotedTrend = true;
        }
        capId++;
      }

      for (const dim of dimensionSignals) {
        if (capId > 24) break;
        if (!hasPromotedGroupBy) {
          availableAnalysis.push({
            id: `gen_aa_${capId}`,
            label: `${measure.label} by ${dim.label}`,
            basedOnSignals: [measure.canonicalId, dim.canonicalId],
            source: 'signals',
            actionType: 'group_by',
            dimensions: [dim.canonicalId],
            measures: [measure.canonicalId]
          });
          hasPromotedGroupBy = true;
        }
        capId++;
      }
    }

    // Generic Missing analysis"""
contract = re.sub(block_regex, replacement_block, contract)

# Add detection logic before baseUnderstanding
detection_logic = """  const capabilities = detectCapabilities(signals);
  const opportunities = generateOpportunities(capabilities, grain);
  
  const baseUnderstanding = {"""
contract = contract.replace("  const baseUnderstanding = {", detection_logic)

# Replace old narrative logic
contract = contract.replace("Found ${opportunities.length} analysis opportunities", "Generated ${availableAnalysis.length} structural models")

# Fix opportunities as any
contract = contract.replace("availableAnalysis: opportunities as any, // Compatibility bridge", "availableAnalysis,")

# Replace opportunities check
contract = contract.replace("if (baseUnderstanding.opportunities.length === 0)", "if (baseUnderstanding.opportunities.every(o => o.confidence === 'low') && baseUnderstanding.availableAnalysis.length === 0)")

with open('src/lib/dataset-understanding-contract.ts', 'w', encoding='utf-8') as f:
    f.write(contract)
