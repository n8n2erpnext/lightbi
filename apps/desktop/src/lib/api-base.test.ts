// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getApiBaseUrl } from './api-base';

describe('getApiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('routes packaged Tauri WebView requests to the embedded core before bridge injection', () => {
    vi.stubGlobal('window', {
      location: {
        origin: 'http://tauri.localhost',
        hostname: 'tauri.localhost',
        protocol: 'http:',
      },
    });

    expect(getApiBaseUrl()).toBe('lightbi://localhost');
  });

  it('keeps ordinary web deployments on the same origin', () => {
    vi.stubGlobal('window', {
      location: {
        origin: 'https://lightbi.example',
        hostname: 'lightbi.example',
        protocol: 'https:',
      },
    });

    expect(getApiBaseUrl()).toBe('https://lightbi.example');
  });
});
