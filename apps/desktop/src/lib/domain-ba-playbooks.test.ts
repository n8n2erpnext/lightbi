import { describe, expect, it } from 'vitest';
import { getDomainBAPlaybook, listDomainBAPlaybooks, listSignalsByTier } from './domain-ba-playbooks';

describe('domain BA playbooks', () => {
  it('covers the beta domain set with deterministic playbooks', () => {
    const domains = listDomainBAPlaybooks().map(playbook => playbook.domainId);

    expect(domains).toEqual(expect.arrayContaining([
      'revenue',
      'finance',
      'inventory',
      'operations',
      'customer',
      'performance'
    ]));
  });

  it('keeps profitability guarded by cost-like evidence', () => {
    const finance = getDomainBAPlaybook('finance');

    expect(finance?.caveatRules.some(rule => rule.id === 'missing_cost_for_profit')).toBe(true);
    expect(finance?.metrics.find(metric => metric.id === 'gross_profit')?.caveatWhenMissing).toContain('must not claim profit');
  });

  it('defines exportable evidence for decision claims', () => {
    for (const playbook of listDomainBAPlaybooks()) {
      expect(playbook.evidenceRules.length).toBeGreaterThan(0);
      expect(playbook.supportedQuestions.length).toBeGreaterThan(0);
      expect(playbook.driverModels.length).toBeGreaterThan(0);
    }
  });

  it('defines basic standard and advanced signal tiers for each domain', () => {
    for (const playbook of listDomainBAPlaybooks()) {
      expect(playbook.signalTiers.map(tier => tier.tier)).toEqual(['basic', 'standard', 'advanced']);
      expect(playbook.signalTiers.every(tier => tier.signals.length > 0 && tier.unlocks.length > 0)).toBe(true);
    }
  });

  it('keeps finance advanced tier focused on real profitability evidence', () => {
    const financeTiers = listSignalsByTier('finance');
    const advancedSignals = financeTiers.find(tier => tier.tier === 'advanced')?.signals ?? [];

    expect(advancedSignals).toEqual(expect.arrayContaining(['purchase_cost', 'operational_cost', 'storage_cost']));
  });
});
