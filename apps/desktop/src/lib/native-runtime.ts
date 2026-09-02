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


export type NativeOsPublisherEvidence = {
  status: 'verified' | 'not_verified' | 'not_applicable' | 'unavailable';
  platform: string;
  signerThumbprint: string | null;
  expectedPublisherConfigured: boolean;
  reason: string;
};

export type NativeInstallationLifecycleReceipt = {
  installationId: string;
  endpoint: string;
  appVersion: string;
  platform: string;
  environment: string;
};

const unavailablePublisherEvidence = (reason: string): NativeOsPublisherEvidence => ({
  status: 'unavailable',
  platform: typeof navigator !== 'undefined' ? navigator.platform || 'unknown' : 'unknown',
  signerThumbprint: null,
  expectedPublisherConfigured: false,
  reason,
});

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


export async function readNativeOsPublisherEvidence(): Promise<NativeOsPublisherEvidence> {
  if (!isNativeLightBI()) {
    return {
      status: 'not_applicable',
      platform: 'web',
      signerThumbprint: null,
      expectedPublisherConfigured: false,
      reason: 'native_publisher_verification_not_applicable',
    };
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const evidence = await invoke<NativeOsPublisherEvidence>('os_publisher_evidence');
    if (!evidence || !['verified', 'not_verified', 'not_applicable', 'unavailable'].includes(evidence.status)) {
      return unavailablePublisherEvidence('native_publisher_evidence_invalid');
    }
    return evidence;
  } catch {
    return unavailablePublisherEvidence('native_publisher_evidence_unavailable');
  }
}

export async function persistNativeInstallationLifecycleReceipt(receipt: NativeInstallationLifecycleReceipt): Promise<boolean> {
  if (!isNativeLightBI()) return false;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<boolean>('store_installation_lifecycle_receipt', { receipt });
  } catch {
    return false;
  }
}

export async function clearNativeInstallationLifecycleReceipt(): Promise<boolean> {
  if (!isNativeLightBI()) return false;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<boolean>('clear_installation_lifecycle_receipt');
  } catch {
    return false;
  }
}
