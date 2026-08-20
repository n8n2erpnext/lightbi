import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEMANTIC_SIGNAL_REGISTRY_V1 } from '../apps/desktop/src/lib/semantic-registry.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

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

function collisions(field: 'aliases' | 'headerAliases') {
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

const aliasCollisions = collisions('aliases');
const headerCollisions = collisions('headerAliases');
const inventoryPath = path.join(root, 'docs/architecture/phase-0-semantic-registry-inventory.json');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const countBy = (field: 'coverageStatus' | 'domain', value: string) =>
  SEMANTIC_SIGNAL_REGISTRY_V1.filter(signal => signal[field] === value).length;

inventory.generatedOn = '2026-08-20';
inventory.policy = 'Registry inventory regenerated after a metadata-only cross-domain schema audit; dataset names and observed values are excluded from recognition rules, and runtime authority remains governed by supported domain policies.';
inventory.signalCount = SEMANTIC_SIGNAL_REGISTRY_V1.length;
inventory.coverageStatusCounts = {
  supported: countBy('coverageStatus', 'supported'),
  partial: countBy('coverageStatus', 'partial'),
  advertised_only: countBy('coverageStatus', 'advertised_only')
};
inventory.phase0RecognitionStatusCounts = {
  mvp_proven: 0,
  experimental: inventory.coverageStatusCounts.supported,
  research_only: inventory.coverageStatusCounts.partial + inventory.coverageStatusCounts.advertised_only
};
inventory.primaryDomainCounts = Object.fromEntries(
  [...new Set(SEMANTIC_SIGNAL_REGISTRY_V1.map(signal => signal.domain))]
    .sort()
    .map(domain => [domain, countBy('domain', domain)])
);
inventory.collisionCounts = { aliases: aliasCollisions.length, headerAliases: headerCollisions.length };
inventory.normalizedAliasCollisions = aliasCollisions;
inventory.normalizedHeaderAliasCollisions = headerCollisions;
fs.writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);

const adversarialPath = path.join(root, 'sample-corpus/ground-truth/adversarial-dirty.json');
const adversarial = JSON.parse(fs.readFileSync(adversarialPath, 'utf8'));
const combined = new Map<string, { signals: Set<string>; surfaces: Set<string> }>();
for (const [surface, list] of [['aliases', aliasCollisions], ['headerAliases', headerCollisions]] as const) {
  for (const collision of list) {
    const entry = combined.get(collision.normalizedAlias) ?? { signals: new Set<string>(), surfaces: new Set<string>() };
    collision.canonicalIds.forEach(id => entry.signals.add(id));
    entry.surfaces.add(surface);
    combined.set(collision.normalizedAlias, entry);
  }
}
adversarial.aliasCollisionCases = [...combined.entries()]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([normalizedAlias, entry], index) => ({
    id: `collision.${String(index + 1).padStart(3, '0')}.${normalizedAlias.replace(/[^a-z0-9]+/g, '_')}`,
    inputHeader: normalizedAlias,
    normalizedAlias,
    registrySurfaces: [...entry.surfaces].sort(),
    candidateSignals: [...entry.signals].sort(),
    headerOnly: {
      expectedState: 'ambiguous',
      forbiddenFinalStates: ['probable', 'confirmed'],
      reasonCode: 'normalized_alias_collision'
    },
    contextualResolution: {
      policy: 'may_resolve_with_context',
      allowedFinalStates: ['ambiguous', 'probable', 'confirmed'],
      requiredEvidence: ['compatible_value_or_type', 'sibling_or_source_context', 'score_margin_or_user_mapping'],
      forbiddenEvidence: ['header_only']
    }
  }));
fs.writeFileSync(adversarialPath, `${JSON.stringify(adversarial, null, 2)}\n`);
