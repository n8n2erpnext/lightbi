import { describe, it, expect } from 'vitest';
import { runGuidedInvestigationPipeline } from './guided-investigation-pipeline';
import { DOMAIN_KNOWLEDGE_CATALOG_V1 } from './domain-knowledge-catalog';

describe('Regression Audit', () => {
  it('analyzes the dataset', () => {
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
    
    console.log("SIGNALS DETECTED:", signals);
    console.log("PERSPECTIVES:", result.perspectives.map(p => p.id));
    console.log("VIEWS:", result.businessViews.map(v => v.id));
    console.log("QUESTIONS:", result.questionSuggestions.length);

    // Analyze rejected views
    console.log("--- REJECTED VIEWS ANALYSIS ---");
    for (const perspective of Object.values(DOMAIN_KNOWLEDGE_CATALOG_V1)) {
      for (const view of perspective.businessViews) {
        if (!result.businessViews.find(v => v.id === view.id)) {
          const matched = view.requiredSignals.filter(s => signals.includes(s));
          const missing = view.requiredSignals.filter(s => !signals.includes(s));
          if (matched.length > 0) {
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
