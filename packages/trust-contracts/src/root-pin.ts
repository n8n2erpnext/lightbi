import { ed25519PublicKeySchema } from './schemas.js';
import type { RootPinV1 } from './types.js';

export const LIGHTBI_ROOT_PIN_V1: RootPinV1 = { schema: 1, kid: 'root-2026-01', algorithm: 'Ed25519', public_key: null, status: 'unconfigured', minimum_keyset_version: 1 };

export function requireConfiguredRootPin(pin: RootPinV1 = LIGHTBI_ROOT_PIN_V1): RootPinV1 & { public_key: string; status: 'configured' } {
  if (pin.schema !== 1 || pin.algorithm !== 'Ed25519' || pin.status !== 'configured' || !pin.public_key) throw new Error('lightbi_root_public_key_not_configured');
  ed25519PublicKeySchema.parse(pin.public_key);
  if (!Number.isSafeInteger(pin.minimum_keyset_version) || pin.minimum_keyset_version < 1) throw new Error('invalid_root_minimum_keyset_version');
  return pin as RootPinV1 & { public_key: string; status: 'configured' };
}
