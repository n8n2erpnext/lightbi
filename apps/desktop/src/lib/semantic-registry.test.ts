import { describe, expect, it } from 'vitest';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
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
import { DOMAIN_SUPPORT_MANIFEST } from './understanding-core/domain-support-manifest';

type CorpusSource = {
  path: string;
  required: boolean;
  sha256: string;
};

type CorpusSample = {
  id: string;
  corpusVersion: string;
  group: 'golden' | 'holdout' | 'adversarial' | 'multi_file';
  category: string;
  provenance: {
    kind: string;
    sourceSystem: string;
    tuningUse: 'allowed' | 'forbidden';
    dataHandling: string;
    notes: string;
  };
  sources: CorpusSource[];
  dataset: {
    expectedArchetype: string;
    expectedGrain: string;
    grainTruth: {
      coarseGrain: string;
      rowEntity: string;
      parentEntity: string | null;
      candidateKeys: string[][];
      parentKeys: string[][];
      measureExpectations: Array<{
        physicalColumn: string;
        repeatedWithinParent: boolean;
        additiveAcrossRows: boolean;
        reasonCode: string;
      }>;
    };
  };
  recognition: {
    requiredMappings: Array<{ physicalColumn: string; canonicalSignal: string; allowedFinalStates: string[] }>;
    forbiddenMappings: Array<{ physicalColumn: string; canonicalSignal: string; reasonCode: string }>;
    expectedAmbiguousMappings: Array<{
      physicalColumn: string;
      candidateSignals: string[];
      evidenceScope: 'header_only';
      headerOnlyExpectedState: 'ambiguous';
      reasonCode: string;
      contextualResolution: {
        policy: 'may_resolve_with_context';
        resolvedCanonicalSignal: string | null;
        allowedFinalStates: string[];
        requiredEvidence: string[];
        forbiddenEvidence: string[];
      };
    }>;
    expectedUnknownBusinessColumns: string[];
  };
  profilingExpectations: {
    sourceProfiles: Array<{
      sourcePath: string;
      sheet: string;
      headerPosition: { zeroBasedRowIndex: number; basis: string };
      verifiedRowCount: number;
    }>;
    verifiedRowCount: number | null;
    columnPhysicalTypes: Array<{
      physicalColumn: string;
      sourcePaths: string[];
      allowedTypes: string[];
      allowedParseExpectations: string[];
    }>;
    issues: {
      expected: Array<{ code: string; physicalColumn: string | null }>;
      allowed: Array<{ code: string; physicalColumn: string | null }>;
      forbidden: Array<{ code: string; physicalColumn: string | null }>;
    };
    representativeEvidence: {
      requiredSamplingRegions: string[];
      minimumDistinctRegions: number;
      requiredColumns: string[];
      mustPreservePhysicalColumnNames: boolean;
      mustReportUnparsedValues: boolean;
    };
  };
  relationshipTruth?: {
    expectedRelationships: Array<{
      id: string;
      expectedCardinality: string;
      joinReasonCode: string;
      timePeriodAlignment: string;
      duplicationRisk: { level: string; reasonCode: string };
    }>;
    forbiddenRelationships: Array<{ id: string; refusalReasonCode: string }>;
    timeAlignment: { expected: string; periods: string[]; reasonCode: string };
    duplicationRisk: { level: string; reasonCode: string };
  };
  support: {
    allowedDomainPacks: string[];
    blockedDomainPacks: string[];
    expectedExecutableActions: string[];
    expectedBlockedActions: Array<{ actionId: string; reasonCode: string }>;
  };
  verifiedMetricAnswers: Record<string, number | string>;
};

type GroundTruthDocument = {
  schemaVersion: string;
  corpusVersion: string;
  category: string;
  samples: CorpusSample[];
  aliasCollisionCases?: Array<{
    id: string;
    normalizedAlias: string;
    candidateSignals: string[];
    headerOnly: {
      expectedState: string;
      forbiddenFinalStates: string[];
      reasonCode: string;
    };
    contextualResolution: {
      policy: string;
      allowedFinalStates: string[];
      requiredEvidence: string[];
      forbiddenEvidence: string[];
    };
  }>;
};

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const CORPUS_ROOT = path.join(REPO_ROOT, 'sample-corpus');

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function loadCorpus() {
  const manifest = readJson<{
    schemaVersion: string;
    corpusVersion: string;
    requiredInCI: boolean;
    canonicalFutureRunner: string;
    groundTruthFiles: Array<{ path: string; category: string; required: boolean; sampleCount: number }>;
    minimumCoverage: Record<string, number>;
    groups: Record<string, { tuningAllowed: boolean }>;
    tuningPolicy: {
      allowedGroups: string[];
      forbiddenGroups: string[];
      groupPolicyMustMatchSampleProvenance: boolean;
    };
    verifiedMetricTruth: {
      algorithm: string;
      canonicalization: string;
      digest: string;
      changedInPhase1B: boolean;
    };
    supportTruth: {
      domainSupportManifestMustRemainEmpty: boolean;
      mvpProvenClaimsAllowed: boolean;
      recognitionDoesNotImplyDomainSupport: boolean;
    };
  }>(path.join(CORPUS_ROOT, 'manifest.json'));
  const documents = manifest.groundTruthFiles.map(entry =>
    readJson<GroundTruthDocument>(path.join(REPO_ROOT, entry.path))
  );
  return { manifest, documents, samples: documents.flatMap(document => document.samples) };
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function normalizeAlias(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function registryCollisions(field: 'aliases' | 'headerAliases') {
  const byAlias = new Map<string, Set<string>>();
  for (const signal of SEMANTIC_SIGNAL_REGISTRY_V1) {
    for (const alias of signal[field]) {
      const normalized = normalizeAlias(alias);
      const ids = byAlias.get(normalized) ?? new Set<string>();
      ids.add(signal.canonicalId);
      byAlias.set(normalized, ids);
    }
  }
  return [...byAlias.entries()]
    .filter(([, ids]) => ids.size > 1)
    .map(([normalizedAlias, ids]) => ({ normalizedAlias, canonicalIds: [...ids].sort() }))
    .sort((left, right) => left.normalizedAlias.localeCompare(right.normalizedAlias));
}

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

describe('Phase 1 acceptance corpus infrastructure', () => {
  it('loads all required ground-truth documents and enforces category minimums', () => {
    const { manifest, documents, samples } = loadCorpus();

    expect(manifest.schemaVersion).toBe('lightbi.acceptance-corpus.v1.1');
    expect(manifest.requiredInCI).toBe(true);
    expect(manifest.canonicalFutureRunner).toBe('understanding-core');
    expect(documents).toHaveLength(6);
    expect(samples).toHaveLength(30);

    const counts = new Map<string, number>();
    for (const sample of samples) counts.set(sample.category, (counts.get(sample.category) ?? 0) + 1);
    for (const [category, minimum] of Object.entries(manifest.minimumCoverage)) {
      if (category === 'minimumHoldoutShareOfDomainValidation') continue;
      expect(counts.get(category), `Corpus category ${category} is below its required minimum`).toBeGreaterThanOrEqual(minimum);
    }
  });

  it('gives every sample a stable ID, provenance, complete truth sections, and positive/negative assertions', () => {
    const { manifest, samples } = loadCorpus();
    const ids = samples.map(sample => sample.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const sample of samples) {
      expect(sample.corpusVersion).toBe(manifest.corpusVersion);
      expect(sample.id).toMatch(/^[a-z0-9_.-]+$/);
      expect(sample.provenance.kind.length).toBeGreaterThan(0);
      expect(sample.provenance.sourceSystem.length).toBeGreaterThan(0);
      expect(sample.provenance.dataHandling.length).toBeGreaterThan(0);
      expect(sample.sources.length).toBeGreaterThan(0);
      expect(sample.dataset.expectedArchetype.length).toBeGreaterThan(0);
      expect(['transaction', 'event', 'snapshot', 'master_data', 'summary', 'unknown']).toContain(sample.dataset.expectedGrain);
      expect(sample.dataset.grainTruth.coarseGrain).toBe(sample.dataset.expectedGrain);
      expect(sample.dataset.grainTruth.rowEntity.length).toBeGreaterThan(0);
      expect(Array.isArray(sample.dataset.grainTruth.candidateKeys)).toBe(true);
      expect(Array.isArray(sample.dataset.grainTruth.parentKeys)).toBe(true);
      expect(Array.isArray(sample.dataset.grainTruth.measureExpectations)).toBe(true);
      expect(sample.recognition.requiredMappings.length).toBeGreaterThan(0);
      expect(sample.recognition.forbiddenMappings.length).toBeGreaterThan(0);
      expect(Array.isArray(sample.recognition.expectedAmbiguousMappings)).toBe(true);
      expect(Array.isArray(sample.recognition.expectedUnknownBusinessColumns)).toBe(true);
      expect(Array.isArray(sample.support.allowedDomainPacks)).toBe(true);
      expect(sample.support.blockedDomainPacks.length).toBeGreaterThan(0);
      expect(Array.isArray(sample.support.expectedExecutableActions)).toBe(true);
      expect(sample.support.expectedBlockedActions.length).toBeGreaterThan(0);
      expect(sample.verifiedMetricAnswers).toBeTypeOf('object');
      expect(sample.profilingExpectations.sourceProfiles).toHaveLength(sample.sources.length);
    }
  });

  it('fails explicitly when required sample files are missing or provenance hashes drift', () => {
    const { samples } = loadCorpus();
    const requiredSources = new Map<string, CorpusSource>();
    for (const sample of samples) {
      for (const source of sample.sources) {
        if (source.required) requiredSources.set(source.path, source);
      }
    }

    const missing = [...requiredSources.values()]
      .filter(source => !fs.existsSync(path.join(REPO_ROOT, source.path)))
      .map(source => source.path);
    expect(missing, `Required corpus samples are missing: ${missing.join(', ')}`).toEqual([]);

    const changed = [...requiredSources.values()]
      .filter(source => fs.existsSync(path.join(REPO_ROOT, source.path)))
      .filter(source => sha256(path.join(REPO_ROOT, source.path)) !== source.sha256)
      .map(source => source.path);
    expect(changed, `Required corpus sample provenance changed: ${changed.join(', ')}`).toEqual([]);
  });

  it('keeps at least half of domain validation files held out from tuning', () => {
    const { manifest, samples } = loadCorpus();
    const domainSamples = samples.filter(sample =>
      ['revenue_sales', 'inventory', 'operations_delivery', 'finance_accounting'].includes(sample.category)
    );
    const heldOut = domainSamples.filter(sample => sample.group === 'holdout');

    expect(domainSamples).toHaveLength(20);
    expect(heldOut.length / domainSamples.length).toBeGreaterThanOrEqual(0.5);
    expect(heldOut.every(sample => sample.provenance.tuningUse === 'forbidden')).toBe(true);

    expect(manifest.tuningPolicy.allowedGroups).toEqual(['golden']);
    expect(manifest.tuningPolicy.forbiddenGroups).toEqual(['holdout', 'adversarial', 'multi_file']);
    expect(manifest.tuningPolicy.groupPolicyMustMatchSampleProvenance).toBe(true);
    for (const sample of samples) {
      const groupAllowsTuning = manifest.groups[sample.group].tuningAllowed;
      expect(
        sample.provenance.tuningUse,
        `${sample.id}: provenance tuning policy must agree with group ${sample.group}`
      ).toBe(groupAllowsTuning ? 'allowed' : 'forbidden');
    }
    expect(
      samples
        .filter(sample => ['adversarial', 'multi_file'].includes(sample.group))
        .every(sample => sample.provenance.tuningUse === 'forbidden')
    ).toBe(true);
  });

  it('uses explicit final mapping states and has no contradictory mapping expectations', () => {
    const { samples } = loadCorpus();

    for (const sample of samples) {
      expect(JSON.stringify(sample.recognition)).not.toContain('minimumState');
      const requiredPairs = new Set(
        sample.recognition.requiredMappings.map(mapping =>
          `${normalizeAlias(mapping.physicalColumn)}|${mapping.canonicalSignal}`
        )
      );
      const forbiddenPairs = new Set(
        sample.recognition.forbiddenMappings.map(mapping =>
          `${normalizeAlias(mapping.physicalColumn)}|${mapping.canonicalSignal}`
        )
      );

      for (const mapping of sample.recognition.requiredMappings) {
        expect(mapping.allowedFinalStates.length).toBeGreaterThan(0);
        expect(mapping.allowedFinalStates.every(state => ['probable', 'confirmed'].includes(state))).toBe(true);
      }
      for (const pair of requiredPairs) {
        expect(forbiddenPairs.has(pair), `${sample.id}: mapping pair is both required and forbidden: ${pair}`).toBe(false);
      }

      for (const ambiguity of sample.recognition.expectedAmbiguousMappings) {
        expect(ambiguity.evidenceScope).toBe('header_only');
        expect(ambiguity.headerOnlyExpectedState).toBe('ambiguous');
        expect(ambiguity.contextualResolution.policy).toBe('may_resolve_with_context');
        expect(ambiguity.contextualResolution.forbiddenEvidence).toContain('header_only');

        const required = sample.recognition.requiredMappings.find(
          mapping => normalizeAlias(mapping.physicalColumn) === normalizeAlias(ambiguity.physicalColumn)
        );
        if (required) {
          expect(ambiguity.contextualResolution.resolvedCanonicalSignal).toBe(required.canonicalSignal);
          expect(ambiguity.contextualResolution.allowedFinalStates).not.toContain('ambiguous');
        }
        for (const forbidden of sample.recognition.forbiddenMappings.filter(
          mapping => normalizeAlias(mapping.physicalColumn) === normalizeAlias(ambiguity.physicalColumn)
        )) {
          expect(ambiguity.candidateSignals).not.toContain(forbidden.canonicalSignal);
        }
      }
    }
  });

  it('provides Phase 2 profiling and representative-evidence truth for all cases', () => {
    const { samples } = loadCorpus();

    for (const sample of samples) {
      const profile = sample.profilingExpectations;
      expect(profile.sourceProfiles).toHaveLength(sample.sources.length);
      for (const sourceProfile of profile.sourceProfiles) {
        expect(sourceProfile.headerPosition.zeroBasedRowIndex).toBeGreaterThanOrEqual(0);
        expect(sourceProfile.verifiedRowCount).toBeGreaterThan(0);
      }
      expect(profile.columnPhysicalTypes.length).toBeGreaterThan(0);
      for (const column of profile.columnPhysicalTypes) {
        expect(column.allowedTypes.length).toBeGreaterThan(0);
        expect(column.allowedParseExpectations.length).toBeGreaterThan(0);
      }
      expect(profile.issues.forbidden.map(issue => issue.code)).toContain('silent_parse_drop');
      expect(profile.representativeEvidence.requiredSamplingRegions.length).toBeGreaterThan(0);
      expect(profile.representativeEvidence.minimumDistinctRegions).toBeGreaterThan(0);
      expect(profile.representativeEvidence.requiredColumns.length).toBeGreaterThan(0);
      expect(profile.representativeEvidence.mustPreservePhysicalColumnNames).toBe(true);
      expect(profile.representativeEvidence.mustReportUnparsedValues).toBe(true);
      expect(profile.verifiedRowCount).toBe(sample.sources.length === 1 ? profile.sourceProfiles[0].verifiedRowCount : null);
    }
  });

  it('requires explicit relationship and refusal truth for every multi-file case', () => {
    const { samples } = loadCorpus();
    const multiFileSamples = samples.filter(sample => sample.group === 'multi_file');
    expect(multiFileSamples).toHaveLength(5);

    for (const sample of multiFileSamples) {
      const truth = sample.relationshipTruth;
      expect(truth, `${sample.id}: relationship truth is required`).toBeDefined();
      expect(truth?.expectedRelationships.length).toBeGreaterThan(0);
      expect(truth?.forbiddenRelationships.length).toBeGreaterThan(0);
      for (const relationship of truth?.expectedRelationships ?? []) {
        expect(relationship.expectedCardinality.length).toBeGreaterThan(0);
        expect(relationship.joinReasonCode.length).toBeGreaterThan(0);
        expect(relationship.timePeriodAlignment.length).toBeGreaterThan(0);
        expect(relationship.duplicationRisk.level.length).toBeGreaterThan(0);
        expect(relationship.duplicationRisk.reasonCode.length).toBeGreaterThan(0);
      }
      for (const relationship of truth?.forbiddenRelationships ?? []) {
        expect(relationship.refusalReasonCode.length).toBeGreaterThan(0);
      }
      expect(truth?.timeAlignment.expected.length).toBeGreaterThan(0);
      expect(truth?.timeAlignment.reasonCode.length).toBeGreaterThan(0);
      expect(truth?.duplicationRisk.reasonCode.length).toBeGreaterThan(0);
    }
  });

  it('keeps verified metric ground truth byte-stable through Phase 1B', () => {
    const { manifest, samples } = loadCorpus();
    const canonicalMetricTruth = samples
      .map(sample => ({ id: sample.id, verifiedMetricAnswers: sample.verifiedMetricAnswers }))
      .sort((left, right) => left.id.localeCompare(right.id));
    const digest = crypto.createHash('sha256').update(JSON.stringify(canonicalMetricTruth)).digest('hex');

    expect(manifest.verifiedMetricTruth.algorithm).toBe('sha256');
    expect(manifest.verifiedMetricTruth.changedInPhase1B).toBe(false);
    expect(digest).toBe(manifest.verifiedMetricTruth.digest);
  });

  it('keeps recognition truth separate from domain support truth', () => {
    const { manifest, samples } = loadCorpus();
    const registryIds = new Set(SEMANTIC_SIGNAL_REGISTRY_V1.map(signal => signal.canonicalId));

    expect(manifest.supportTruth.recognitionDoesNotImplyDomainSupport).toBe(true);
    expect(manifest.supportTruth.domainSupportManifestMustRemainEmpty).toBe(true);
    expect(manifest.supportTruth.mvpProvenClaimsAllowed).toBe(false);
    expect(DOMAIN_SUPPORT_MANIFEST).toEqual([]);

    for (const sample of samples) {
      for (const mapping of sample.recognition.requiredMappings) {
        expect(registryIds.has(mapping.canonicalSignal), `${sample.id}: unknown required signal ${mapping.canonicalSignal}`).toBe(true);
        expect(mapping.allowedFinalStates.length).toBeGreaterThan(0);
      }
      for (const mapping of sample.recognition.forbiddenMappings) {
        expect(registryIds.has(mapping.canonicalSignal), `${sample.id}: unknown forbidden signal ${mapping.canonicalSignal}`).toBe(true);
      }
      for (const mapping of sample.recognition.expectedAmbiguousMappings) {
        expect(mapping.headerOnlyExpectedState).toBe('ambiguous');
        expect(mapping.candidateSignals.length).toBeGreaterThan(1);
        for (const signal of mapping.candidateSignals) {
          expect(registryIds.has(signal), `${sample.id}: unknown ambiguity candidate ${signal}`).toBe(true);
        }
      }
    }

    const adversarial = samples.filter(sample => sample.group === 'adversarial');
    expect(adversarial.every(sample => sample.support.allowedDomainPacks.length === 0)).toBe(true);
    expect(JSON.stringify(samples)).not.toContain('mvp_proven');
  });

  it('turns every current normalized alias collision into a testable ambiguity case', () => {
    const { documents } = loadCorpus();
    const adversarial = documents.find(document => document.category === 'adversarial_dirty');
    const cases = adversarial?.aliasCollisionCases ?? [];
    const byAlias = new Map(cases.map(item => [item.normalizedAlias, item]));

    const expected = new Map<string, Set<string>>();
    for (const collision of [...registryCollisions('aliases'), ...registryCollisions('headerAliases')]) {
      const signals = expected.get(collision.normalizedAlias) ?? new Set<string>();
      collision.canonicalIds.forEach(signal => signals.add(signal));
      expected.set(collision.normalizedAlias, signals);
    }

    expect(cases).toHaveLength(expected.size);
    for (const [normalizedAlias, signals] of expected) {
      const collisionCase = byAlias.get(normalizedAlias);
      expect(collisionCase, `Missing ambiguity case for normalized alias: ${normalizedAlias}`).toBeDefined();
      expect(collisionCase?.headerOnly.expectedState).toBe('ambiguous');
      expect(collisionCase?.headerOnly.forbiddenFinalStates).toEqual(['probable', 'confirmed']);
      expect(collisionCase?.contextualResolution.policy).toBe('may_resolve_with_context');
      expect(collisionCase?.contextualResolution.allowedFinalStates).toEqual(['ambiguous', 'probable', 'confirmed']);
      expect(collisionCase?.contextualResolution.forbiddenEvidence).toContain('header_only');
      expect(new Set(collisionCase?.candidateSignals)).toEqual(signals);
    }
  });

  it('keeps the Phase 0 collision inventory reproducible from the current registry', () => {
    const inventory = readJson<{
      signalCount: number;
      coverageStatusCounts: Record<string, number>;
      normalizedAliasCollisions: Array<{ normalizedAlias: string; canonicalIds: string[] }>;
      normalizedHeaderAliasCollisions: Array<{ normalizedAlias: string; canonicalIds: string[] }>;
    }>(path.join(REPO_ROOT, 'docs/architecture/phase-0-semantic-registry-inventory.json'));

    expect(SEMANTIC_SIGNAL_REGISTRY_V1).toHaveLength(inventory.signalCount);
    expect(registryCollisions('aliases')).toEqual(inventory.normalizedAliasCollisions);
    expect(registryCollisions('headerAliases')).toEqual(inventory.normalizedHeaderAliasCollisions);
    expect(SEMANTIC_SIGNAL_REGISTRY_V1.filter(signal => signal.coverageStatus === 'supported')).toHaveLength(inventory.coverageStatusCounts.supported);
    expect(SEMANTIC_SIGNAL_REGISTRY_V1.filter(signal => signal.coverageStatus === 'partial')).toHaveLength(inventory.coverageStatusCounts.partial);
    expect(SEMANTIC_SIGNAL_REGISTRY_V1.filter(signal => signal.coverageStatus === 'advertised_only')).toHaveLength(inventory.coverageStatusCounts.advertised_only);
  });
});
