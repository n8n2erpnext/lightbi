// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { isNativeLightBI } from './native-runtime';
import { externalFetch, saveBlobWithUserChoice } from './native-capabilities';

vi.mock('./native-runtime', () => ({ isNativeLightBI: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('native capabilities', () => {
  beforeEach(() => {
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
});
