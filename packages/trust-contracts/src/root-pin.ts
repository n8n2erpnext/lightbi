export const LIGHTBI_ROOT_PIN_V1 = { schema: 1, kid: 'root-2026-01', algorithm: 'Ed25519', public_key: null, status: 'unconfigured' } as const;
export function requireConfiguredRootPin() { if (!LIGHTBI_ROOT_PIN_V1.public_key) throw new Error('lightbi_root_public_key_not_configured'); return LIGHTBI_ROOT_PIN_V1; }
