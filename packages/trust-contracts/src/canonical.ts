import { createHash } from 'node:crypto';
const encoder = new TextEncoder();
function normalize(value: unknown, key?: string): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') { if (!Number.isSafeInteger(value)) throw new Error('canonical_numbers_must_be_safe_integers'); return value; }
  if (Array.isArray(value)) { const items=value.map((item)=>normalize(item)); if(key==='capabilities')return [...items].sort(); if(key==='keys')return [...items].sort((a,b)=>String((a as {kid?:string}).kid).localeCompare(String((b as {kid?:string}).kid))); return items; }
  if (typeof value === 'object') { const entries=Object.entries(value as Record<string,unknown>); if(entries.some(([,item])=>item===undefined))throw new Error('canonical_undefined_is_invalid'); return Object.fromEntries(entries.sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,normalize(v,k)])); }
  throw new Error('unsupported_canonical_value');
}
export function canonicalizeSignedPayload(payload: unknown): Uint8Array { return encoder.encode(JSON.stringify(normalize(payload))); }
export function canonicalText(payload: unknown): string { return new TextDecoder().decode(canonicalizeSignedPayload(payload)); }
export function sha256Hex(bytes: Uint8Array): string { return createHash('sha256').update(bytes).digest('hex'); }
