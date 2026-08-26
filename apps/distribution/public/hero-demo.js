export const HERO_SCENARIOS = [
  { id: 'retail-sales', file: 'retail-sales.json', csv: 'retail-sales.csv' },
  { id: 'inventory-aging', file: 'inventory-aging.json', csv: 'inventory-aging.csv' },
  { id: 'delivery-operations', file: 'delivery-operations.json', csv: 'delivery-operations.csv' },
];

const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const deltaDirection = (value) => Number(value) >= 0 ? 'positive' : 'negative';
const deltaLabel = (value) => `${Number(value) >= 0 ? '↑ +' : '↓ '}${Number(value).toFixed(1)}%`;

export function deriveHeroView(frame) {
  if (!frame || !frame.total || !Array.isArray(frame.entities) || !frame.entities.length) {
    throw new Error('invalid_hero_frame');
  }
  const ranking = [...frame.entities]
    .map((entity) => ({ ...entity, value: Number(entity.value), deltaPct: Number(entity.deltaPct) }))
    .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name));
  const maximum = Math.max(1, ...ranking.map((entity) => entity.value));
  return {
    timestampLabel: frame.timestampLabel || '',
    total: {
      ...frame.total,
      value: Number(frame.total.value),
      deltaPct: Number(frame.total.deltaPct),
      direction: deltaDirection(frame.total.deltaPct),
      deltaLabel: deltaLabel(frame.total.deltaPct),
    },
    where: {
      ...ranking[0],
      direction: deltaDirection(ranking[0].deltaPct),
      deltaLabel: deltaLabel(ranking[0].deltaPct),
    },
    ranking: ranking.slice(0, 3).map((entity, index) => ({
      ...entity,
      rank: index + 1,
      widthPct: Math.max(12, entity.value / maximum * 100),
      direction: deltaDirection(entity.deltaPct),
      deltaLabel: deltaLabel(entity.deltaPct),
    })),
    checks: {
      count: Number(frame.checks?.count || 0),
      label: frame.checks?.label || 'ranked by evidence',
    },
    packets: frame.packets || { primary: [], secondaryA: [], secondaryB: [] },
  };
}

export function heroMotionPolicy(reducedMotion) {
  return {
    animatePackets: !reducedMotion,
    cycleFrames: true,
    resultDelayMs: reducedMotion ? 240 : 1420,
  };
}

export function releaseCatalogMarkup(catalog, fallbackUrl = 'https://github.com/n8n2erpnext/lightbi/releases') {
  const releases = catalog?.releases || [];
  if (!releases.length) {
    return `<div class="release-fallback"><h3>Need another platform or version?</h3><p>Browse the complete LightBI release archive on GitHub.</p><a class="button dark" href="${safe(fallbackUrl)}">View GitHub releases</a></div>`;
  }
  return `${releases.slice(0, 3).map((release) => `
    <article class="release-card">
      <span class="pill">${safe(release.channel)}</span>
      <h3>LightBI ${safe(release.version)}</h3>
      <p>${safe(String(release.published_at).slice(0, 10))} · ${safe(release.release_notes || 'Release update')}</p>
      <div class="artifact-actions">${(release.artifacts || []).map((artifact) => `
        <a class="button dark" href="${safe(artifact.url)}" data-release-download data-platform="${safe(artifact.platform)}">${safe(artifact.platform === 'windows' ? 'Windows' : artifact.platform === 'linux' ? 'Linux' : artifact.platform === 'macos' ? 'macOS' : artifact.platform)} · ${safe(artifact.architecture)}</a>
      `).join('')}</div>
    </article>
  `).join('')}<a class="archive-link" href="${safe(fallbackUrl)}">View all GitHub releases →</a>`;
}

function previewMarkup(scenario) {
  const columns = scenario.columns || [];
  const rows = (scenario.previewRows || []).slice(0, 5);
  return `<table><thead><tr>${columns.map((column) => `<th>${safe(column.label)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${safe(row[column.key])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function updateDelta(element, value) {
  if (!element) return;
  element.textContent = deltaLabel(value);
  element.classList.toggle('positive', Number(value) >= 0);
  element.classList.toggle('negative', Number(value) < 0);
}

function renderRanking(root, view) {
  const target = root.querySelector('[data-hero-ranking]');
  if (!target) return;
  const expectedNames = view.ranking.map((entity) => entity.name).sort().join('|');
  const currentNames = [...target.querySelectorAll('.rank-row')].map((row) => row.dataset.entity).sort().join('|');
  if (expectedNames !== currentNames) {
    target.innerHTML = view.ranking.map((entity) => `<div class="rank-row" data-entity="${safe(entity.name)}"><span class="rank-number"></span><strong class="rank-name">${safe(entity.name)}</strong><span class="rank-track"><i></i></span><span class="rank-value"></span></div>`).join('');
  }
  const rows = [...target.querySelectorAll('.rank-row')];
  const first = new Map(rows.map((row) => [row.dataset.entity, row.getBoundingClientRect().top]));
  view.ranking.forEach((entity) => {
    const row = rows.find((candidate) => candidate.dataset.entity === entity.name);
    if (!row) return;
    row.style.setProperty('--rank', String(entity.rank));
    row.style.order = String(entity.rank);
    row.classList.toggle('focus', entity.rank === 1);
    row.querySelector('.rank-number').textContent = `#${entity.rank}`;
    row.querySelector('.rank-track i').style.setProperty('--width', `${entity.widthPct}%`);
    row.querySelector('.rank-value').textContent = entity.formattedValue || String(entity.value);
  });
  requestAnimationFrame(() => rows.forEach((row) => {
    const previous = first.get(row.dataset.entity);
    const current = row.getBoundingClientRect().top;
    if (previous != null && previous !== current && row.animate) {
      row.animate([{ transform: `translateY(${previous - current}px)` }, { transform: 'translateY(0)' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  }));
}

function renderFrame(root, scenario, frame) {
  const view = deriveHeroView(frame);
  root.querySelector('[data-hero-theme]').textContent = scenario.theme;
  root.querySelector('[data-hero-frame-label]').textContent = view.timestampLabel;
  root.querySelector('[data-hero-what]').textContent = view.total.formattedValue;
  root.querySelector('[data-hero-what-detail]').textContent = view.total.detail;
  updateDelta(root.querySelector('[data-hero-what-delta]'), view.total.deltaPct);
  root.querySelector('[data-hero-where]').textContent = view.where.name;
  root.querySelector('[data-hero-where-detail]').textContent = frame.whereDetail || 'highest-ranked evidence group';
  updateDelta(root.querySelector('[data-hero-where-delta]'), view.where.deltaPct);
  root.querySelector('[data-hero-next]').textContent = `${view.checks.count} ${view.checks.count === 1 ? 'check' : 'checks'}`;
  root.querySelector('[data-hero-next-detail]').textContent = view.checks.label;
  renderRanking(root, view);
  return view;
}

function renderRawTokens(root, scenario, frame) {
  const target = root.querySelector('[data-raw-data-tokens]');
  const field = target?.closest('.raw-data-field');
  if (!target || !field) return;
  field.classList.add('is-refreshing');
  window.setTimeout(() => {
    const values = [...(scenario.rawTokens || []), ...(frame.packets?.primary || [])].slice(0, 14);
    target.innerHTML = values.map((value) => `<span>${safe(value)}</span>`).join('');
    field.classList.remove('is-refreshing');
  }, 170);
}

function animatePacket(root, selector, values, duration, delay, rafs) {
  const textPath = root.querySelector(selector);
  if (!textPath) return;
  textPath.textContent = (values || []).join('   ·   ');
  const text = textPath.closest('text');
  const startedAt = performance.now() + delay;
  const schedule = () => {
    let handle = 0;
    handle = requestAnimationFrame((now) => {
      rafs.delete(handle);
      tick(now);
    });
    rafs.add(handle);
  };
  const tick = (now) => {
    const elapsed = now - startedAt;
    if (elapsed < 0) {
      schedule();
      return;
    }
    const progress = Math.min(1, elapsed / duration);
    textPath.setAttribute('startOffset', `${-24 + progress * 138}%`);
    text?.classList.toggle('is-moving', progress < 1);
    if (progress < 1) schedule();
  };
  schedule();
}

function renderStaticPackets(root, packets) {
  [
    ['[data-stream-primary]', packets.primary, '34%'],
    ['[data-stream-secondary-a]', packets.secondaryA, '43%'],
    ['[data-stream-secondary-b]', packets.secondaryB, '52%'],
  ].forEach(([selector, values, offset]) => {
    const textPath = root.querySelector(selector);
    if (!textPath) return;
    textPath.textContent = (values || []).join(' · ');
    textPath.setAttribute('startOffset', offset);
  });
}

export async function initHeroDemo({ root = globalThis.document, fetchImpl = globalThis.fetch } = {}) {
  if (!root?.querySelector('[data-hero-visual]')) return null;
  const scenarioBase = new URL('./demo-data/', import.meta.url);
  const scenarios = new Map();
  await Promise.all(HERO_SCENARIOS.map(async (entry) => {
    const response = await fetchImpl(new URL(entry.file, scenarioBase));
    if (!response.ok) throw new Error(`hero_scenario_${entry.id}_unavailable`);
    scenarios.set(entry.id, { ...await response.json(), csvUrl: new URL(entry.csv, scenarioBase).href });
  }));

  let activeId = HERO_SCENARIOS[0].id;
  let frameIndex = 0;
  let cycleTimer = null;
  let resultTimer = null;
  const rafs = new Set();
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const motion = heroMotionPolicy(reducedMotion);

  const cancelMotion = () => {
    if (cycleTimer) clearTimeout(cycleTimer);
    if (resultTimer) clearTimeout(resultTimer);
    cycleTimer = null;
    resultTimer = null;
    rafs.forEach((id) => cancelAnimationFrame(id));
    rafs.clear();
    root.querySelectorAll('.stream-packet').forEach((packet) => packet.classList.remove('is-moving'));
  };

  const setScenarioChrome = (scenario) => {
    root.querySelectorAll('[data-hero-scenario]').forEach((button) => button.setAttribute('aria-selected', String(button.dataset.heroScenario === scenario.id)));
    root.querySelector('[data-sample-download]').href = scenario.csvUrl;
    root.querySelector('[data-sample-download]').setAttribute('download', `${scenario.id}.csv`);
    root.querySelector('[data-sample-preview-title]').textContent = `${scenario.label} · 5 representative rows`;
    root.querySelector('[data-sample-preview-table]').innerHTML = previewMarkup(scenario);
  };

  const scheduleFrame = (delay = 2800) => {
    if (!motion.cycleFrames || globalThis.document?.hidden) return;
    cycleTimer = setTimeout(runFrame, delay);
  };

  const runFrame = () => {
    const scenario = scenarios.get(activeId);
    if (!scenario || globalThis.document?.hidden) return;
    const frame = scenario.frames[frameIndex];
    frameIndex = (frameIndex + 1) % scenario.frames.length;
    renderRawTokens(root, scenario, frame);
    const visual = root.querySelector('[data-hero-visual]');
    visual.classList.add('is-updating');
    if (motion.animatePackets) {
      animatePacket(root, '[data-stream-primary]', frame.packets.primary, 1450, 0, rafs);
      animatePacket(root, '[data-stream-secondary-a]', frame.packets.secondaryA, 1500, 160, rafs);
      animatePacket(root, '[data-stream-secondary-b]', frame.packets.secondaryB, 1580, 280, rafs);
    } else {
      renderStaticPackets(root, frame.packets);
    }
    resultTimer = setTimeout(() => {
      renderFrame(root, scenario, frame);
      visual.classList.remove('is-updating');
    }, motion.resultDelayMs);
    scheduleFrame(5200);
  };

  const activate = (id, immediate = false) => {
    const scenario = scenarios.get(id);
    if (!scenario) return;
    cancelMotion();
    activeId = id;
    frameIndex = 0;
    setScenarioChrome(scenario);
    renderRawTokens(root, scenario, scenario.frames[0]);
    if (immediate || reducedMotion) {
      renderFrame(root, scenario, scenario.frames[0]);
      frameIndex = 1 % scenario.frames.length;
      scheduleFrame();
    } else {
      runFrame();
    }
  };

  root.querySelectorAll('[data-hero-scenario]').forEach((button) => button.addEventListener('click', () => activate(button.dataset.heroScenario)));
  const preview = root.querySelector('[data-sample-preview]');
  const previewToggle = root.querySelector('[data-sample-preview-toggle]');
  const setPreview = (open) => {
    preview.hidden = !open;
    previewToggle.setAttribute('aria-expanded', String(open));
  };
  previewToggle.addEventListener('click', () => setPreview(preview.hidden));
  root.querySelector('[data-sample-preview-close]').addEventListener('click', () => setPreview(false));
  globalThis.document?.addEventListener('visibilitychange', () => {
    cancelMotion();
    if (!globalThis.document.hidden) scheduleFrame(900);
  });
  activate(activeId, true);
  return { activate, destroy: cancelMotion, scenarios };
}
