// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadProjectSourceFile, uploadProjectSourceFile } from './project-source-file-api';

describe('project source file API', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uploads the complete File and returns its durable recovery identity', async () => {
    const persisted = {
      fileId: 'source-file-1', originalName: 'sales.csv',
      filePath: 'project/source-files/source-file-1.csv', bytesWritten: 24,
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(persisted), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['id,revenue\n1,120'], 'sales.csv', { type: 'text/csv' });

    await expect(uploadProjectSourceFile(file)).resolves.toEqual(persisted);
    const [url, request] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/project/source-files/raw?name=sales.csv');
    expect(request).toMatchObject({ method: 'POST' });
    expect(request.body).toBe(file);
    expect(request.body).not.toBeInstanceOf(FormData);
  });

  it('downloads the persisted internal copy as a new runtime File', async () => {
    const persisted = {
      fileId: 'source-file-1', originalName: 'sales.csv',
      filePath: 'project/source-files/source-file-1.csv', bytesWritten: 24,
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response('id,revenue\n1,120', {
      status: 200,
      headers: { 'content-type': 'text/csv' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const file = await downloadProjectSourceFile(persisted);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/project/source-files/source-file-1/download');
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('sales.csv');
    expect(file.type).toBe('text/csv');
    expect(file.size).toBeGreaterThan(0);
  });
  it('routes native project-file persistence through the embedded Windows core origin', async () => {
    vi.stubGlobal('window', {
      location: { origin: 'http://tauri.localhost', hostname: 'tauri.localhost', protocol: 'http:' },
      __TAURI_INTERNALS__: {},
    });
    const persisted = { fileId: 'native-source-1', originalName: 'native.csv', filePath: 'project/files/native-source-1', bytesWritten: 12 };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(persisted), { status: 201, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    await uploadProjectSourceFile(new File(['id,value\n1,2'], 'native.csv', { type: 'text/csv' }));
    expect(fetchMock.mock.calls[0][0]).toBe('http://lightbi.localhost/api/project/source-files/raw?name=native.csv');
  });

});
