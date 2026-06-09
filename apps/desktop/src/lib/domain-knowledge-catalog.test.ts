import { describe, it, expect } from 'vitest';
import {
  DOMAIN_KNOWLEDGE_CATALOG_V1,
  getDomainCatalog,
  listDomainCatalogs,
  listBusinessViewsByDomain,
  findBusinessViewDefinition,
  listQuestionIntentsByBusinessView,
  listSignalsForDomain
} from './domain-knowledge-catalog';

describe('Domain Knowledge Catalog V1', () => {

  it('1. Catalog has exactly 6 domains', () => {
    expect(DOMAIN_KNOWLEDGE_CATALOG_V1.length).toBe(6);
  });

  it('2. Each domain has at least 3 concepts, 2 intent families, 2 business views', () => {
    DOMAIN_KNOWLEDGE_CATALOG_V1.forEach(domain => {
      expect(domain.concepts.length).toBeGreaterThanOrEqual(3);
      expect(domain.intentFamilies.length).toBeGreaterThanOrEqual(2);
      expect(domain.businessViews.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('3. Operations contains Logistics Journey', () => {
    const ops = getDomainCatalog('operations');
    expect(ops).toBeDefined();
    expect(ops!.businessViews.find(v => v.id === 'logistics_journey')).toBeDefined();
  });

  it('4. Revenue contains Revenue Performance', () => {
    const rev = getDomainCatalog('revenue');
    expect(rev).toBeDefined();
    expect(rev!.businessViews.find(v => v.id === 'revenue_performance')).toBeDefined();
  });

  it('5. Inventory contains Inventory Health', () => {
    const inv = getDomainCatalog('inventory');
    expect(inv).toBeDefined();
    expect(inv!.businessViews.find(v => v.id === 'inventory_health')).toBeDefined();
  });

  it('6. Customer contains Customer Segmentation', () => {
    const cus = getDomainCatalog('customer');
    expect(cus).toBeDefined();
    expect(cus!.businessViews.find(v => v.id === 'customer_segmentation')).toBeDefined();
  });

  it('7. Performance contains Target Achievement', () => {
    const perf = getDomainCatalog('performance');
    expect(perf).toBeDefined();
    expect(perf!.businessViews.find(v => v.id === 'target_achievement')).toBeDefined();
  });

  it('8. Finance contains Profitability Analysis', () => {
    const fin = getDomainCatalog('finance');
    expect(fin).toBeDefined();
    expect(fin!.businessViews.find(v => v.id === 'profitability_analysis')).toBeDefined();
  });

  it('9. Every BusinessViewDefinition intentIds must reference existing intent families in the same domain', () => {
    DOMAIN_KNOWLEDGE_CATALOG_V1.forEach(domain => {
      const intentMap = new Set(domain.intentFamilies.map(i => i.id));
      domain.businessViews.forEach(view => {
        view.intentIds.forEach(id => {
          expect(intentMap.has(id)).toBe(true);
        });
      });
    });
  });

  it('10. Every BusinessViewDefinition requiredSignals must exist in the domains concept canonical signals OR explicitly shared', () => {
    // Explicitly shared signals from other domains (e.g. revenue in customer domain)
    const globallyShared = ["revenue", "order", "discount", "customer", "product", "supplier", "warehouse", "delivery_status", "shipment"];
    
    DOMAIN_KNOWLEDGE_CATALOG_V1.forEach(domain => {
      const conceptSignals = new Set(domain.concepts.map(c => c.canonicalSignal));
      domain.businessViews.forEach(view => {
        view.requiredSignals.forEach(sig => {
          const valid = conceptSignals.has(sig) || globallyShared.includes(sig);
          expect(valid).toBe(true);
        });
      });
    });
  });

  it('11. findBusinessViewDefinition returns correct view', () => {
    const view = findBusinessViewDefinition('logistics_journey');
    expect(view).toBeDefined();
    expect(view!.id).toBe('logistics_journey');
  });

  it('12. listQuestionIntentsByBusinessView returns templates for the view', () => {
    const intents = listQuestionIntentsByBusinessView('logistics_journey');
    expect(intents.length).toBeGreaterThan(0);
    const intentIds = intents.map(i => i.id);
    expect(intentIds).toContain('intent_logistics_journey');
  });

  it('13. No duplicate business view IDs across catalog', () => {
    const allViewIds = new Set<string>();
    DOMAIN_KNOWLEDGE_CATALOG_V1.forEach(domain => {
      domain.businessViews.forEach(view => {
        expect(allViewIds.has(view.id)).toBe(false);
        allViewIds.add(view.id);
      });
    });
  });

  it('14. No duplicate domain IDs', () => {
    const allDomainIds = new Set<string>();
    DOMAIN_KNOWLEDGE_CATALOG_V1.forEach(domain => {
      expect(allDomainIds.has(domain.id)).toBe(false);
      allDomainIds.add(domain.id);
    });
  });

});
