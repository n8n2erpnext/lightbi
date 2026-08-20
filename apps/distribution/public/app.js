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

async function api(route, options) {
  const response = await fetch(`${routeBase}${route}`, { headers: { 'content-type': 'application/json' }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'request_failed');
  return body;
}

async function download() {
  const result = await api('/api/download', { method: 'POST', body: JSON.stringify({ tier: 'basic', platform: 'windows' }) }).catch(() => ({ releaseUrl: state.config?.releaseUrl }));
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
  if (location.pathname !== '/admin') return;
  const token = prompt('Distribution admin token');
  if (!token) return;
  const response = await fetch(`${routeBase}/api/admin/stats`, { headers: { authorization: `Bearer ${token}` } });
  const stats = await response.json();
  document.body.innerHTML = `<main class="section shell"><span class="eyebrow">LIGHTBI DISTRIBUTION</span><h1>Release telemetry</h1><div class="metric-grid"><article><small>BASIC INSTALLS</small><strong>${stats.installations?.basic ?? 0}</strong></article><article><small>PRO INSTALLS</small><strong>${stats.installations?.pro ?? 0}</strong></article><article><small>DOWNLOADS</small><strong>${stats.downloads ?? 0}</strong></article></div></main>`;
}

state.config = await api('/api/config').catch(() => null);
if (state.config) {
  document.querySelector('#pro-price').textContent = state.config.proPriceLabel;
  if (!state.config.checkoutAvailable) document.querySelector('#checkout-note').textContent = 'Payment adapter ready; Stripe keys are not configured yet.';
}
document.querySelectorAll('[data-download]').forEach((button) => button.addEventListener('click', download));
document.querySelector('#download')?.addEventListener('click', (event) => { event.preventDefault(); download(); });
document.querySelector('#checkout')?.addEventListener('click', checkout);
await showCheckoutResult();
await admin();
