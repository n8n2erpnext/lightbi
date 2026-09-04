import { describe, expect, it } from 'vitest';
import { getBuiltInMicroBrainIndex } from './understanding-core/micro-brain/built-in-index';
import { validateIntelligencePackPayload } from './intelligence-pack-runtime';

function cloneBundled() {
  return structuredClone(getBuiltInMicroBrainIndex());
}

describe('Intelligence Pack frontend validation', () => {
  it('accepts the current compiled Micro Brain index as data-only pack payload', () => {
    const result = validateIntelligencePackPayload(JSON.stringify(cloneBundled()));
    expect(result.valid).toBe(true);
    expect(result.index?.manifest.schemaVersion).toBe('lightbi.micro-brain.index.v1');
  });

  it('rejects structural tamper and canonical bridges outside the current registry', () => {
    const structurallyInvalid = cloneBundled();
    structurallyInvalid.manifest.cardCount += 1;
    expect(validateIntelligencePackPayload(JSON.stringify(structurallyInvalid)).errors).toContain('card_count_mismatch');

    const unknownBridge = cloneBundled();
    unknownBridge.cards[0]!.canonicalSignal = 'pack_cannot_create_new_canonical_authority';
    expect(validateIntelligencePackPayload(JSON.stringify(unknownBridge)).errors).toContain('canonical_bridge_not_in_registry');
  });
});
