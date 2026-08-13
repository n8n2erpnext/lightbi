import { describe, it } from 'vitest';
import { DOMAIN_KNOWLEDGE_CATALOG_V1 } from './domain-knowledge-catalog';

describe('Audit Views', () => {
  it('extracts all views', () => {
    for (const perspective of Object.values(DOMAIN_KNOWLEDGE_CATALOG_V1)) {
      console.log(`\n=== PERSPECTIVE: ${perspective.id} ===`);
      for (const view of perspective.businessViews) {
        console.log(`\nVIEW: ${view.id}`);
        console.log(`Required: ${view.requiredSignals.join(', ')}`);
        console.log(`Optional: ${view.optionalSignals?.join(', ') || 'none'}`);
        console.log(`MinimumRequired: ${view.minimumRequiredMatches}`);
      }
    }
  });
});
