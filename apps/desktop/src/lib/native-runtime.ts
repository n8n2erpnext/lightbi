export type NativeRuntimeConfig = {
  apiBaseUrl: string;
  productChannel: 'beta';
  native: boolean;
};

export type NativeLicenseState = {
  edition: string;
  status: 'beta_unrestricted';
  keyRequired: boolean;
  featureRestrictions: string[];
};

export const isNativeLightBI = () =>
  typeof window !== 'undefined' && (
    '__TAURI_INTERNALS__' in window
    || window.location.protocol === 'tauri:'
    || window.location.hostname === 'tauri.localhost'
  );

export async function readNativeRuntime(): Promise<{
  runtime: NativeRuntimeConfig;
  license: NativeLicenseState;
  backendReady: boolean;
}> {
  if (!isNativeLightBI()) {
    return {
      runtime: { apiBaseUrl: window.location.origin, productChannel: 'beta', native: false },
      license: {
        edition: 'LightBI Beta QA',
        status: 'beta_unrestricted',
        keyRequired: false,
        featureRestrictions: [],
      },
      backendReady: true,
    };
  }
  const { invoke } = await import('@tauri-apps/api/core');
  const [runtime, license, backendReady] = await Promise.all([
    invoke<NativeRuntimeConfig>('runtime_config'),
    invoke<NativeLicenseState>('license_state'),
    invoke<boolean>('backend_status'),
  ]);
  return { runtime, license, backendReady };
}
