const state = { config: null, catalog: null };
const portalBase = location.pathname.startsWith('/distribution') ? '/distribution' : '';
const routeBase = portalBase || '/distribution-api';
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

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

function visitId() {
  let id = sessionStorage.getItem('lightbi-distribution-visit-id');
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('lightbi-distribution-visit-id', id);
    sessionStorage.setItem('lightbi-distribution-visit-start', String(Date.now()));
  }
  return id;
}

function clientProfile() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Other';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Other';
  const device = /Mobi|Android|iPhone/.test(ua) ? 'Mobile' : /iPad|Tablet/.test(ua) ? 'Tablet' : 'Desktop';
  return { browser, os, device, language: navigator.language || null };
}

function trafficContext() {
  const query = new URLSearchParams(location.search);
  let referrerHost = null;
  try { referrerHost = document.referrer ? new URL(document.referrer).hostname : null; } catch { referrerHost = null; }
  return {
    visitorId: visitorId(), visitId: visitId(), path: location.pathname, referrerHost,
    utmSource: query.get('utm_source'), utmMedium: query.get('utm_medium'), utmCampaign: query.get('utm_campaign'),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    environment: query.get('lightbi_env') === 'test' ? 'test' : 'production',
    ...clientProfile(),
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

function timezoneLabel(zone) {
  if (!zone || zone === 'Unknown') return 'Unknown (historic data)';
  try {
    const offset = new Intl.DateTimeFormat('en', { timeZone: zone, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find((part) => part.type === 'timeZoneName')?.value;
    return `${zone}${offset ? ` (${offset.replace('GMT','UTC')})` : ''}`;
  } catch { return zone; }
}

async function api(route, options) {
  const response = await fetch(`${routeBase}${route}`, { headers: { 'content-type': 'application/json' }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'request_failed');
  return body;
}

function preferredPlatform() {
  const profile = clientProfile();
  return profile.os === 'Windows' ? 'windows' : profile.os === 'Linux' ? 'linux' : profile.os === 'macOS' ? 'macos' : null;
}

function platformLabel(platform) {
  return platform === 'windows' ? 'Windows' : platform === 'linux' ? 'Linux' : platform === 'macos' ? 'macOS' : platform;
}

async function download(platform = preferredPlatform() || 'windows', architecture = null) {
  const result = await api('/api/download', { method: 'POST', body: JSON.stringify({ ...trafficContext(), tier: 'basic', platform, architecture }) }).catch(() => ({ releaseUrl: state.config?.releaseUrl }));
  if (result.releaseUrl) location.href = result.releaseUrl;
}

function renderReleaseCatalog() {
  const target = document.querySelector('#release-list');
  if (!target) return;
  const releases = state.catalog?.releases || [];
  if (!releases.length) {
    target.innerHTML = `<article class="release-card"><h3>Release catalog temporarily unavailable</h3><p>Use the GitHub archive while the primary mirror reconnects.</p><a class="button dark" href="${state.config?.releaseUrl || 'https://github.com/n8n2erpnext/lightbi/releases'}">GitHub download</a></article>`;
    return;
  }
  target.innerHTML = releases.slice(0,3).map((release) => `<article class="release-card"><span class="pill">${escapeHtml(release.channel)}</span><h3>LightBI ${escapeHtml(release.version)}</h3><p>${escapeHtml(String(release.published_at).slice(0,10))} · ${escapeHtml(release.release_notes || 'Release update')}</p><div class="artifact-actions">${(release.artifacts||[]).map((artifact) => `<a class="button dark" href="${escapeHtml(artifact.url)}" data-release-download data-platform="${escapeHtml(artifact.platform)}">${platformLabel(artifact.platform)} · ${escapeHtml(artifact.architecture)}</a>`).join('')}</div></article>`).join('');
  target.querySelectorAll('[data-release-download]').forEach((link) => link.addEventListener('click', () => { void api('/api/download', { method:'POST', body:JSON.stringify({ ...trafficContext(), tier:'basic', platform:link.dataset.platform }) }).catch(()=>null); }));
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
  const params = new URLSearchParams(location.search);
  const requestedDays = Number(params.get('days'));
  const days = [7, 30, 90, 365].includes(requestedDays) ? requestedDays : 30;
  const resetToken = params.get('reset');
  if (resetToken) {
    document.body.innerHTML = `<main class="login-shell"><form class="login-card" id="admin-reset"><span class="eyebrow">LIGHTBI DISTRIBUTION</span><h1>Set a new password</h1><p>Use at least 16 characters. This reset link works once and expires after 15 minutes.</p><label>New password<input name="password" type="password" autocomplete="new-password" minlength="16" required></label><label>Confirm password<input name="confirm" type="password" autocomplete="new-password" minlength="16" required></label><button class="button dark" type="submit">Update password</button><small id="login-error" role="alert"></small></form></main>`;
    document.querySelector('#admin-reset').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      if (form.get('password') !== form.get('confirm')) return document.querySelector('#login-error').textContent = 'Passwords do not match.';
      const response = await fetch(`${routeBase}/api/admin/password/reset`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: resetToken, password: form.get('password') }) });
      if (response.ok) location.href = `${portalBase}/admin`;
      else document.querySelector('#login-error').textContent = 'This reset link is invalid or expired.';
    });
    return true;
  }
  const sessionResponse = await fetch(`${routeBase}/api/admin/session`);
  if (!sessionResponse.ok) {
    document.body.innerHTML = `<main class="login-shell"><form class="login-card" id="admin-login"><span class="eyebrow">LIGHTBI DISTRIBUTION</span><h1>Admin sign in</h1><p>One protected account for analytics, installs, licenses and Pro revenue.</p><label>Email<input name="email" type="email" autocomplete="username" required value="me@thaiduy.digital"></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button class="button dark" type="submit">Sign in</button><button class="login-link" type="button" id="forgot-password">Email a reset link</button><small id="login-error" role="alert"></small></form></main>`;
    document.querySelector('#admin-login').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const response = await fetch(`${routeBase}/api/admin/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
      if (response.ok) location.reload();
      else document.querySelector('#login-error').textContent = response.status === 429 ? 'Too many attempts. Try again later.' : 'Email or password is incorrect.';
    });
    document.querySelector('#forgot-password').addEventListener('click', async () => {
      const email = document.querySelector('input[name="email"]').value;
      const response = await fetch(`${routeBase}/api/admin/password/request`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
      document.querySelector('#login-error').textContent = response.ok ? 'If the account exists, a reset link has been sent.' : 'Email service is temporarily unavailable.';
    });
    return true;
  }
  const tab = params.get('tab') === 'revenue' ? 'revenue' : params.get('tab') === 'app' ? 'app' : params.get('tab') === 'licenses' ? 'licenses' : 'analytics';
  if (tab === 'licenses') {
    const response = await fetch(`${routeBase}/api/admin/licenses`);
    if (!response.ok) return true;
    const data = await response.json();
    const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const rows = (data.licenses || []).map((item) => `<tr><td>${safe(item.label||'—')}</td><td>${safe(String(item.kind).replaceAll('_',' '))}</td><td>${safe(item.status)}</td><td>${safe(item.discount_percent??'—')}%</td><td>${safe(item.devices)}/${safe(item.max_devices)}</td><td>${safe(item.expires_at?String(item.expires_at).slice(0,10):'Never')}</td><td>${item.status==='active'?`<button class="table-action" data-license-action="rotate" data-license-id="${safe(item.id)}">Rotate</button><button class="table-action danger" data-license-action="revoke" data-license-id="${safe(item.id)}">Revoke</button>`:'—'}</td></tr>`).join('');
    document.body.innerHTML = `<main class="admin-shell"><div class="admin-head"><div><span class="eyebrow">LIGHTBI DISTRIBUTION</span><h1>License management</h1><p>Create, email, rotate and revoke Pro keys. Plaintext keys are never stored.</p><nav class="admin-tabs"><a href="${portalBase}/admin">Analytics</a><a href="${portalBase}/admin?tab=app">App usage</a><a class="active" href="${portalBase}/admin?tab=licenses">Licenses</a><a href="${portalBase}/admin?tab=revenue">Pro revenue</a></nav></div><button class="button" data-admin-logout>Sign out</button></div><section class="license-create"><form id="license-create"><label>Campaign/partner label<input name="label" required maxlength="120" placeholder="Beta partner campaign"></label><label>Key type<select name="kind"><option value="complimentary">Complimentary Pro</option><option value="partner_discount">Partner discount</option></select></label><label>Discount %<input name="discountPercent" type="number" min="1" max="100" value="100"></label><label>Max devices<input name="maxDevices" type="number" min="1" max="100" value="3"></label><label>Expires<input name="expiresAt" type="date"></label><label>Email key to<input name="email" type="email" placeholder="customer@example.com"></label><button class="button dark" type="submit">Generate Pro key</button></form><div class="one-time-key" id="one-time-key">New keys appear here once.</div></section><section class="chart-card"><h2>Issued licenses</h2><div class="table-scroll"><table><thead><tr><th>Label</th><th>Type</th><th>Status</th><th>Discount</th><th>Devices</th><th>Expires</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div></section></main>`;
    document.querySelector('#license-create').addEventListener('submit', async (event) => {
      event.preventDefault(); const form = Object.fromEntries(new FormData(event.currentTarget));
      const result = await fetch(`${routeBase}/api/admin/licenses`, { method:'POST', headers:{'content-type':'application/json','x-lightbi-admin-action':'1'}, body:JSON.stringify(form) });
      const payload = await result.json();
      document.querySelector('#one-time-key').textContent = result.ok ? `Copy now: ${payload.licenseKey}${form.email?' · emailed':''}` : `Could not generate key: ${payload.error||'request failed'}`;
    });
    document.querySelectorAll('[data-license-action]').forEach((button) => button.addEventListener('click', async () => {
      const action = button.dataset.licenseAction; if (action==='revoke' && !confirm('Revoke this key and downgrade its paired machines to Basic?')) return;
      const email = action==='rotate' ? prompt('Email the replacement key to (optional):') : null;
      const result = await fetch(`${routeBase}/api/admin/licenses/${encodeURIComponent(button.dataset.licenseId)}/${action}`, { method:'POST', headers:{'content-type':'application/json','x-lightbi-admin-action':'1'}, body:JSON.stringify({email}) });
      const payload = await result.json();
      if (result.ok && payload.licenseKey) alert(`Replacement key (copy now): ${payload.licenseKey}`);
      if (result.ok) location.reload(); else alert(payload.error||'License action failed');
    }));
    document.querySelector('[data-admin-logout]').addEventListener('click', async () => { await fetch(`${routeBase}/api/admin/logout`, { method: 'POST' }); location.reload(); });
    return true;
  }
  if (tab === 'app') {
    const response = await fetch(`${routeBase}/api/admin/app-usage?days=${days}`);
    if (!response.ok) return true;
    const usage = await response.json();
    const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const totals = usage.totals || {};
    const duration = Number(totals.average_duration_seconds || 0);
    const usageChart = lineChart(usage.daily || [], [{ key: 'sessions', name: 'App sessions', color: '#315bea', area: true }, { key: 'active_machines', name: 'Active machines', color: '#12a779' }], 'App sessions and active machines');
    const rangeLinks = [{d:7,l:'Week'},{d:30,l:'Month'},{d:90,l:'Quarter'},{d:365,l:'Year'}].map((item) => `<a class="range-link ${days===item.d?'active':''}" href="${portalBase}/admin?tab=app&days=${item.d}">${item.l}</a>`).join('');
    const featureRows = (usage.features || []).map((row) => `<tr><td>${safe(String(row.label).replaceAll('_',' '))}</td><td>${safe(row.value)}</td><td>${safe(row.machines)}</td></tr>`).join('');
    document.body.innerHTML = `<main class="admin-shell"><div class="admin-head"><div><span class="eyebrow">LIGHTBI DISTRIBUTION</span><h1>App usage</h1><p>${days}-day privacy-safe native-app activity · no file names, SQL, table names or business data</p><nav class="admin-tabs"><a href="${portalBase}/admin?days=${days}">Analytics</a><a class="active" href="${portalBase}/admin?tab=app&days=${days}">App usage</a><a href="${portalBase}/admin?tab=licenses">Licenses</a><a href="${portalBase}/admin?tab=revenue&days=${days}">Pro revenue</a></nav><nav class="range-nav">${rangeLinks}</nav></div><button class="button" data-admin-logout>Sign out</button></div><section class="admin-metrics"><article><small>APP SESSIONS</small><strong>${safe(totals.sessions||0)}</strong></article><article><small>ACTIVE MACHINES</small><strong>${safe(totals.machines||0)}</strong></article><article><small>AVG OPEN TIME</small><strong>${safe(duration>=60?`${Math.floor(duration/60)}m ${duration%60}s`:`${duration}s`)}</strong></article><article><small>EASY MODE</small><strong>${safe(totals.easy_mode||0)}</strong></article><article><small>ADVANCED MODE</small><strong>${safe(totals.advanced_mode||0)}</strong></article><article><small>DATABASE EDITS</small><strong>${safe(totals.database_edits||0)}</strong></article></section><section class="chart-card"><span class="chart-kicker">NATIVE APP</span><h2>Sessions and active machines</h2>${usageChart}</section><section class="admin-grid"><article><h2>Feature use</h2><div class="table-scroll"><table><thead><tr><th>Feature</th><th>Uses</th><th>Machines</th></tr></thead><tbody>${featureRows}</tbody></table></div></article><article><h2>Platforms</h2>${donut((usage.platforms||[]).map((row)=>({label:safe(row.label),value:Number(row.value)||0})))}</article></section><section class="admin-grid"><article><h2>Versions</h2>${donut((usage.versions||[]).map((row)=>({label:safe(row.label),value:Number(row.value)||0})))}</article><article><h2>Governed telemetry</h2><div class="signal-list"><span>Easy/Advanced <b>mode only</b></span><span>DB edit <b>event only</b></span><span>SQL/data <b>never sent</b></span></div></article></section></main>`;
    document.querySelector('[data-admin-logout]').addEventListener('click', async () => { await fetch(`${routeBase}/api/admin/logout`, { method: 'POST' }); location.reload(); });
    return true;
  }
  if (tab === 'revenue') {
    const response = await fetch(`${routeBase}/api/admin/revenue?days=${days}`);
    if (!response.ok) return true;
    const revenue = await response.json();
    const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const money = (minor, currency) => currency === 'N/A' ? String(minor || 0) : new Intl.NumberFormat(undefined, { style: 'currency', currency }).format((Number(minor) || 0) / 100);
    const currencyCards = (revenue.currencies || []).map((row) => `<article><small>GROSS ${safe(row.currency)}</small><strong>${safe(money(row.gross_minor,row.currency))}</strong><span>${safe(row.orders)} paid orders · avg ${safe(money(row.average_minor,row.currency))}</span></article>`).join('') || '<article><small>GROSS REVENUE</small><strong>0</strong><span>No Pro payments yet</span></article>';
    const firstCurrency = revenue.currencies?.[0]?.currency;
    const revenueSeries = (revenue.daily || []).filter((row) => !firstCurrency || row.currency === firstCurrency).map((row) => ({ day: row.day, gross: Number(row.gross_minor) / 100 }));
    const revenueChart = lineChart(revenueSeries, [{ key: 'gross', name: firstCurrency ? `Revenue ${firstCurrency}` : 'Revenue', color: '#12a779', area: true }], 'Pro revenue over time');
    const rangeLinks = [{d:7,l:'Week'},{d:30,l:'Month'},{d:90,l:'Quarter'},{d:365,l:'Year'}].map((item) => `<a class="range-link ${days===item.d?'active':''}" href="${portalBase}/admin?tab=revenue&days=${item.d}">${item.l}</a>`).join('');
    document.body.innerHTML = `<main class="admin-shell"><div class="admin-head"><div><span class="eyebrow">LIGHTBI DISTRIBUTION</span><h1>Pro revenue</h1><p>${days}-day view · payment adapter ${revenue.paymentConfigured?'active':'waiting for Stripe configuration'}</p><nav class="admin-tabs"><a href="${portalBase}/admin?days=${days}">Analytics</a><a href="${portalBase}/admin?tab=app&days=${days}">App usage</a><a href="${portalBase}/admin?tab=licenses">Licenses</a><a class="active" href="${portalBase}/admin?tab=revenue&days=${days}">Pro revenue</a></nav><nav class="range-nav">${rangeLinks}</nav></div><button class="button" data-admin-logout>Sign out</button></div><section class="admin-metrics">${currencyCards}<article><small>PAID ORDERS</small><strong>${safe(revenue.paidOrders)}</strong></article><article><small>ACTIVE LICENSES</small><strong>${safe(revenue.activeLicenses)}</strong></article></section><section class="chart-card"><span class="chart-kicker">REVENUE</span><h2>Paid Pro revenue</h2>${revenueChart}</section><section class="chart-card"><h2>Revenue records</h2><div class="table-scroll"><table><thead><tr><th>Day</th><th>Currency</th><th>Gross</th><th>Orders</th></tr></thead><tbody>${(revenue.daily||[]).map((row)=>`<tr><td>${safe(row.day)}</td><td>${safe(row.currency)}</td><td>${safe(money(row.gross_minor,row.currency))}</td><td>${safe(row.orders)}</td></tr>`).join('')}</tbody></table></div></section></main>`;
    document.querySelector('[data-admin-logout]').addEventListener('click', async () => { await fetch(`${routeBase}/api/admin/logout`, { method: 'POST' }); location.reload(); });
    return true;
  }
  const response = await fetch(`${routeBase}/api/admin/stats?days=${days}`);
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
  const pageRows = (d.pages || []).map((row) => `<tr><td>${safe(row.label)}</td><td>${safe(row.visitors)}</td><td>${safe(row.views)}</td></tr>`).join('');
  const referrerRows = (d.referrers || []).map((row) => `<tr><td>${safe(row.label)}</td><td>${safe(row.visitors)}</td></tr>`).join('');
  const trafficChart = lineChart(d.daily || [], [{ key: 'page_views', name: 'Page views', color: '#315bea', area: true }, { key: 'unique_visitors', name: 'Visitors', color: '#12a779' }], 'Daily website traffic');
  const activeChart = lineChart(d.daily || [], [{ key: 'active_machines', name: 'Active machines', color: '#7652dc', area: true }], 'Daily active machines');
  const funnelChart = funnel([{ label: 'Page views', value: totals.page_views || 0 }, { label: 'Unique visitors', value: totals.unique_visitors || 0 }, { label: 'Download clicks', value: totals.downloads || 0 }, { label: 'Basic installs', value: totals.basic_installs || 0 }, { label: 'Pro installs', value: totals.pro_installs || 0 }]);
  const safeItems = (items) => items.map((row) => ({ label: safe(row.label), value: Number(row.value) || 0 }));
  const timezoneItems = (d.timezones || []).map((row) => ({ label: safe(timezoneLabel(row.label)), value: Number(row.value) || 0 }));
  const formatDuration = (seconds) => seconds >= 60 ? `${Math.floor(seconds/60)}m ${seconds%60}s` : `${seconds || 0}s`;
  const rangeLinks = [{d:7,l:'Week'},{d:30,l:'Month'},{d:90,l:'Quarter'},{d:365,l:'Year'}].map((item) => `<a class="range-link ${days===item.d?'active':''}" href="${portalBase}/admin?days=${item.d}">${item.l}</a>`).join('');
  document.body.innerHTML = `<main class="admin-shell"><div class="admin-head"><div><span class="eyebrow">LIGHTBI DISTRIBUTION</span><h1>Privacy-safe release signals</h1><p>${days}-day view · PostgreSQL source · ${safe(d.cache || 'no')} cache · no raw IP or business-data collection</p><nav class="admin-tabs"><a class="active" href="${portalBase}/admin?days=${days}">Analytics</a><a href="${portalBase}/admin?tab=app&days=${days}">App usage</a><a href="${portalBase}/admin?tab=licenses">Licenses</a><a href="${portalBase}/admin?tab=revenue&days=${days}">Pro revenue</a></nav><nav class="range-nav">${rangeLinks}</nav></div><button class="button" data-admin-logout>Sign out</button></div>
    <section class="admin-metrics"><article><small>VISITORS</small><strong>${safe(totals.unique_visitors || 0)}</strong></article><article><small>VISITS</small><strong>${safe(totals.visits || 0)}</strong></article><article><small>VIEWS</small><strong>${safe(totals.page_views || 0)}</strong></article><article><small>ANON NETWORKS</small><strong>${safe(totals.anonymous_networks || 0)}</strong></article><article><small>BOUNCE RATE</small><strong>${safe(totals.bounce_rate || 0)}%</strong></article><article><small>VISIT DURATION</small><strong>${safe(formatDuration(totals.visit_duration_seconds || 0))}</strong></article><article><small>ACTIVE NOW</small><strong>${safe(totals.active_visitors || 0)}</strong></article><article><small>DOWNLOAD CLICKS</small><strong>${safe(totals.downloads || 0)}</strong></article><article><small>TOTAL MACHINES</small><strong>${safe(totals.total_machines || 0)}</strong></article><article><small>BASIC INSTALLS</small><strong>${safe(totals.basic_installs || 0)}</strong></article><article><small>PRO INSTALLS</small><strong>${safe(totals.pro_installs || 0)}</strong></article><article><small>ACTIVE MACHINES TODAY</small><strong>${safe(totals.daily_active || 0)}</strong></article></section>
    <section class="chart-card hero-chart"><div><span class="chart-kicker">WEBSITE</span><h2>Page views and visitors</h2></div>${trafficChart}</section>
    <section class="admin-grid charts"><article><span class="chart-kicker">PRODUCT</span><h2>Daily active machines</h2>${activeChart}</article><article><span class="chart-kicker">CONVERSION</span><h2>Distribution funnel</h2>${funnelChart}</article></section>
    <section class="admin-grid three charts"><article><span class="chart-kicker">AUDIENCE</span><h2>Visitor time zones</h2>${donut(timezoneItems)}</article><article><span class="chart-kicker">INSTALL BASE</span><h2>Platforms</h2>${donut(safeItems(d.platforms || []))}</article><article><span class="chart-kicker">RELEASE HEALTH</span><h2>Versions</h2>${donut(safeItems(d.versions || []))}</article></section>
    <section class="admin-grid"><article><h2>Pages</h2><div class="table-scroll"><table><thead><tr><th>Path</th><th>Visitors</th><th>Views</th></tr></thead><tbody>${pageRows}</tbody></table></div></article><article><h2>Sources</h2><div class="table-scroll"><table><thead><tr><th>Referrer</th><th>Visitors</th></tr></thead><tbody>${referrerRows}</tbody></table></div></article></section>
    <section class="admin-grid three charts"><article><span class="chart-kicker">CLIENT</span><h2>Browsers</h2>${donut(safeItems(d.browsers || []))}</article><article><span class="chart-kicker">CLIENT</span><h2>Operating systems</h2>${donut(safeItems(d.operatingSystems || []))}</article><article><span class="chart-kicker">CLIENT</span><h2>Devices</h2>${donut(safeItems(d.devices || []))}</article></section>
    <section class="admin-grid"><article><h2>Campaign attribution</h2><div class="table-scroll"><table><thead><tr><th>Campaign/source</th><th>Visits</th><th>Downloads</th></tr></thead><tbody>${campaignRows}</tbody></table></div></article><article><h2>Languages</h2>${donut(safeItems(d.languages || []))}</article></section>
    <details class="detail-table"><summary>View daily source table</summary><div class="table-scroll"><table><thead><tr><th>Day</th><th>Views</th><th>Visitors</th><th>Downloads</th><th>Active machines</th></tr></thead><tbody>${dailyRows}</tbody></table></div></details></main>`;
  document.querySelector('[data-admin-logout]').addEventListener('click', async () => { await fetch(`${routeBase}/api/admin/logout`, { method: 'POST' }); location.reload(); });
  return true;
}

const isAdmin = location.pathname.endsWith('/admin');
state.config = await api('/api/config').catch(() => null);
state.catalog = await api('/api/releases').catch(() => null);
renderReleaseCatalog();
const recommended = preferredPlatform();
document.querySelectorAll('[data-download],#download').forEach((button) => {
  if (recommended) button.textContent = `Download for ${platformLabel(recommended)}`;
  else button.textContent = 'Choose a download';
});
if (state.config) {
  document.querySelector('#pro-price').textContent = state.config.proPriceLabel;
  if (!state.config.checkoutAvailable) document.querySelector('#checkout-note').textContent = 'Payment adapter ready; Stripe keys are not configured yet.';
}
document.querySelectorAll('[data-download]').forEach((button) => button.addEventListener('click', () => { if (recommended) void download(recommended); else location.hash = 'other-downloads'; }));
document.querySelector('#download')?.addEventListener('click', (event) => { event.preventDefault(); if (recommended) void download(recommended); else location.hash = 'other-downloads'; });
document.querySelector('#checkout')?.addEventListener('click', checkout);
await showCheckoutResult();
if (isAdmin) await admin();
else await api('/api/visit', { method: 'POST', body: JSON.stringify(trafficContext()) }).catch(() => null);

if (!isAdmin) addEventListener('pagehide', () => {
  const startedAt = Number(sessionStorage.getItem('lightbi-distribution-visit-start')) || Date.now();
  fetch(`${routeBase}/api/visit/end`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: true,
    body: JSON.stringify({ ...trafficContext(), durationSeconds: Math.max(0, (Date.now() - startedAt) / 1000) }),
  }).catch(() => null);
}, { once: true });
