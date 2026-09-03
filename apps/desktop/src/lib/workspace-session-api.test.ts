import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadWorkspaceSessions } from './workspace-session-api';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('workspace session generation handoff', () => {
  it('retries one transient 404 once and accepts the recovered Core route', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const pending = loadWorkspaceSessions();
    await vi.advanceTimersByTimeAsync(350);
    await expect(pending).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('still surfaces a persistent 404 after the bounded retry', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const pending = loadWorkspaceSessions();
    const assertion = expect(pending).rejects.toThrow('Workspace session API returned 404.');
    await vi.advanceTimersByTimeAsync(350);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
