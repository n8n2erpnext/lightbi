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
    environment: query.get('lightbi_env') === 'test' ? 'test' : 'production',
  };
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
  document.body.innerHTML = `<main class="admin-shell"><div class="admin-head"><div><span class="eyebrow">LIGHTBI DISTRIBUTION</span><h1>Privacy-safe release signals</h1><p>30-day view · PostgreSQL source · ${safe(d.cache || 'no')} cache · no IP, email or business-data collection</p></div><a class="button" href="${routeBase}/">Back to portal</a></div>
    <section class="admin-metrics"><article><small>PAGE VIEWS</small><strong>${safe(totals.page_views || 0)}</strong></article><article><small>UNIQUE VISITORS</small><strong>${safe(totals.unique_visitors || 0)}</strong></article><article><small>DOWNLOAD CLICKS</small><strong>${safe(totals.downloads || stats.downloads || 0)}</strong></article><article><small>BASIC INSTALLS</small><strong>${safe(totals.basic_installs || 0)}</strong></article><article><small>PRO INSTALLS</small><strong>${safe(totals.pro_installs || 0)}</strong></article><article><small>ACTIVE TODAY</small><strong>${safe(totals.daily_active || 0)}</strong></article></section>
    <section class="admin-grid"><article><h2>Daily funnel signals</h2><div class="table-scroll"><table><thead><tr><th>Day</th><th>Views</th><th>Visitors</th><th>Downloads</th><th>Active machines</th></tr></thead><tbody>${dailyRows}</tbody></table></div></article><article><h2>Campaign attribution</h2><div class="table-scroll"><table><thead><tr><th>Campaign/source</th><th>Visits</th><th>Downloads</th></tr></thead><tbody>${campaignRows}</tbody></table></div></article></section>
    <section class="admin-grid"><article><h2>Installed platforms</h2><div class="signal-list">${(d.platforms || []).map((row) => `<span>${safe(row.label)} <b>${safe(row.value)}</b></span>`).join('') || '<span>No production installs yet</span>'}</div></article><article><h2>Installed versions</h2><div class="signal-list">${(d.versions || []).map((row) => `<span>${safe(row.label)} <b>${safe(row.value)}</b></span>`).join('') || '<span>No production installs yet</span>'}</div></article></section></main>`;
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
