import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { deriveHeroView, HERO_SCENARIOS, heroMotionPolicy, releaseCatalogMarkup } from './public/hero-demo.js';

const here = dirname(fileURLToPath(import.meta.url));

test('ships exactly three deterministic downloadable Hero scenarios', () => {
  assert.deepEqual(HERO_SCENARIOS.map((scenario) => scenario.id), [
    'retail-sales',
    'inventory-aging',
    'delivery-operations',
  ]);
  for (const entry of HERO_SCENARIOS) {
    const scenario = JSON.parse(readFileSync(join(here, 'public', 'demo-data', entry.file), 'utf8'));
    const csv = readFileSync(join(here, 'public', 'demo-data', entry.csv), 'utf8').trim().split(/\r?\n/);
    assert.equal(scenario.id, entry.id);
    assert.equal(scenario.previewRows.length, 5);
    assert.ok(scenario.frames.length >= 3);
    assert.ok(csv.length >= 10);
    assert.equal(csv[0].split(',').length, csv[1].split(',').length);
  }
});

test('derives WHAT, WHERE and ranked Top 3 from one coherent frame', () => {
  const scenario = JSON.parse(readFileSync(join(here, 'public', 'demo-data', 'retail-sales.json'), 'utf8'));
  const first = deriveHeroView(scenario.frames[0]);
  const crossover = deriveHeroView(scenario.frames[2]);
  assert.equal(first.where.name, first.ranking[0].name);
  assert.equal(first.where.name, 'Store A');
  assert.equal(crossover.where.name, crossover.ranking[0].name);
  assert.equal(crossover.where.name, 'Store B');
  assert.deepEqual(crossover.ranking.map((entity) => entity.rank), [1, 2, 3]);
  assert.ok(crossover.ranking[0].value >= crossover.ranking[1].value);
  assert.equal(crossover.total.formattedValue, scenario.frames[2].total.formattedValue);
});

test('keeps release failure private until disclosure and renders a compact archive fallback', () => {
  const markup = releaseCatalogMarkup(null, 'https://github.com/n8n2erpnext/lightbi/releases');
  assert.match(markup, /Need another platform or version/);
  assert.match(markup, /View GitHub releases/);
  assert.doesNotMatch(markup, /R2|mirror reconnecting|temporarily unavailable/i);
});

test('does not fetch the release catalog during initial homepage startup', () => {
  const application = readFileSync(join(here, 'public', 'app.js'), 'utf8');
  assert.doesNotMatch(application, /state\.catalog\s*=\s*await api\(['"]\/api\/releases/);
  assert.match(application, /setupOtherDownloads\(\)/);
  assert.match(application, /if \(open\) \{[\s\S]*?void load\(\)/);
});

test('reduced motion keeps semantic frame cycling while disabling packet travel', () => {
  assert.deepEqual(heroMotionPolicy(false), { animatePackets: true, cycleFrames: true, resultDelayMs: 1420 });
  assert.deepEqual(heroMotionPolicy(true), { animatePackets: false, cycleFrames: true, resultDelayMs: 240 });
});

test('keeps the evidence waves moving on Windows while slowing reduced motion', () => {
  const css = readFileSync(join(here, 'public', 'styles.css'), 'utf8');
  const html = readFileSync(join(here, 'public', 'index.html'), 'utf8');
  assert.match(css, /@keyframes hero-wave-drift/);
  assert.match(css, /\.hero-transmission path\{[^}]*animation:hero-wave-drift/);
  assert.match(css, /prefers-reduced-motion:reduce\)\{\.hero-transmission path\{animation-duration:14s!important/);
  assert.doesNotMatch(css, /\.hero-transmission path\{[^}]*animation:none/);
  assert.match(css, /#hero-wave-primary\{stroke-width:1\.45;opacity:\.25/);
  assert.match(html, /id="hero-wave-primary" d="M 240 430[^>]*><animate attributeName="d"[^>]+repeatCount="indefinite"/);
});

test('keeps the GitHub archive link separate from R2 download artifacts', () => {
  const archive = 'https://github.com/n8n2erpnext/lightbi/releases';
  const markup = releaseCatalogMarkup({ releases: [{ channel: 'beta', version: '0.9.2-beta.7', published_at: '2026-08-27', release_notes: 'Beta', artifacts: [{ platform: 'windows', architecture: 'x86_64', url: 'https://drive.example/LightBI.exe' }] }] }, archive);
  assert.match(markup, new RegExp(`class="archive-link" href="${archive}"`));
  assert.doesNotMatch(markup, /class="archive-link" href="https:\/\/drive\.example/);
});
