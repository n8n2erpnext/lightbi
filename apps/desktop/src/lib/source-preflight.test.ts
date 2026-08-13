import { describe, it, expect } from 'vitest';
import { createSourceCandidate, runSourcePreflight } from './source-preflight';
import type { SourceCandidate } from './source-preflight';

// ─── Helper ───────────────────────────────────────────────────────────────────
function isCandidate(result: ReturnType<typeof createSourceCandidate>): result is SourceCandidate {
  return !('status' in result);
}

// ─── Candidate Creation ───────────────────────────────────────────────────────
describe('createSourceCandidate', () => {
  describe('Google Sheets - valid candidates', () => {
    it('returns candidate for https://docs.google.com/spreadsheets/d/{id}/edit', () => {
      const result = createSourceCandidate('https://docs.google.com/spreadsheets/d/public-demo/edit');
      expect(isCandidate(result)).toBe(true);
      if (isCandidate(result)) {
        expect(result.sourceType).toBe('google_sheets');
        expect(result.label).toBe('Google Sheets');
      }
    });

    it('returns candidate for docs.google.com/spreadsheets/d/{id}/edit (no protocol)', () => {
      const result = createSourceCandidate('docs.google.com/spreadsheets/d/public-demo/edit');
      expect(isCandidate(result)).toBe(true);
      if (isCandidate(result)) {
        expect(result.sourceType).toBe('google_sheets');
        expect(result.normalizedUrl).toBe('https://docs.google.com/spreadsheets/d/public-demo/edit');
      }
    });

    it('returns candidate for a long real-looking sheet id', () => {
      const result = createSourceCandidate('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit');
      expect(isCandidate(result)).toBe(true);
    });
  });

  describe('Google Sheets - invalid format (missing sheet id)', () => {
    it('returns invalid_format for https://docs.google.com/spreadsheets/d/', () => {
      const result = createSourceCandidate('https://docs.google.com/spreadsheets/d/');
      expect('status' in result).toBe(true);
      if ('status' in result) {
        expect(result.status).toBe('invalid_format');
      }
    });

    it('returns invalid_format for https://docs.google.com/spreadsheets/', () => {
      const result = createSourceCandidate('https://docs.google.com/spreadsheets/');
      expect('status' in result).toBe(true);
      if ('status' in result) {
        expect(result.status).toBe('invalid_format');
      }
    });
  });

  describe('Google Sheets - wrong subdomain (unsupported)', () => {
    it('returns unsupported for https://google.com/spreadsheets/d/abc', () => {
      const result = createSourceCandidate('https://google.com/spreadsheets/d/abc');
      expect('status' in result).toBe(true);
      if ('status' in result) {
        expect(result.status).toBe('unsupported');
      }
    });

    it('returns unsupported for https://drive.google.com/spreadsheets/d/abc', () => {
      const result = createSourceCandidate('https://drive.google.com/spreadsheets/d/abc');
      expect('status' in result).toBe(true);
      if ('status' in result) {
        expect(result.status).toBe('unsupported');
      }
    });

    it('returns unsupported for https://ai.google.com/spreadsheets/d/abc', () => {
      const result = createSourceCandidate('https://ai.google.com/spreadsheets/d/abc');
      expect('status' in result).toBe(true);
      if ('status' in result) {
        expect(result.status).toBe('unsupported');
      }
    });
  });

  describe('CSV URL', () => {
    it('returns candidate for https://example.com/report.csv', () => {
      const result = createSourceCandidate('https://example.com/report.csv');
      expect(isCandidate(result)).toBe(true);
      if (isCandidate(result)) {
        expect(result.sourceType).toBe('csv_url');
      }
    });
  });

  describe('Microsoft 365 Excel URLs', () => {
    it('returns candidate for OneDrive short Excel share links without a file extension', () => {
      const result = createSourceCandidate('https://1drv.ms/x/c/9032a21a3fab331f/IQA4-us9c_ouSr-i-wYwBLlWAWtU3ZOwu14F9kMJi-xusQ4?e=TWd6pK');
      expect(isCandidate(result)).toBe(true);
      if (isCandidate(result)) {
        expect(result.sourceType).toBe('m365_excel');
        expect(result.label).toBe('Microsoft 365 Excel');
      }
    });

    it('returns candidate for onedrive.live.com Excel viewer links', () => {
      const result = createSourceCandidate('https://onedrive.live.com/:x:/g/personal/9032a21a3fab331f/IQA4-us9c_ouSr-i-wYwBLlWAWHufKrljaLgtOfYIzJ4-DM?rtime=qG54vf_M3kg');
      expect(isCandidate(result)).toBe(true);
      if (isCandidate(result)) {
        expect(result.sourceType).toBe('m365_excel');
      }
    });
  });

  describe('Unsupported random URLs', () => {
    it('returns unsupported for https://example.com/about', () => {
      const result = createSourceCandidate('https://example.com/about');
      expect('status' in result).toBe(true);
      if ('status' in result) {
        expect(result.status).toBe('unsupported');
      }
    });
  });
});

import { createFileSourceCandidate } from './source-preflight';

describe('createFileSourceCandidate', () => {
  it('detects .csv as local_csv', () => {
    const file = new File([''], 'data.csv', { type: 'text/csv' });
    const result = createFileSourceCandidate(file);
    expect(isCandidate(result)).toBe(true);
    if (isCandidate(result)) {
      expect(result.sourceType).toBe('local_csv');
      expect(result.label).toBe('Local CSV');
    }
  });

  it('detects .xlsx as local_xlsx', () => {
    const file = new File([''], 'report.xlsx');
    const result = createFileSourceCandidate(file);
    expect(isCandidate(result)).toBe(true);
    if (isCandidate(result)) {
      expect(result.sourceType).toBe('local_xlsx');
    }
  });

  it('detects .json as local_json', () => {
    const file = new File([''], 'schema.json');
    const result = createFileSourceCandidate(file);
    expect(isCandidate(result)).toBe(true);
    if (isCandidate(result)) {
      expect(result.sourceType).toBe('local_json');
    }
  });

  it('returns unsupported for .png', () => {
    const file = new File([''], 'image.png');
    const result = createFileSourceCandidate(file);
    expect('status' in result).toBe(true);
    if ('status' in result) {
      expect(result.status).toBe('unsupported');
    }
  });
});

// ─── Mock Preflight ───────────────────────────────────────────────────────────
describe('runSourcePreflight', () => {
  it('public-demo → accessible with real metadata', async () => {
    const candidate = createSourceCandidate('https://docs.google.com/spreadsheets/d/public-demo/edit');
    expect(isCandidate(candidate)).toBe(true);
    const result = await runSourcePreflight(candidate as SourceCandidate);
    expect(result.status).toBe('accessible');
    if (result.status === 'accessible') {
      expect(result.metadata.rows_count).toBeGreaterThan(0);
      expect(result.metadata.columns?.length).toBeGreaterThan(0);
    }
  });

  it('private → access_denied', async () => {
    const candidate = createSourceCandidate('https://docs.google.com/spreadsheets/d/private-abc/edit');
    expect(isCandidate(candidate)).toBe(true);
    const result = await runSourcePreflight(candidate as SourceCandidate);
    expect(result.status).toBe('access_denied');
  });

  it('denied → access_denied', async () => {
    const candidate = createSourceCandidate('https://docs.google.com/spreadsheets/d/denied-xyz/edit');
    expect(isCandidate(candidate)).toBe(true);
    const result = await runSourcePreflight(candidate as SourceCandidate);
    expect(result.status).toBe('access_denied');
  });

  it('empty → no_data', async () => {
    const candidate = createSourceCandidate('https://docs.google.com/spreadsheets/d/empty-sheet/edit');
    expect(isCandidate(candidate)).toBe(true);
    const result = await runSourcePreflight(candidate as SourceCandidate);
    expect(result.status).toBe('no_data');
  });

  it('random real-looking url (gemini-ngu-vl) → not_found', async () => {
    const candidate = createSourceCandidate('https://docs.google.com/spreadsheets/d/gemini-ngu-vl/edit');
    expect(isCandidate(candidate)).toBe(true);
    const result = await runSourcePreflight(candidate as SourceCandidate);
    expect(result.status).toBe('not_found');
  });

  it('a realistic sheet id → not_found (frontend cannot know real access)', async () => {
    const candidate = createSourceCandidate('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit');
    expect(isCandidate(candidate)).toBe(true);
    const result = await runSourcePreflight(candidate as SourceCandidate);
    expect(result.status).toBe('not_found');
  });

});

// ─── currentDataset boundary assertion ──────────────────────────────────────
describe('Dataset boundary rule', () => {
  it('createSourceCandidate never returns accessible status - it is NOT a dataset', () => {
    // Candidate creation returns either a SourceCandidate (no status) or an error result.
    // It NEVER returns status "accessible". Only runSourcePreflight can return accessible.
    const candidate = createSourceCandidate('https://docs.google.com/spreadsheets/d/public-demo/edit');
    if ('status' in candidate) {
      // If it returned a result, it must not be accessible
      expect(candidate.status).not.toBe('accessible');
    } else {
      // Good - it's a candidate, not a dataset
      expect('rawUrl' in candidate).toBe(true);
      expect('status' in candidate).toBe(false);
    }
  });
});
