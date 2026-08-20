import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(appDir, 'public');
const dataDir = process.env.LIGHTBI_DISTRIBUTION_DATA_DIR || path.join(appDir, 'data');
const port = Number(process.env.PORT || 5174);
const publicBaseUrl = (process.env.LIGHTBI_DISTRIBUTION_PUBLIC_URL || `http://localhost:${port}`).replace(/\/$/, '');
const releaseUrl = process.env.LIGHTBI_RELEASE_URL || 'https://github.com/n8n2erpnext/lightbi/releases/latest';
const proPriceLabel = process.env.LIGHTBI_PRO_PRICE_LABEL || 'Early access';
const installPepper = process.env.LIGHTBI_INSTALLATION_PEPPER || 'lightbi-public-installation-v1';

mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, 'distribution.sqlite'));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS installations (
    installation_hash TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'basic',
    app_version TEXT,
    platform TEXT,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    license_id TEXT
  );
  CREATE TABLE IF NOT EXISTS licenses (
    id TEXT PRIMARY KEY,
    license_hash TEXT UNIQUE NOT NULL,
    tier TEXT NOT NULL,
    status TEXT NOT NULL,
    max_devices INTEGER NOT NULL DEFAULT 3,
    stripe_session_id TEXT UNIQUE,
    installation_hash TEXT,
    delivery_value TEXT,
    delivered_at TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS license_installations (
    license_id TEXT NOT NULL,
    installation_hash TEXT NOT NULL,
    paired_at TEXT NOT NULL,
    PRIMARY KEY (license_id, installation_hash)
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    tier TEXT,
    app_version TEXT,
    platform TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS fulfilled_checkout_sessions (
    session_id TEXT PRIMARY KEY,
    fulfilled_at TEXT NOT NULL
  );
`);
if (!db.prepare('PRAGMA table_info(licenses)').all().some((column) => column.name === 'installation_hash')) {
  db.exec('ALTER TABLE licenses ADD COLUMN installation_hash TEXT');
}

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' };
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };

function sendJson(response, status, body) {
  response.writeHead(status, jsonHeaders);
  response.end(JSON.stringify(body));
}

function sha(value) {
  return createHash('sha256').update(`${installPepper}:${value}`).digest('hex');
}

function validInstallationId(value) {
  return typeof value === 'string' && /^[a-z0-9-]{20,80}$/i.test(value);
}

async function body(request, limit = 256_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error('payload_too_large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function verifyStripeSignature(payload, header, secret) {
  const values = Object.fromEntries(String(header || '').split(',').map((part) => part.split('=', 2)));
  const timestamp = Number(values.t);
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300 || !values.v1) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return safeEqual(expected, values.v1);
}

function licenseKey() {
  return `LBI-PRO-${randomBytes(20).toString('base64url').toUpperCase()}`;
}

function fulfillCheckout(session) {
  if (!session?.id || session.payment_status === 'unpaid') return;
  const exists = db.prepare('SELECT session_id FROM fulfilled_checkout_sessions WHERE session_id = ?').get(session.id);
  if (exists) return;
  const key = licenseKey();
  const id = `lic_${randomBytes(12).toString('hex')}`;
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO licenses (id, license_hash, tier, status, stripe_session_id, installation_hash, delivery_value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, sha(key), 'pro', 'active', session.id, session.client_reference_id || null, key, now);
    db.prepare('INSERT INTO fulfilled_checkout_sessions (session_id, fulfilled_at) VALUES (?, ?)').run(session.id, now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

async function createCheckout({ installationId }) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;
  if (!secret || !price) return null;
  const form = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    client_reference_id: sha(installationId),
    success_url: `${publicBaseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${publicBaseUrl}/?checkout=cancelled`,
  });
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const result = await response.json();
  if (!response.ok || !result.url) throw new Error(result?.error?.message || 'checkout_unavailable');
  return { checkoutUrl: result.url };
}

function serveStatic(requestPath, response) {
  const route = requestPath === '/' || requestPath === '/admin' ? '/index.html' : requestPath;
  if (route === '/logo.svg') {
    const file = path.resolve(appDir, '..', 'desktop', 'public', 'branding', 'lightbi-icon.svg');
    response.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=3600' });
    response.end(readFileSync(file));
    return true;
  }
  if (route.startsWith('/screenshots/')) {
    const allowed = new Set(['lightbi-deep-ba-step1.png', 'lightbi-deep-ba-step2.png', 'lightbi-multifile-executive.png', 'lightbi-advanced-mode.png']);
    const name = path.basename(route);
    if (!allowed.has(name)) return false;
    const file = path.resolve(appDir, '..', '..', 'assets', 'screenshots', name);
    response.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'public, max-age=3600' });
    response.end(readFileSync(file));
    return true;
  }
  const file = path.resolve(publicDir, `.${route}`);
  if (!file.startsWith(publicDir)) return false;
  try {
    response.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
    response.end(readFileSync(file));
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', publicBaseUrl);
  try {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'content-type,authorization,stripe-signature',
      });
      return response.end();
    }
    if (request.method === 'GET' && url.pathname === '/api/config') {
      return sendJson(response, 200, {
        productId: 'digital.thaiduy.lightbi', releaseUrl, proPriceLabel,
        checkoutAvailable: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID),
      });
    }
    if (request.method === 'POST' && url.pathname === '/api/pair') {
      const payload = JSON.parse((await body(request)).toString('utf8'));
      if (!validInstallationId(payload.installationId)) return sendJson(response, 400, { error: 'invalid_installation_id' });
      if (payload.telemetryConsent === false) return sendJson(response, 200, { paired: false, tier: 'basic' });
      const installationHash = sha(payload.installationId);
      const now = new Date().toISOString();
      db.prepare(`INSERT INTO installations (installation_hash, product_id, tier, app_version, platform, first_seen_at, last_seen_at)
        VALUES (?, ?, 'basic', ?, ?, ?, ?)
        ON CONFLICT(installation_hash) DO UPDATE SET app_version=excluded.app_version, platform=excluded.platform, last_seen_at=excluded.last_seen_at`)
        .run(installationHash, 'digital.thaiduy.lightbi', String(payload.appVersion || ''), String(payload.platform || ''), now, now);
      const installation = db.prepare('SELECT tier FROM installations WHERE installation_hash = ?').get(installationHash);
      return sendJson(response, 200, { paired: true, tier: installation?.tier || 'basic' });
    }
    if (request.method === 'POST' && url.pathname === '/api/download') {
      const payload = JSON.parse((await body(request)).toString('utf8') || '{}');
      db.prepare('INSERT INTO events (kind, tier, app_version, platform, created_at) VALUES (?, ?, ?, ?, ?)')
        .run('download', payload.tier === 'pro' ? 'pro' : 'basic', String(payload.appVersion || ''), String(payload.platform || 'windows'), new Date().toISOString());
      return sendJson(response, 202, { releaseUrl });
    }
    if (request.method === 'POST' && url.pathname === '/api/license/activate') {
      const payload = JSON.parse((await body(request)).toString('utf8'));
      if (!validInstallationId(payload.installationId) || typeof payload.licenseKey !== 'string') return sendJson(response, 400, { error: 'invalid_activation' });
      const license = db.prepare("SELECT id, tier, max_devices FROM licenses WHERE license_hash = ? AND status = 'active'").get(sha(payload.licenseKey));
      if (!license) return sendJson(response, 404, { error: 'license_not_found' });
      const installationHash = sha(payload.installationId);
      const current = db.prepare('SELECT COUNT(*) AS count FROM license_installations WHERE license_id = ?').get(license.id)?.count || 0;
      const already = db.prepare('SELECT 1 FROM license_installations WHERE license_id = ? AND installation_hash = ?').get(license.id, installationHash);
      if (!already && current >= license.max_devices) return sendJson(response, 409, { error: 'device_limit_reached' });
      const now = new Date().toISOString();
      db.prepare('INSERT OR IGNORE INTO license_installations (license_id, installation_hash, paired_at) VALUES (?, ?, ?)').run(license.id, installationHash, now);
      db.prepare("UPDATE installations SET tier = 'pro', license_id = ?, last_seen_at = ? WHERE installation_hash = ?").run(license.id, now, installationHash);
      return sendJson(response, 200, { tier: 'pro', active: true });
    }
    if (request.method === 'POST' && url.pathname === '/api/checkout') {
      const payload = JSON.parse((await body(request)).toString('utf8'));
      if (!validInstallationId(payload.installationId)) return sendJson(response, 400, { error: 'invalid_installation_id' });
      const checkout = await createCheckout(payload);
      return checkout ? sendJson(response, 200, checkout) : sendJson(response, 503, { error: 'checkout_not_configured' });
    }
    if (request.method === 'POST' && url.pathname === '/api/webhooks/stripe') {
      const raw = await body(request);
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!secret || !verifyStripeSignature(raw, request.headers['stripe-signature'], secret)) return sendJson(response, 400, { error: 'invalid_signature' });
      const event = JSON.parse(raw.toString('utf8'));
      if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) fulfillCheckout(event.data?.object);
      return sendJson(response, 200, { received: true });
    }
    if (request.method === 'GET' && url.pathname === '/api/checkout/status') {
      const sessionId = url.searchParams.get('session_id');
      const installationId = url.searchParams.get('installation_id');
      if (!validInstallationId(installationId)) return sendJson(response, 400, { error: 'invalid_installation_id' });
      const license = sessionId && db.prepare('SELECT id, tier, installation_hash, delivery_value, delivered_at FROM licenses WHERE stripe_session_id = ?').get(sessionId);
      if (!license) return sendJson(response, 202, { ready: false });
      if (!license.installation_hash || !safeEqual(license.installation_hash, sha(installationId))) return sendJson(response, 403, { error: 'installation_mismatch' });
      const value = license.delivered_at ? null : license.delivery_value;
      if (value) db.prepare('UPDATE licenses SET delivered_at = ?, delivery_value = NULL WHERE id = ?').run(new Date().toISOString(), license.id);
      return sendJson(response, 200, { ready: true, tier: license.tier, licenseKey: value });
    }
    if (request.method === 'GET' && url.pathname === '/api/admin/stats') {
      const expected = process.env.LIGHTBI_DISTRIBUTION_ADMIN_TOKEN;
      const supplied = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (!expected || !safeEqual(expected, supplied)) return sendJson(response, 401, { error: 'unauthorized' });
      const tiers = Object.fromEntries(db.prepare('SELECT tier, COUNT(*) AS count FROM installations GROUP BY tier').all().map((row) => [row.tier, row.count]));
      const downloads = db.prepare("SELECT COUNT(*) AS count FROM events WHERE kind = 'download'").get()?.count || 0;
      const activeLicenses = db.prepare("SELECT COUNT(*) AS count FROM licenses WHERE status = 'active'").get()?.count || 0;
      return sendJson(response, 200, { installations: { basic: tiers.basic || 0, pro: tiers.pro || 0 }, downloads, activeLicenses });
    }
    if (request.method === 'GET' && serveStatic(url.pathname, response)) return;
    sendJson(response, 404, { error: 'not_found' });
  } catch (error) {
    sendJson(response, error?.message === 'payload_too_large' ? 413 : 500, { error: 'request_failed' });
  }
});

server.listen(port, '0.0.0.0', () => console.log(`LightBI Distribution listening on ${port}`));

export { db, server, sha, validInstallationId, verifyStripeSignature };
