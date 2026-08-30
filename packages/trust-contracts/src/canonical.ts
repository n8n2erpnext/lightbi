import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

function utf8Compare(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

function isExactPath(path: readonly string[], expected: readonly string[]): boolean {
  return path.length === expected.length && path.every((part, index) => part === expected[index]);
}

function normalize(value: unknown, path: readonly string[] = []): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || Math.abs(value) > MAX_SAFE_INTEGER) throw new Error('canonical_numbers_must_be_safe_integers');
    return value;
  }
  if (Array.isArray(value)) {
    const items = value.map((item) => normalize(item, [...path, '[]']));
    if (isExactPath(path, ['capabilities'])) {
      if (!items.every((item) => typeof item === 'string')) throw new Error('canonical_capabilities_must_be_strings');
      return [...items].sort((a, b) => utf8Compare(a as string, b as string));
    }
    if (isExactPath(path, ['keys'])) {
      if (!items.every((item) => item && typeof item === 'object' && typeof (item as { kid?: unknown }).kid === 'string')) throw new Error('canonical_keys_require_kid');
      return [...items].sort((a, b) => utf8Compare((a as { kid: string }).kid, (b as { kid: string }).kid));
    }
    return items;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.some(([, item]) => item === undefined)) throw new Error('canonical_undefined_is_invalid');
    entries.sort(([left], [right]) => utf8Compare(left, right));
    return Object.fromEntries(entries.map(([key, item]) => [key, normalize(item, [...path, key])]));
  }
  throw new Error('unsupported_canonical_value');
}

export function canonicalizeSignedPayload(payload: unknown): Uint8Array { return encoder.encode(JSON.stringify(normalize(payload))); }
export function canonicalText(payload: unknown): string { return decoder.decode(canonicalizeSignedPayload(payload)); }
export function sha256Hex(bytes: Uint8Array): string { return createHash('sha256').update(bytes).digest('hex'); }
