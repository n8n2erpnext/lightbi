import { isNativeLightBI } from './native-runtime';

export type SaveFileDialogOptions = {
  suggestedName: string;
  description?: string;
  extensions?: string[];
};

export type SavedFileResult = {
  fileName: string;
  locationLabel: string;
  usedSaveAs: boolean;
  cancelled: boolean;
};

type NativeHttpResponse = {
  status: number;
  headers: Record<string, string>;
  body: number[];
};

type NativeSavedFile = {
  fileName: string;
  path: string;
};

type SaveFileHandle = {
  name: string;
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

type SavePickerWindow = Window & {
  showSaveFilePicker?: (options: Record<string, unknown>) => Promise<SaveFileHandle>;
};

async function bodyBytes(body: BodyInit | null | undefined): Promise<number[] | undefined> {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string') return Array.from(new TextEncoder().encode(body));
  if (body instanceof URLSearchParams) return Array.from(new TextEncoder().encode(body.toString()));
  if (body instanceof Blob) return Array.from(new Uint8Array(await body.arrayBuffer()));
  if (body instanceof ArrayBuffer) return Array.from(new Uint8Array(body));
  if (ArrayBuffer.isView(body)) return Array.from(new Uint8Array(body.buffer, body.byteOffset, body.byteLength));
  throw new Error('This native HTTP request body type is not supported.');
}

/**
 * Same-origin Core traffic stays inside the WebView. External internet traffic
 * crosses the Tauri shell in packaged LightBI so browser CORS/origin policy
 * cannot silently break account, update, telemetry, or remote-source flows.
 */
function failureMessage(cause: unknown, fallback: string): string {
  if (cause instanceof Error && cause.message.trim()) return cause.message.trim();
  if (typeof cause === 'string' && cause.trim()) return cause.trim();
  try {
    const serialized = JSON.stringify(cause);
    if (serialized && serialized !== '{}') return serialized;
  } catch {
    // Fall through to the stable fallback.
  }
  return fallback;
}

export async function externalFetch(input: string | URL, init: RequestInit = {}): Promise<Response> {
  const url = typeof input === 'string' ? input : input.toString();
  if (!isNativeLightBI() || !/^https?:\/\//i.test(url)) return fetch(url, init);

  const method = (init.method || 'GET').toUpperCase();
  const idempotentRead = method === 'GET' || method === 'HEAD';
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    const response = await invoke<NativeHttpResponse>('native_http_request', {
      request: {
        url,
        method,
        headers,
        body: await bodyBytes(init.body),
      },
    });
    const nativeResponse = new Response(new Uint8Array(response.body), {
      status: response.status,
      headers: response.headers,
    });
    if (nativeResponse.ok || !idempotentRead) return nativeResponse;

    // Some Windows proxy/VPN stacks return an HTTP error instead of throwing.
    // For read-only traffic it is safe to retry through WebView2, whose network
    // stack can still have valid access to the same HTTPS endpoint.
    try {
      const webviewResponse = await fetch(url, init);
      return webviewResponse.ok ? webviewResponse : nativeResponse;
    } catch {
      return nativeResponse;
    }
  } catch (nativeCause) {
    if (!idempotentRead) {
      throw new Error(`Native HTTP failed: ${failureMessage(nativeCause, 'unknown native transport error')}`);
    }
    try {
      return await fetch(url, init);
    } catch (webviewCause) {
      throw new Error(
        `Native HTTP failed: ${failureMessage(nativeCause, 'unknown native transport error')}; ` +
        `WebView fallback failed: ${failureMessage(webviewCause, 'unknown WebView transport error')}`,
      );
    }
  }
}

/**
 * One save contract for both products:
 * - native: OS Save As + native filesystem write;
 * - Chromium web: File System Access Save As when available;
 * - older browsers: standard download fallback.
 * Cancelling a Save As is a real cancellation and never falls through to a download.
 */
export async function saveBlobWithUserChoice(blob: Blob, options: SaveFileDialogOptions): Promise<SavedFileResult> {
  const extensions = (options.extensions || []).map(value => value.replace(/^\./, '')).filter(Boolean);
  const description = options.description || 'LightBI export';

  if (isNativeLightBI()) {
    const { invoke } = await import('@tauri-apps/api/core');
    const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
    const saved = await invoke<NativeSavedFile | null>('save_export_file', {
      request: { suggestedName: options.suggestedName, description, extensions, bytes },
    });
    if (!saved) return { fileName: options.suggestedName, locationLabel: '', usedSaveAs: true, cancelled: true };
    return { fileName: saved.fileName, locationLabel: saved.path, usedSaveAs: true, cancelled: false };
  }

  const picker = (window as SavePickerWindow).showSaveFilePicker;
  if (picker) {
    try {
      const dotExtensions = extensions.map(extension => `.${extension}`);
      const handle = await picker({
        suggestedName: options.suggestedName,
        types: dotExtensions.length > 0
          ? [{ description, accept: { [blob.type || 'application/octet-stream']: dotExtensions } }]
          : undefined,
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { fileName: handle.name, locationLabel: handle.name, usedSaveAs: true, cancelled: false };
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        return { fileName: options.suggestedName, locationLabel: '', usedSaveAs: true, cancelled: true };
      }
      throw cause;
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = options.suggestedName;
  anchor.click();
  URL.revokeObjectURL(url);
  return { fileName: options.suggestedName, locationLabel: `Downloads/${options.suggestedName}`, usedSaveAs: false, cancelled: false };
}

export async function saveDataUrlWithUserChoice(dataUrl: string, options: SaveFileDialogOptions): Promise<SavedFileResult> {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error('Could not prepare the generated export.');
  return saveBlobWithUserChoice(await response.blob(), options);
}

export async function openExternalUrl(url: string): Promise<void> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('Only HTTPS external links are allowed.');
  if (isNativeLightBI()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(parsed.toString());
    return;
  }
  window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
}
