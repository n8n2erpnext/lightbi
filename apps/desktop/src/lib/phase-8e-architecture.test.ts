import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.join(process.cwd(), 'src');
const REPO = path.join(process.cwd(), '../..');
const BETA_PAGE_SHELL_LINE_LIMIT = 1200;
const BETA_EXTRACTED_VIEW_LINE_LIMIT = 1100;

function read(relativePath: string): string {
  return fs.readFileSync(path.join(REPO, relativePath), 'utf8');
}

function lines(relativePath: string): number {
  return read(relativePath).split(/\r?\n/).length - 1;
}

function sourceFiles(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : /\.tsx?$/.test(entry.name) ? [target] : [];
  });
}

function sha256(relativePath: string): string {
  const canonicalText = fs.readFileSync(path.join(REPO, relativePath), 'utf8').replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(canonicalText, 'utf8').digest('hex');
}

describe('Phase 8E architecture and contract parity', () => {
  it('keeps all production page shells within the governed size gate', () => {
    expect(lines('apps/desktop/src/pages/Home.tsx')).toBeLessThanOrEqual(BETA_PAGE_SHELL_LINE_LIMIT);
    expect(lines('apps/desktop/src/pages/Investigation.tsx')).toBeLessThanOrEqual(BETA_PAGE_SHELL_LINE_LIMIT);
    expect(lines('apps/desktop/src/pages/Advanced.tsx')).toBeLessThanOrEqual(BETA_PAGE_SHELL_LINE_LIMIT);
  });

  it('prevents an extracted replacement monolith', () => {
    const extracted = [
      ...sourceFiles(path.join(SRC, 'components/home')),
      ...sourceFiles(path.join(SRC, 'components/investigation')),
      ...sourceFiles(path.join(SRC, 'components/advanced')),
      ...sourceFiles(path.join(SRC, 'hooks')).filter(file => /use(Home|Advanced)/.test(path.basename(file))),
    ];
    for (const file of extracted) {
      const count = fs.readFileSync(file, 'utf8').split(/\r?\n/).length - 1;
      expect(count, path.relative(REPO, file)).toBeLessThanOrEqual(BETA_EXTRACTED_VIEW_LINE_LIMIT);
    }
  });

  it('keeps feature and support modules from importing page implementations', () => {
    const roots = [path.join(SRC, 'components'), path.join(SRC, 'hooks'), path.join(SRC, 'lib')];
    for (const file of roots.flatMap(sourceFiles)) {
      expect(read(path.relative(REPO, file)), path.relative(REPO, file)).not.toMatch(/from\s+['"][^'"]*pages\//);
    }
  });

  it('keeps understanding-core independent from React and pages', () => {
    for (const file of sourceFiles(path.join(SRC, 'lib/understanding-core')).filter(file => !/\.test\.tsx?$/.test(file))) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source, path.relative(REPO, file)).not.toMatch(/from\s+['"]react(?:\/|['"])/);
      expect(source, path.relative(REPO, file)).not.toMatch(/from\s+['"][^'"]*pages\//);
    }
  });

  it('keeps runtime packages independent from UI and page modules', () => {
    const runtimeRoot = path.join(REPO, 'packages/runtime/src');
    for (const file of sourceFiles(runtimeRoot)) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source, path.relative(REPO, file)).not.toMatch(/from\s+['"][^'"]*(components|pages)\//);
      expect(source, path.relative(REPO, file)).not.toMatch(/from\s+['"]react(?:\/|['"])/);
    }
  });

  it('preserves Phase 8 public contract files byte-for-byte', () => {
    const expected: Record<string, string> = {
      'apps/desktop/src/lib/understanding-core/canonical-source-boundary.ts': '58882e0b9409a65d3735e296b18665f736bbd889fcfc613c1a2ba3ad2f04ea0b',
      'apps/desktop/src/lib/understanding-core/canonical-user-overlay.ts': '0254062774db5491cc9f512f7e1079f709835b841594404e649deef75866adc6',
      'apps/desktop/src/lib/understanding-core/canonical-multisource-boundary.ts': '3c8371f11b5fd35909e09c88573ed94aa186f80373684e35a064fc2a38d71385',
      'apps/desktop/src/lib/investigation-session.ts': '414ea6d4f4d46341e6d31b31552481357a155f73d3d511de98276e673c699087',
      'apps/desktop/src/lib/advanced-result-handoff.ts': 'dc3d71356854af4a55ff920561932b097ea16d80d6dd647a61a8ee3778ff9830',
      'apps/desktop/src/lib/workspace-session-api.ts': '95e121ce5c3f2e28a155ef3a539eb196cc111688a68faf1f0e7bf3e6b7bedf43',
    };
    for (const [file, hash] of Object.entries(expected)) expect(sha256(file), file).toBe(hash);
  });

  it('keeps the governed regression allowlist byte-frozen', () => {
    expect(sha256('docs/architecture/phase-5b6b-regression-baseline-allowlist.v1.json'))
      .toBe('baa86950582b7d758396abb0c69fdaffcd3c2cbbb22b71dd3bbdb3c0aed1c4f5');
  });

  it('does not restore legacy fusion execution to production pages', () => {
    const pages = ['Home.tsx', 'Investigation.tsx', 'Advanced.tsx'].map(file => fs.readFileSync(path.join(SRC, 'pages', file), 'utf8')).join('\n');
    expect(pages).not.toContain('executeBackendPreview(');
    expect(pages).not.toContain('executeDuckDBPreviewRuntime(');
    expect(pages).not.toContain('handleUseBusinessFusionDataset');
    expect(pages).not.toContain('createBusinessFusionVirtualDataset');
  });
});
