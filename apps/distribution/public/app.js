const state = { config: null };
const routeBase = location.pathname.startsWith('/distribution') ? '/distribution' : '';

function installationId() {
  let id = localStorage.getItem('lightbi-distribution-installation-id');
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('lightbi-distribution-installation-id', id);
  }
  return id;
}

function visitorId() {
  let id = localStorage.getItem('lightbi-distribution-visitor-id');
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('lightbi-distribution-visitor-id', id);
  }
  return id;
}

function trafficContext() {
  const query = new URLSearchParams(location.search);
  let referrerHost = null;
  try { referrerHost = document.referrer ? new URL(document.referrer).hostname : null; } catch { referrerHost = null; }
  return {
    visitorId: visitorId(), path: location.pathname, referrerHost,
    utmSource: query.get('utm_source'), utmMedium: query.get('utm_medium'), utmCampaign: query.get('utm_campaign'),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    environment: query.get('lightbi_env') === 'test' ? 'test' : 'production',
  };
}

function lineChart(rows, series, label) {
  const width = 920, height = 280, left = 45, right = 18, top = 20, bottom = 38;
  const values = rows.flatMap((row) => series.map((item) => Number(row[item.key]) || 0));
  const max = Math.max(1, ...values);
  const x = (index) => left + (rows.length <= 1 ? 0 : index * (width - left - right) / (rows.length - 1));
  const y = (value) => top + (height - top - bottom) * (1 - value / max);
  const paths = series.map((item) => {
    const points = rows.map((row, index) => `${x(index)},${y(Number(row[item.key]) || 0)}`).join(' ');
    const area = rows.length ? `M ${x(0)} ${height-bottom} L ${points.replaceAll(',', ' ')} L ${x(rows.length-1)} ${height-bottom} Z` : '';
    const marks = rows.map((row, index) => `<circle cx="${x(index)}" cy="${y(Number(row[item.key]) || 0)}" r="4" fill="${item.color}"><title>${row.day}: ${item.name} ${Number(row[item.key]) || 0}</title></circle>`).join('');
    return `${item.area ? `<path d="${area}" fill="${item.color}" opacity=".10"/>` : ''}<polyline points="${points}" fill="none" stroke="${item.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${marks}`;
  }).join('');
  const grid = [0,.25,.5,.75,1].map((ratio) => `<line x1="${left}" y1="${y(max*ratio)}" x2="${width-right}" y2="${y(max*ratio)}" stroke="#e7e9ef"/><text x="${left-8}" y="${y(max*ratio)+4}" text-anchor="end">${Math.round(max*ratio)}</text>`).join('');
  const tickEvery = Math.max(1, Math.ceil(rows.length / 5));
  const ticks = rows.map((row,index) => index % tickEvery === 0 || index === rows.length-1 ? `<text x="${x(index)}" y="${height-12}" text-anchor="middle">${String(row.day).slice(5)}</text>` : '').join('');
  return `<div class="chart-wrap"><svg class="admin-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}"><title>${label}</title>${grid}${paths}${ticks}</svg><div class="chart-legend">${series.map((item) => `<span><i style="background:${item.color}"></i>${item.name}</span>`).join('')}</div></div>`;
}

function donut(items) {
  const palette = ['#315bea','#7652dc','#12a779','#f59e0b','#e64e8b','#0891b2'];
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!total) return '<div class="empty-chart">No production installs yet</div>';
  let cursor = 0;
  const stops = items.map((item,index) => { const start=cursor; cursor += Number(item.value)/total*100; return `${palette[index%palette.length]} ${start}% ${cursor}%`; }).join(',');
  return `<div class="donut-layout"><div class="donut" style="background:conic-gradient(${stops})"><span>${total}<small>machines</small></span></div><div class="donut-legend">${items.map((item,index) => `<span><i style="background:${palette[index%palette.length]}"></i>${item.label}<b>${item.value}</b></span>`).join('')}</div></div>`;
}

function funnel(values) {
  const max = Math.max(1, ...values.map((item) => Number(item.value) || 0));
  return `<div class="funnel">${values.map((item) => `<div><span>${item.label}<b>${item.value}</b></span><i><em style="width:${Math.max(2,(Number(item.value)||0)/max*100)}%"></em></i></div>`).join('')}</div>`;
}

async function api(route, options) {
  const response = await fetch(`${routeBase}${route}`, { headers: { 'content-type': 'application/json' }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'request_failed');
  return body;
}

async function download() {
  const result = await api('/api/download', { method: 'POST', body: JSON.stringify({ ...trafficContext(), tier: 'basic', platform: 'windows' }) }).catch(() => ({ releaseUrl: state.config?.releaseUrl }));
  if (result.releaseUrl) location.href = result.releaseUrl;
}

async function checkout() {
  const button = document.querySelector('#checkout');
  button.disabled = true;
  try {
    const result = await api('/api/checkout', { method: 'POST', body: JSON.stringify({ installationId: installationId() }) });
    location.href = result.checkoutUrl;
  } catch {
    document.querySelector('#checkout-note').textContent = 'Pro checkout is not configured yet. Basic remains fully downloadable.';
    button.disabled = false;
  }
}

async function showCheckoutResult() {
  const sessionId = new URLSearchParams(location.search).get('session_id');
  if (!sessionId) return;
  const result = await api(`/api/checkout/status?session_id=${encodeURIComponent(sessionId)}&installation_id=${encodeURIComponent(installationId())}`).catch(() => null);
  if (result?.licenseKey) {
    const box = document.createElement('section');
    box.className = 'privacy shell';
    box.innerHTML = `<div><span class="eyebrow">PRO LICENSE READY</span><h2>Copy this key now</h2></div><p><code>${result.licenseKey}</code><br>This key is shown once. Activate it inside LightBI settings.</p>`;
    document.querySelector('main').prepend(box);
  }
}

async function admin() {
  if (!location.pathname.endsWith('/admin')) return false;
  const token = prompt('Distribution admin token');
  if (!token) return true;
  const response = await fetch(`${routeBase}/api/admin/stats?days=30`, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) {
    document.body.innerHTML = '<main class="admin-shell"><h1>Admin access denied</h1><p>Reload and enter the configured distribution token.</p></main>';
    return true;
  }
  const stats = await response.json();
  const d = stats.distribution || {};
  const totals = d.totals || {};
  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const dailyRows = (d.daily || []).map((row) => `<tr><td>${safe(String(row.day).slice(0,10))}</td><td>${safe(row.page_views)}</td><td>${safe(row.unique_visitors)}</td><td>${safe(row.downloads)}</td><td>${safe(row.active_machines)}</td></tr>`).join('');
  const campaignRows = (d.campaigns || []).map((row) => `<tr><td>${safe(row.campaign)}</td><td>${safe(row.visits)}</td><td>${safe(row.downloads)}</td></tr>`).join('');
  const trafficChart = lineChart(d.daily || [], [{ key: 'page_views', name: 'Page views', color: '#315bea', area: true }, { key: 'unique_visitors', name: 'Visitors', color: '#12a779' }], 'Daily website traffic');
  const activeChart = lineChart(d.daily || [], [{ key: 'active_machines', name: 'Active machines', color: '#7652dc', area: true }], 'Daily active machines');
  const funnelChart = funnel([{ label: 'Page views', value: totals.page_views || 0 }, { label: 'Unique visitors', value: totals.unique_visitors || 0 }, { label: 'Download clicks', value: totals.downloads || 0 }, { label: 'Basic installs', value: totals.basic_installs || 0 }, { label: 'Pro installs', value: totals.pro_installs || 0 }]);
  const safeItems = (items) => items.map((row) => ({ label: safe(row.label), value: Number(row.value) || 0 }));
  document.body.innerHTML = `<main class="admin-shell"><div class="admin-head"><div><span class="eyebrow">LIGHTBI DISTRIBUTION</span><h1>Privacy-safe release signals</h1><p>30-day view · PostgreSQL source · ${safe(d.cache || 'no')} cache · no IP, email or business-data collection</p></div><a class="button" href="${routeBase}/">Back to portal</a></div>
    <section class="admin-metrics"><article><small>PAGE VIEWS</small><strong>${safe(totals.page_views || 0)}</strong></article><article><small>UNIQUE VISITORS</small><strong>${safe(totals.unique_visitors || 0)}</strong></article><article><small>DOWNLOAD CLICKS</small><strong>${safe(totals.downloads || stats.downloads || 0)}</strong></article><article><small>BASIC INSTALLS</small><strong>${safe(totals.basic_installs || 0)}</strong></article><article><small>PRO INSTALLS</small><strong>${safe(totals.pro_installs || 0)}</strong></article><article><small>ACTIVE TODAY</small><strong>${safe(totals.daily_active || 0)}</strong></article></section>
    <section class="chart-card hero-chart"><div><span class="chart-kicker">WEBSITE</span><h2>Page views and visitors</h2></div>${trafficChart}</section>
    <section class="admin-grid charts"><article><span class="chart-kicker">PRODUCT</span><h2>Daily active machines</h2>${activeChart}</article><article><span class="chart-kicker">CONVERSION</span><h2>Distribution funnel</h2>${funnelChart}</article></section>
    <section class="admin-grid three charts"><article><span class="chart-kicker">AUDIENCE</span><h2>Visitor time zones</h2>${donut(safeItems(d.timezones || []))}</article><article><span class="chart-kicker">INSTALL BASE</span><h2>Platforms</h2>${donut(safeItems(d.platforms || []))}</article><article><span class="chart-kicker">RELEASE HEALTH</span><h2>Versions</h2>${donut(safeItems(d.versions || []))}</article></section>
    <section class="admin-grid"><article><h2>Campaign attribution</h2><div class="table-scroll"><table><thead><tr><th>Campaign/source</th><th>Visits</th><th>Downloads</th></tr></thead><tbody>${campaignRows}</tbody></table></div></article><article><h2>Current signals</h2><div class="signal-list"><span>PostgreSQL <b>primary</b></span><span>Redis <b>${safe(d.cache || 'off')}</b></span><span>Payment <b>waiting</b></span></div></article></section>
    <details class="detail-table"><summary>View daily source table</summary><div class="table-scroll"><table><thead><tr><th>Day</th><th>Views</th><th>Visitors</th><th>Downloads</th><th>Active machines</th></tr></thead><tbody>${dailyRows}</tbody></table></div></details></main>`;
  return true;
}

const isAdmin = location.pathname.endsWith('/admin');
state.config = await api('/api/config').catch(() => null);
if (state.config) {
  document.querySelector('#pro-price').textContent = state.config.proPriceLabel;
  if (!state.config.checkoutAvailable) document.querySelector('#checkout-note').textContent = 'Payment adapter ready; Stripe keys are not configured yet.';
}
document.querySelectorAll('[data-download]').forEach((button) => button.addEventListener('click', download));
document.querySelector('#download')?.addEventListener('click', (event) => { event.preventDefault(); download(); });
document.querySelector('#checkout')?.addEventListener('click', checkout);
await showCheckoutResult();
if (isAdmin) await admin();
else await api('/api/visit', { method: 'POST', body: JSON.stringify(trafficContext()) }).catch(() => null);
