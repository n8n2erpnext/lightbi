// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { isNativeLightBI } from './native-runtime';
import { externalFetch, saveBlobWithUserChoice } from './native-capabilities';

vi.mock('./native-runtime', () => ({ isNativeLightBI: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('native capabilities', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.mocked(isNativeLightBI).mockReturnValue(false);
    delete (window as any).showSaveFilePicker;
  });

  it('treats Save As cancellation as cancellation instead of falling through to download', async () => {
    const picker = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'));
    (window as any).showSaveFilePicker = picker;
    const createUrl = vi.spyOn(URL, 'createObjectURL');
    const result = await saveBlobWithUserChoice(new Blob(['x'], { type: 'text/plain' }), { suggestedName: 'x.txt', extensions: ['txt'] });
    expect(result.cancelled).toBe(true);
    expect(createUrl).not.toHaveBeenCalled();
  });

  it('uses the Tauri Save As command for packaged LightBI', async () => {
    vi.mocked(isNativeLightBI).mockReturnValue(true);
    vi.mocked(invoke).mockResolvedValue({ fileName: 'report.csv', path: 'C:\\Users\\Test\\report.csv' });
    const result = await saveBlobWithUserChoice(new Blob(['a,b'], { type: 'text/csv' }), { suggestedName: 'report.csv', extensions: ['csv'] });
    expect(invoke).toHaveBeenCalledWith('save_export_file', expect.objectContaining({ request: expect.objectContaining({ suggestedName: 'report.csv', extensions: ['csv'] }) }));
    expect(result).toMatchObject({ fileName: 'report.csv', usedSaveAs: true, cancelled: false });
  });

  it('moves packaged external HTTPS requests out of the WebView', async () => {
    vi.mocked(isNativeLightBI).mockReturnValue(true);
    vi.mocked(invoke).mockResolvedValue({ status: 200, headers: { 'content-type': 'application/json' }, body: Array.from(new TextEncoder().encode('{"ok":true}')) });
    const response = await externalFetch('https://lightbi.example/api/test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"hello":"world"}' });
    expect(invoke).toHaveBeenCalledWith('native_http_request', expect.objectContaining({ request: expect.objectContaining({ url: 'https://lightbi.example/api/test', method: 'POST' }) }));
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('falls back to WebView fetch when the packaged native transport rejects', async () => {
    vi.mocked(isNativeLightBI).mockReturnValue(true);
    vi.mocked(invoke).mockRejectedValue('Native HTTP request failed: connect error');
    const browserFetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', browserFetch);
    const response = await externalFetch('https://lightbi.example/api/test');
    expect(browserFetch).toHaveBeenCalledWith('https://lightbi.example/api/test', {});
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('falls back to WebView for idempotent reads when native transport returns a proxy HTTP error', async () => {
    vi.mocked(isNativeLightBI).mockReturnValue(true);
    vi.mocked(invoke).mockResolvedValue({ status: 407, headers: { 'content-type': 'text/plain' }, body: Array.from(new TextEncoder().encode('proxy authentication required')) });
    const browserFetch = vi.fn().mockResolvedValue(new Response('{\"ok\":true}', { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', browserFetch);
    const response = await externalFetch('https://lightbi-next.thaiduy.digital/api/releases/latest');
    expect(browserFetch).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('does not replay non-idempotent mutations through WebView after native transport failure', async () => {
    vi.mocked(isNativeLightBI).mockReturnValue(true);
    vi.mocked(invoke).mockRejectedValue('Native HTTP request failed: response lost');
    const browserFetch = vi.fn();
    vi.stubGlobal('fetch', browserFetch);
    await expect(externalFetch('https://lightbi.example/api/mutate', { method: 'POST', body: '{}' })).rejects.toThrow(
      /Native HTTP failed: Native HTTP request failed: response lost/,
    );
    expect(browserFetch).not.toHaveBeenCalled();
  });

  it('preserves both native and WebView transport errors when both paths fail', async () => {
    vi.mocked(isNativeLightBI).mockReturnValue(true);
    vi.mocked(invoke).mockRejectedValue('Native HTTP request failed: TLS handshake');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(externalFetch('https://lightbi.example/api/test')).rejects.toThrow(
      /Native HTTP failed: Native HTTP request failed: TLS handshake; WebView fallback failed: Failed to fetch/,
    );
  });
});
