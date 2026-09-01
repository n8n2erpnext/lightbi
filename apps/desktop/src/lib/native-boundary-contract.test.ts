import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const adapter = join(srcRoot, 'lib', 'native-capabilities.ts');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (name === 'node_modules' || name === 'dist') return [];
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx') ? [path] : [];
  });
}

const browserOnlyPatterns = [
  /\balert\s*\(/, /\bconfirm\s*\(/, /\bprompt\s*\(/,
  /window\.open\s*\(/, /new\s+Notification\s*\(/, /Notification\./,
  /showSaveFilePicker/, /URL\.createObjectURL/, /\.download\s*=/, /\.save\s*\([^\n]*\.pdf/,
];

describe('native capability boundary', () => {
  it('keeps browser-only side effects inside the single web fallback adapter', () => {
    const violations: string[] = [];
    for (const file of sourceFiles(srcRoot)) {
      if (file === adapter) continue;
      const text = readFileSync(file, 'utf8');
      for (const pattern of browserOnlyPatterns) if (pattern.test(text)) violations.push(`${file.replace(srcRoot, 'src')}: ${pattern}`);
    }
    expect(violations).toEqual([]);
  });

  it('routes known internet-facing modules through externalFetch instead of WebView fetch', () => {
    const internetModules = [
      'lib/account-api.ts', 'lib/distribution-pairing.ts', 'lib/app-usage-telemetry.ts',
      'stores/announcement-store.ts', 'stores/update-store.ts',
    ];
    const violations = internetModules.filter(relative => {
      const text = readFileSync(join(srcRoot, relative), 'utf8');
      return /(?<!external)fetch\s*\(/.test(text);
    });
    expect(violations).toEqual([]);
  });

  it('keeps online-source browser fetches limited to the embedded Core origin', () => {
    const text = readFileSync(join(srcRoot, 'lib/online-source-inspector.ts'), 'utf8');
    const directFetches = [...text.matchAll(/(?<!external)fetch\s*\(([^\n]+)/g)].map(match => match[1]);
    expect(directFetches.length).toBeGreaterThan(0);
    expect(directFetches.every(call => call.includes('getApiBaseUrl()'))).toBe(true);
  });

  it('keeps native password passkey authentication on the official browser origin and returns through device polling', () => {
    const text = readFileSync(join(srcRoot, 'lib/account-api.ts'), 'utf8');
    expect(text).toContain('/account?strong=');
    expect(text).toContain('openExternalUrl');
    expect(text).toContain('finishNativeLoginPolling');
    expect(text).toContain('/api/account/device-login/status');
  });

  it('wires legacy History source recovery to a real embedded Core endpoint', () => {
    const repoRoot = join(srcRoot, '..', '..', '..');
    const server = readFileSync(join(repoRoot, 'apps/server/src/lib.rs'), 'utf8');
    const sourceHandler = readFileSync(join(repoRoot, 'apps/server/src/project_sources.rs'), 'utf8');
    expect(server).toContain('/api/project/source-files/resolve');
    expect(server).toContain('get(resolve_project_source_file)');
    expect(sourceHandler).toContain('pub(super) async fn resolve_project_source_file');
  });

});
