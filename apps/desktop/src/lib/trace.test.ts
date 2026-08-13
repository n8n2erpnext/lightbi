import { describe, it } from 'vitest';
import { runGuidedInvestigationPipeline } from './guided-investigation-pipeline';
import { DOMAIN_KNOWLEDGE_CATALOG_V1 } from './domain-knowledge-catalog';

describe('Live Trace', () => {
  it('traces Delivery Performance Reports dataset', () => {
    const columns = [
      "Ngày báo cáo",
      "Tuyến xe",
      "Tên lái xe",
      "Đánh giá",
      "Mã tài kiện"
    ];

    const input = {
      columns: columns.map(c => ({ name: c, type: 'string' }))
    };

    const result = runGuidedInvestigationPipeline(input);
    const signals = result.signals.signals.map(s => s.canonicalId);
    
    console.log("1. DATASET COLUMNS:", columns);
    console.log("2. DETECTED SIGNALS:", signals);
    console.log("3. GENERATED PERSPECTIVES:", result.perspectives.map(p => p.id));
    
    console.log("4. EVALUATED BUSINESS VIEWS:");
    for (const perspective of Object.values(DOMAIN_KNOWLEDGE_CATALOG_V1)) {
      if (result.perspectives.find(p => p.id === perspective.id)) {
        for (const view of perspective.businessViews) {
          if (!result.businessViews.find(v => v.id === view.id)) {
            const matched = view.requiredSignals.filter(s => signals.includes(s));
            const missing = view.requiredSignals.filter(s => !signals.includes(s));
            console.log(`\nView: ${view.id}`);
            console.log(`Required: ${view.requiredSignals.join(', ')}`);
            console.log(`Matched: ${matched.join(', ')}`);
            console.log(`Missing: ${missing.join(', ')}`);
            console.log(`Reason: ${matched.length} of ${view.requiredSignals.length} signals found, minimum ${view.minimumRequiredMatches} required.`);
          }
        }
      }
    }
  });
});
