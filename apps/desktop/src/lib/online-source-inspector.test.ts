import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSourceCandidate, type SourceCandidate } from './source-preflight';
import { inspectOnlineSource } from './online-source-inspector';

function asCandidate(input: string): SourceCandidate {
  const candidate = createSourceCandidate(input);
  if ('status' in candidate) throw new Error(`Expected candidate, got ${candidate.status}`);
  return candidate;
}

describe('online-source-inspector', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('inspects public Google Sheets through CSV export into representative metadata', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => [
        'Order Date,Country,Sales,Profit',
        '2025-01-01,Vietnam,100,20',
        '2025-01-02,Thailand,150,30'
      ].join('\n')
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await inspectOnlineSource(asCandidate('https://docs.google.com/spreadsheets/d/public-demo/edit#gid=123'));

    expect(fetchMock).toHaveBeenCalledWith('https://docs.google.com/spreadsheets/d/public-demo/export?format=csv&gid=123');
    expect(result.status).toBe('accessible');
    if (result.status === 'accessible') {
      expect(result.sourceType).toBe('google_sheets');
      expect(result.metadata.rows_count).toBe(2);
      expect(result.metadata.columns).toEqual(['Order Date', 'Country', 'Sales', 'Profit']);
      expect(result.metadata.analysis_rows).toHaveLength(2);
      expect(result.metadata.preview_rows?.[0]).toEqual({
        'Order Date': '2025-01-01',
        Country: 'Vietnam',
        Sales: '100',
        Profit: '20'
      });
      expect(result.metadata.profiles?.Sales.dataType).toBe('number');
      expect(result.file?.name).toBe('Google Sheet.csv');
      expect(await result.file?.text()).toContain('Vietnam,100,20');
    }
  });

  it('falls back to Google Sheets gviz CSV when normal export redirects into a failing response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => ''
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => [
          'Mã phiếu xuất,Ngày xuất,Mã kho xuất,Tổng tiền,Tiền phải thu',
          '21090073350166313,9/20/21 9:38,7335,125000,125000'
        ].join('\n')
      });
    vi.stubGlobal('fetch', fetchMock);

    const url = 'https://docs.google.com/spreadsheets/d/19RjQTV6a2gh_migkKsgHtSUq8PFlUIfXI3m3Nbw7CfI/edit?usp=sharing';
    const result = await inspectOnlineSource(asCandidate(url));

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://docs.google.com/spreadsheets/d/19RjQTV6a2gh_migkKsgHtSUq8PFlUIfXI3m3Nbw7CfI/export?format=csv&gid=0'
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://docs.google.com/spreadsheets/d/19RjQTV6a2gh_migkKsgHtSUq8PFlUIfXI3m3Nbw7CfI/gviz/tq?tqx=out:csv&gid=0'
    );
    expect(result.status).toBe('accessible');
    if (result.status === 'accessible') {
      expect(result.metadata.columns).toEqual(['Mã phiếu xuất', 'Ngày xuất', 'Mã kho xuất', 'Tổng tiền', 'Tiền phải thu']);
      expect(result.metadata.rows_count).toBe(1);
    }
  });

  it('inspects a direct CSV URL without relying on filename hardcoding', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'team,event,count\nA,goal,3\nB,assist,4'
    }));

    const result = await inspectOnlineSource(asCandidate('https://example.com/exports/random.csv'));

    expect(result.status).toBe('accessible');
    if (result.status === 'accessible') {
      expect(result.sourceType).toBe('csv_url');
      expect(result.metadata.columns).toEqual(['team', 'event', 'count']);
      expect(result.metadata.rows_count).toBe(2);
      expect(result.metadata.analysis_rows).toEqual([
        { team: 'A', event: 'goal', count: '3' },
        { team: 'B', event: 'assist', count: '4' }
      ]);
      expect(result.file).toBeInstanceOf(File);
      expect(result.file?.name).toBe('random.csv');
    }
  });

  it('does not create a dataset for private or denied online sources', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => ''
    }));

    const result = await inspectOnlineSource(asCandidate('https://docs.google.com/spreadsheets/d/private-sheet/edit'));

    expect(result.status).toBe('access_denied');
    if (result.status === 'access_denied') {
      expect(result.message).toContain('requires authentication');
    }
  });

  it('classifies browser-level Google Sheets fetch failures as access denied instead of not found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const result = await inspectOnlineSource(asCandidate('https://docs.google.com/spreadsheets/d/locked-sheet/edit'));

    expect(result.status).toBe('access_denied');
    if (result.status === 'access_denied') {
      expect(result.message).toContain('not shared publicly');
    }
  });
});
