import { describe, expect, it } from 'vitest';
import { TAXONOMY } from './business-signal-detector';
import { CONTEXT_SEMANTIC_DICTIONARY_V1 } from './context-semantic-dictionary';
import { DOMAIN_BA_PLAYBOOKS } from './domain-ba-playbooks';
import { DOMAIN_KNOWLEDGE_CATALOG_V1 } from './domain-knowledge-catalog';
import {
  CORE_ONLY_UNIVERSAL_SIGNAL_IDS,
  CORE_SUPPLEMENTAL_SIGNAL_RULES,
  REGISTRY_BACKED_UNIVERSAL_SIGNAL_RULES
} from './understanding-core/ontology';
import {
  NEXT_ONLY_SIGNAL_IDS,
  NEXT_SUPPLEMENTAL_SIGNAL_RULES,
  REGISTRY_BACKED_NEXT_SIGNAL_RULES
} from './understanding-next/signal-detector';
import {
  SEMANTIC_CONTEXT_DICTIONARY_V1,
  SEMANTIC_SIGNAL_REGISTRY_V1,
  SEMANTIC_TAXONOMY_V1,
  SUPPORTED_RUNTIME_BA_DOMAINS
} from './semantic-registry';

describe('semantic registry source of truth', () => {
  it('feeds the runtime detector taxonomy from the central registry', () => {
    expect(TAXONOMY).toBe(SEMANTIC_TAXONOMY_V1);
    expect(Object.keys(TAXONOMY).sort()).toEqual(
      SEMANTIC_SIGNAL_REGISTRY_V1.map(signal => signal.canonicalId).sort()
    );
  });

  it('feeds the context dictionary from the central registry', () => {
    expect(CONTEXT_SEMANTIC_DICTIONARY_V1).toBe(SEMANTIC_CONTEXT_DICTIONARY_V1);
    expect(CONTEXT_SEMANTIC_DICTIONARY_V1.map(entry => entry.canonicalId).sort()).toEqual(
      SEMANTIC_SIGNAL_REGISTRY_V1.map(signal => signal.canonicalId).sort()
    );
  });

  it('feeds understanding-core ontology through a registry-backed adapter', () => {
    const registrySignals = new Set(SEMANTIC_SIGNAL_REGISTRY_V1.map(signal => signal.canonicalId));
    const coreRegistrySignals = new Set(
      REGISTRY_BACKED_UNIVERSAL_SIGNAL_RULES.flatMap(rule => rule.registryCanonicalIds ?? [])
    );

    expect(coreRegistrySignals.size).toBeGreaterThan(0);
    for (const signal of coreRegistrySignals) {
      expect(registrySignals.has(signal)).toBe(true);
    }
    expect(CORE_SUPPLEMENTAL_SIGNAL_RULES
      .map(rule => rule.id)
      .filter(id => !CORE_ONLY_UNIVERSAL_SIGNAL_IDS.has(id))
      .sort()
    ).toEqual([]);
  });

  it('feeds understanding-next signal detection through a registry-backed adapter', () => {
    const registrySignals = new Set(SEMANTIC_SIGNAL_REGISTRY_V1.map(signal => signal.canonicalId));
    const nextRegistrySignals = new Set(
      REGISTRY_BACKED_NEXT_SIGNAL_RULES.flatMap(rule => rule.registryCanonicalIds ?? [])
    );

    expect(nextRegistrySignals.size).toBeGreaterThan(0);
    for (const signal of nextRegistrySignals) {
      expect(registrySignals.has(signal)).toBe(true);
    }
    expect(NEXT_SUPPLEMENTAL_SIGNAL_RULES
      .map(rule => rule.canonicalId)
      .filter(id => !NEXT_ONLY_SIGNAL_IDS.has(id))
      .sort()
    ).toEqual([]);
  });

  it('keeps supported runtime BA domains explicit', () => {
    const supportedDomains = new Set<string>(SUPPORTED_RUNTIME_BA_DOMAINS);
    expect([...supportedDomains]).toEqual([
      'operations',
      'revenue',
      'inventory',
      'customer',
      'performance',
      'finance'
    ]);

    const runtimeDomains = new Set(
      SEMANTIC_SIGNAL_REGISTRY_V1
        .flatMap(signal => signal.domains)
        .filter(domain => domain !== 'core')
    );
    for (const domain of runtimeDomains) {
      expect(supportedDomains.has(domain)).toBe(true);
    }
  });

  it('covers every signal referenced by BA playbooks and domain catalog', () => {
    const registrySignals = new Set(SEMANTIC_SIGNAL_REGISTRY_V1.map(signal => signal.canonicalId));
    const referencedSignals = new Set<string>();

    for (const playbook of DOMAIN_BA_PLAYBOOKS) {
      for (const tier of playbook.signalTiers) tier.signals.forEach(signal => referencedSignals.add(signal));
      for (const question of playbook.supportedQuestions) {
        question.requiredSignals.forEach(signal => referencedSignals.add(signal));
        question.optionalSignals.forEach(signal => referencedSignals.add(signal));
      }
      for (const metric of playbook.metrics) {
        referencedSignals.add(metric.id);
        metric.requiredSignals.forEach(signal => referencedSignals.add(signal));
        metric.optionalSignals.forEach(signal => referencedSignals.add(signal));
      }
      for (const model of playbook.driverModels) {
        model.candidateDimensions.forEach(signal => referencedSignals.add(signal));
        referencedSignals.add(model.primaryMetric);
        model.secondaryMetrics.forEach(signal => referencedSignals.add(signal));
      }
      for (const caveat of playbook.caveatRules) caveat.missingSignals.forEach(signal => referencedSignals.add(signal));
      for (const chart of playbook.chartRules) chart.requiredSignals.forEach(signal => referencedSignals.add(signal));
      for (const evidence of playbook.evidenceRules) evidence.requiredSignals.forEach(signal => referencedSignals.add(signal));
    }

    for (const domain of DOMAIN_KNOWLEDGE_CATALOG_V1) {
      for (const concept of domain.concepts) referencedSignals.add(concept.canonicalSignal);
      for (const intent of domain.intentFamilies) {
        intent.requiredSignals.forEach(signal => referencedSignals.add(signal));
        intent.optionalSignals.forEach(signal => referencedSignals.add(signal));
      }
      for (const view of domain.businessViews) {
        view.requiredSignals.forEach(signal => referencedSignals.add(signal));
        view.optionalSignals.forEach(signal => referencedSignals.add(signal));
      }
    }

    const missingSignals = [...referencedSignals].filter(signal => !registrySignals.has(signal)).sort();
    expect(missingSignals).toEqual([]);
  });
});
