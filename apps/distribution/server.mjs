import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDistributionAnalytics } from './analytics.mjs';
import { createAdminAuth } from './admin-auth.mjs';
import { createMailer } from './mailer.mjs';
import { loadReleaseCatalog, selectArtifact } from './release-manifest.mjs';
import { createAccountAuth } from './account-auth.mjs';
import { createLicenseSecretCache } from './license-secret-cache.mjs';
import { accountPublicUrls, normalizePublicOrigin } from './public-url-contract.mjs';
import { licenseGrantsPro } from './license-policy.mjs';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(appDir, 'public');
const dataDir = process.env.LIGHTBI_DISTRIBUTION_DATA_DIR || path.join(appDir, 'data');
const port = Number(process.env.PORT || 5174);
const publicBaseUrl = normalizePublicOrigin(process.env.LIGHTBI_DISTRIBUTION_PUBLIC_URL, `http://localhost:${port}`);
const publicUrls = accountPublicUrls(publicBaseUrl);
const releaseUrl = process.env.LIGHTBI_RELEASE_URL || 'https://github.com/n8n2erpnext/lightbi/releases/latest';
const releaseManifestUrl = process.env.LIGHTBI_RELEASE_MANIFEST_URL || 'https://drive.thaiduy.store/release/lightbi/beta/latest.json';
const releaseIndexUrl = process.env.LIGHTBI_RELEASE_INDEX_URL || 'https://drive.thaiduy.store/release/lightbi/index.json';
const proPriceLabel = process.env.LIGHTBI_PRO_PRICE_LABEL || 'Early access';
const installPepper = process.env.LIGHTBI_INSTALLATION_PEPPER || 'lightbi-public-installation-v1';
const analytics = await createDistributionAnalytics({
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  pepper: installPepper,
});
const adminAuth = await createAdminAuth({
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  sessionSecret: process.env.LIGHTBI_ADMIN_SESSION_SECRET,
});
const accountAuth = await createAccountAuth({
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  sessionSecret: process.env.LIGHTBI_ACCOUNT_SESSION_SECRET || process.env.LIGHTBI_ADMIN_SESSION_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUrl: publicUrls.googleCallback,
  publicBaseUrl,
});
const mailer = await createMailer({ host: process.env.SMTP_HOST, port: process.env.SMTP_PORT, secure: process.env.SMTP_SECURE, user: process.env.SMTP_USER, password: process.env.SMTP_PASSWORD, from: process.env.SMTP_FROM });
const licenseSecrets = await createLicenseSecretCache(process.env.REDIS_URL);
const appFeatures = new Set(['easy_mode', 'advanced_mode', 'advanced_query', 'advanced_database_edit', 'deep_ba', 'subset_analysis', 'dashboard', 'chart', 'export', 'data_import', 'database_connect', 'google_sheets']);
let releaseCatalogCache = null;
let releaseCatalogCachedAt = 0;

async function releaseCatalog(refresh = false) {
  if (!refresh && releaseCatalogCache && Date.now() - releaseCatalogCachedAt < 60_000) return releaseCatalogCache;
  releaseCatalogCache = await loadReleaseCatalog({ manifestUrl: releaseManifestUrl, indexUrl: releaseIndexUrl, fallbackUrl: releaseUrl });
  releaseCatalogCachedAt = Date.now();
  return releaseCatalogCache;
}

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
for (const [name, type] of [['amount_total', 'INTEGER'], ['currency', 'TEXT'], ['paid_at', 'TEXT'], ['kind', 'TEXT'], ['label', 'TEXT'], ['discount_percent', 'INTEGER'], ['expires_at', 'TEXT'], ['revoked_at', 'TEXT'], ['recipient_email','TEXT'], ['key_suffix','TEXT']]) {
  if (!db.prepare('PRAGMA table_info(licenses)').all().some((column) => column.name === name)) db.exec(`ALTER TABLE licenses ADD COLUMN ${name} ${type}`);
}
if (accountAuth.enabled) {
  for (const offer of db.prepare("SELECT id FROM licenses WHERE COALESCE(kind,'paid')='partner_discount'").all()) {
    await accountAuth.revokeLicenseEntitlement(offer.id);
  }
}

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' };
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };

function sendJson(response, status, body, extraHeaders = {}) {
  response.writeHead(status, { ...jsonHeaders, ...extraHeaders });
  response.end(JSON.stringify(body));
}

function sha(value) {
  return createHash('sha256').update(`${installPepper}:${value}`).digest('hex');
}

function validInstallationId(value) {
  return typeof value === 'string' && /^[a-z0-9-]{20,80}$/i.test(value);
}

function anonymousNetworkHash(request, now = new Date()) {
  const forwarded = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const raw = forwarded || request.socket?.remoteAddress || '';
  const ipv4 = raw.replace(/^::ffff:/, '').match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  let prefix = null;
  if (ipv4 && ipv4.slice(1).every((part) => Number(part) <= 255)) prefix = `${ipv4[1]}.${ipv4[2]}.${ipv4[3]}.0/24`;
  else if (raw.includes(':')) prefix = `${raw.split(':').slice(0, 3).join(':')}::/48`;
  if (!prefix) return null;
  const month = now.toISOString().slice(0, 7);
  return createHmac('sha256', installPepper).update(`${month}:${prefix}`).digest('hex');
}

function imageContentType(content) {
  if (content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff) return 'image/jpeg';
  return 'image/png';
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

function cookie(request, name) {
  const values = Object.fromEntries(String(request.headers.cookie || '').split(';').map((part) => part.trim().split('=', 2)).filter((part) => part.length === 2));
  return values[name] ? decodeURIComponent(values[name]) : null;
}

function bearer(request) {
  return String(request.headers.authorization || '').replace(/^Bearer\s+/i, '').trim() || null;
}

async function authorizedAccount(request) {
  if (!accountAuth.enabled) return null;
  return accountAuth.session(bearer(request) || cookie(request, 'lightbi_account'));
}

async function authorizedAdmin(request) {
  const supplied = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const breakGlass = process.env.LIGHTBI_DISTRIBUTION_ADMIN_TOKEN;
  if (breakGlass && supplied && safeEqual(breakGlass, supplied)) return { email: 'break-glass' };
  return adminAuth.enabled ? adminAuth.session(cookie(request, 'lightbi_admin')) : null;
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

function maskedLicenseKey(suffix) {
  const tail = String(suffix || '').replace(/[^A-Z0-9_-]/gi, '').slice(-6).toUpperCase();
  return tail ? `LBI-PRO-${'•'.repeat(12)}${tail}` : 'LBI-PRO-••••••••••••';
}

async function fulfillCheckout(session) {
  if (!session?.id || session.payment_status === 'unpaid') return;
  const exists = db.prepare('SELECT session_id FROM fulfilled_checkout_sessions WHERE session_id = ?').get(session.id);
  if (exists) return;
  const key = licenseKey();
  const id = `lic_${randomBytes(12).toString('hex')}`;
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    const recipient = session.customer_details?.email || session.customer_email || null;
    db.prepare('INSERT INTO licenses (id, license_hash, tier, status, stripe_session_id, installation_hash, delivery_value, amount_total, currency, paid_at, recipient_email, key_suffix, created_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)')
      .run(id, sha(key), 'pro', 'active', session.id, session.client_reference_id || null, Number(session.amount_total || 0), String(session.currency || '').toUpperCase() || null, now, recipient, key.slice(-6), now);
    db.prepare('INSERT INTO fulfilled_checkout_sessions (session_id, fulfilled_at) VALUES (?, ?)').run(session.id, now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  await licenseSecrets.put(id,key);
  const recipient = session.customer_details?.email || session.customer_email;
  if (recipient && mailer.enabled) await mailer.sendProLicense({ to: recipient, licenseKey: key, template: 'automatic' });
}

function revenueSummary(days) {
  const windowDays = Math.min(365, Math.max(1, Number(days) || 30));
  const since = new Date(Date.now() - windowDays * 86_400_000).toISOString();
  const paidOrders = db.prepare("SELECT COUNT(*) AS count FROM licenses WHERE paid_at >= ? AND status='active'").get(since)?.count || 0;
  const activeLicenses = db.prepare("SELECT COUNT(*) AS count FROM licenses WHERE status='active' AND COALESCE(kind,'paid') IN ('paid','complimentary')").get()?.count || 0;
  const currencies = db.prepare("SELECT COALESCE(currency,'N/A') AS currency, COALESCE(SUM(amount_total),0) AS gross_minor, COUNT(*) AS orders, COALESCE(ROUND(AVG(amount_total)),0) AS average_minor FROM licenses WHERE paid_at >= ? AND status='active' GROUP BY currency ORDER BY gross_minor DESC").all(since);
  const daily = db.prepare("SELECT substr(paid_at,1,10) AS day, COALESCE(currency,'N/A') AS currency, COALESCE(SUM(amount_total),0) AS gross_minor, COUNT(*) AS orders FROM licenses WHERE paid_at >= ? AND status='active' GROUP BY day,currency ORDER BY day,currency").all(since);
  return { days: windowDays, paidOrders, activeLicenses, currencies, daily, paymentConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID && process.env.STRIPE_WEBHOOK_SECRET) };
}

function listLicenses() {
  return db.prepare(`SELECT l.id,l.tier,l.status,COALESCE(l.kind,'paid') AS kind,l.label,l.discount_percent,l.max_devices,l.expires_at,l.revoked_at,l.created_at,l.paid_at,l.currency,l.amount_total,l.recipient_email,l.key_suffix,
    (SELECT COUNT(*) FROM license_installations li WHERE li.license_id=l.id) AS devices FROM licenses l ORDER BY l.created_at DESC`).all()
    .map((item) => ({ ...item, masked_key: maskedLicenseKey(item.key_suffix) }));
}

async function createManualLicense(input) {
  const kind = input.kind === 'partner_discount' ? 'partner_discount' : 'complimentary';
  const key = licenseKey();
  const id = `lic_${randomBytes(12).toString('hex')}`;
  const now = new Date().toISOString();
  const maxDevices = Math.min(100, Math.max(1, Number(input.maxDevices) || 3));
  const discount = kind === 'partner_discount' ? Math.min(100, Math.max(1, Number(input.discountPercent) || 1)) : 100;
  const expiresAt = input.expiresAt && !Number.isNaN(Date.parse(input.expiresAt)) ? new Date(input.expiresAt).toISOString() : null;
  const recipient = input.email ? String(input.email).trim().toLowerCase().slice(0,254) : null;
  const tier = kind === 'partner_discount' ? 'offer' : 'pro';
  db.prepare(`INSERT INTO licenses (id,license_hash,tier,status,max_devices,kind,label,discount_percent,expires_at,recipient_email,key_suffix,created_at)
    VALUES (?,?,?,'active',?,?,?,?,?,?,?,?)`).run(id, sha(key), tier, maxDevices, kind, String(input.label || '').slice(0, 120) || null, discount, expiresAt, recipient, key.slice(-6), now);
  await licenseSecrets.put(id,key);
  if (recipient && mailer.enabled) await mailer.sendProLicense({ to: recipient, licenseKey: key, template: 'manual', kind, label: input.label, discountPercent: discount, expiresAt });
  return { licenseKey: key, license: listLicenses().find((item) => item.id === id) };
}

function revokeLicense(id) {
  const now = new Date().toISOString();
  const result = db.prepare("UPDATE licenses SET status='revoked',revoked_at=?,delivery_value=NULL WHERE id=? AND status='active'").run(now, id);
  if (!result.changes) return false;
  db.prepare("UPDATE installations SET tier='basic',license_id=NULL WHERE license_id=?").run(id);
  db.prepare('DELETE FROM license_installations WHERE license_id=?').run(id);
  void licenseSecrets.remove(id);
  return true;
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
  const assetRoute = requestPath.startsWith('/distribution-assets/') ? requestPath.slice('/distribution-assets'.length) : requestPath;
  const route = assetRoute === '/' || assetRoute === '/admin' || assetRoute === '/account' ? '/index.html' : assetRoute;
  if (route === '/logo.svg') {
    const file = path.resolve(appDir, '..', 'desktop', 'public', 'branding', 'lightbi-icon.svg');
    try {
      const content = readFileSync(file);
      response.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=3600' });
      response.end(content);
      return true;
    } catch {
      return false;
    }
  }
  if (route.startsWith('/screenshots/')) {
    const allowed = new Set(['lightbi-deep-ba-step1.png', 'lightbi-deep-ba-step2.png', 'lightbi-multifile-executive.png', 'lightbi-advanced-mode.png']);
    const name = path.basename(route);
    if (!allowed.has(name)) return false;
    const file = path.resolve(appDir, '..', '..', 'assets', 'screenshots', name);
    try {
      const content = readFileSync(file);
      response.writeHead(200, { 'content-type': imageContentType(content), 'cache-control': 'public, max-age=3600' });
      response.end(content);
      return true;
    } catch {
      return false;
    }
  }
  const file = path.resolve(publicDir, `.${route}`);
  if (!file.startsWith(publicDir)) return false;
  try {
    const content = readFileSync(file);
    const extension = path.extname(file);
    response.writeHead(200, {
      'content-type': mime[extension] || 'application/octet-stream',
      'cache-control': ['.html', '.js', '.css'].includes(extension) ? 'no-cache' : 'public, max-age=3600',
    });
    response.end(content);
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
      const catalog = await releaseCatalog();
      const windows = catalog.latest ? selectArtifact(catalog.latest, 'windows') : null;
      return sendJson(response, 200, {
        productId: 'digital.thaiduy.lightbi', releaseUrl: windows?.url || releaseUrl, releaseManifestUrl, proPriceLabel,
        latestVersion: catalog.latest?.version || null, releaseCatalogAvailable: catalog.available,
        googleAccountAvailable: Boolean(accountAuth.googleEnabled),
        emailAccountAvailable: Boolean(accountAuth.enabled && mailer.enabled),
        checkoutAvailable: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID),
        analyticsAvailable: analytics.enabled,
      });
    }
    if (request.method === 'GET' && url.pathname === '/api/auth/google/start') {
      if (!accountAuth.googleEnabled) return sendJson(response, 503, { error: 'google_auth_unavailable' });
      const returnTo = url.searchParams.get('return_to')?.startsWith('/') ? url.searchParams.get('return_to') : '/account';
      const started = await accountAuth.beginGoogle({ returnTo });
      response.writeHead(302, {
        location: started.authorizationUrl,
        'set-cookie': `lightbi_oauth_state=${encodeURIComponent(started.state)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
        'cache-control': 'no-store',
      });
      return response.end();
    }
    if (request.method === 'POST' && url.pathname === '/api/account/register') {
      if(!accountAuth.enabled||!mailer.enabled)return sendJson(response,503,{error:'account_registration_unavailable'});
      const payload=JSON.parse((await body(request,16000)).toString('utf8')||'{}');
      try { await accountAuth.registerEmail({email:payload.email,password:payload.password,displayName:payload.displayName,sendVerification:mailer.sendAccountVerification,networkHash:anonymousNetworkHash(request)}); }
      catch(error){if(error?.message==='invalid_registration')return sendJson(response,400,{error:'invalid_registration'});if(error?.message==='rate_limited')return sendJson(response,429,{error:'rate_limited'});throw error;}
      return sendJson(response,202,{accepted:true});
    }
    if (request.method === 'GET' && url.pathname === '/api/account/verify') {
      const token=await accountAuth.verifyEmailToken(url.searchParams.get('token'));
      if(!token){response.writeHead(302,{location:'/account?verify_error=invalid_or_expired'});return response.end();}
      response.writeHead(302,{location:'/account?verified=1','set-cookie':`lightbi_account=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`});return response.end();
    }
    if (request.method === 'POST' && url.pathname === '/api/account/login') {
      if(!accountAuth.enabled)return sendJson(response,503,{error:'account_login_unavailable'});
      const payload=JSON.parse((await body(request,16000)).toString('utf8')||'{}');
      try{
        const installationHash=validInstallationId(payload.installationId)?sha(payload.installationId):null;
        const result=await accountAuth.loginEmail({email:payload.email,password:payload.password,installationHash,device:{displayName:payload.deviceName,platform:payload.platform,appVersion:payload.appVersion},networkHash:anonymousNetworkHash(request)});
        const extra=installationHash?{}:{'set-cookie':`lightbi_account=${encodeURIComponent(result.token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`};
        return sendJson(response,200,{authenticated:true,token:installationHash?result.token:undefined},extra);
      }catch(error){return sendJson(response,error?.message==='rate_limited'?429:401,{error:error?.message==='rate_limited'?'rate_limited':'invalid_credentials'});}
    }
    if (request.method === 'POST' && url.pathname === '/api/account/password/request') {
      const payload=JSON.parse((await body(request,8000)).toString('utf8')||'{}');
      if(accountAuth.enabled&&mailer.enabled)await accountAuth.requestPasswordReset(payload.email,mailer.sendAccountPasswordReset,anonymousNetworkHash(request));
      return sendJson(response,202,{accepted:true});
    }
    if (request.method === 'POST' && url.pathname === '/api/account/password/reset') {
      const payload=JSON.parse((await body(request,12000)).toString('utf8')||'{}');const changed=accountAuth.enabled&&await accountAuth.resetPassword(payload.token,payload.password);
      return changed?sendJson(response,200,{changed:true}):sendJson(response,400,{error:'invalid_or_expired_reset'});
    }
    if (request.method === 'GET' && url.pathname === '/api/auth/google/callback') {
      if (!accountAuth.googleEnabled) return sendJson(response, 503, { error: 'google_auth_unavailable' });
      try {
        const finished = await accountAuth.finishGoogle({ code: url.searchParams.get('code'), state: url.searchParams.get('state'), cookieState: cookie(request, 'lightbi_oauth_state') });
        const headers = { location: finished.returnTo || '/account', 'cache-control': 'no-store' };
        if (!finished.native && finished.token) headers['set-cookie'] = `lightbi_account=${encodeURIComponent(finished.token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`;
        response.writeHead(302, headers);
        return response.end();
      } catch (error) {
        response.writeHead(302, { location: `/account?auth_error=${encodeURIComponent(error instanceof Error ? error.message : 'google_login_failed')}`, 'cache-control': 'no-store' });
        return response.end();
      }
    }
    if (request.method === 'POST' && url.pathname === '/api/account/device-login/start') {
      if (!accountAuth.googleEnabled) return sendJson(response, 503, { error: 'google_auth_unavailable' });
      const payload = JSON.parse((await body(request, 16_000)).toString('utf8') || '{}');
      if (!validInstallationId(payload.installationId)) return sendJson(response, 400, { error: 'invalid_installation_id' });
      const started = await accountAuth.startNativeLogin({ installationHash: sha(payload.installationId), device: { displayName: payload.deviceName, platform: payload.platform, appVersion: payload.appVersion } });
      return sendJson(response, 200, started);
    }
    if (request.method === 'POST' && url.pathname === '/api/account/device-login/status') {
      if (!accountAuth.googleEnabled) return sendJson(response, 503, { error: 'google_auth_unavailable' });
      const payload = JSON.parse((await body(request, 16_000)).toString('utf8') || '{}');
      if (!validInstallationId(payload.installationId) || typeof payload.loginId !== 'string') return sendJson(response, 400, { error: 'invalid_device_login' });
      try {
        return sendJson(response, 200, await accountAuth.finishNativeLogin({ loginId: payload.loginId, installationHash: sha(payload.installationId) }));
      } catch (error) {
        return sendJson(response, error?.message === 'device_limit_reached' ? 409 : 400, { error: error instanceof Error ? error.message : 'device_login_failed' });
      }
    }
    if (request.method === 'GET' && url.pathname === '/api/account/session') {
      const current = await authorizedAccount(request);
      if (!current) return sendJson(response, 401, { authenticated: false });
      return sendJson(response, 200, { authenticated: true, ...(await accountAuth.accountSummary(current.account_id)) });
    }
    if (request.method === 'POST' && url.pathname === '/api/account/logout') {
      const token = bearer(request) || cookie(request, 'lightbi_account');
      if (accountAuth.enabled) await accountAuth.logout(token);
      return sendJson(response, 200, { authenticated: false }, { 'set-cookie': 'lightbi_account=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0' });
    }
    if (request.method === 'POST' && url.pathname === '/api/account/redeem') {
      const current = await authorizedAccount(request);
      if (!current) return sendJson(response, 401, { error: 'unauthorized' });
      const payload = JSON.parse((await body(request, 16_000)).toString('utf8') || '{}');
      if (typeof payload.licenseKey !== 'string') return sendJson(response, 400, { error: 'invalid_license_key' });
      const license = db.prepare("SELECT id,tier,status,max_devices,expires_at,COALESCE(kind,'paid') AS kind,discount_percent FROM licenses WHERE license_hash=? AND status='active' AND (expires_at IS NULL OR expires_at>?)").get(sha(payload.licenseKey), new Date().toISOString());
      if (!license) return sendJson(response, 404, { error: 'license_not_found' });
      if (!licenseGrantsPro(license)) return sendJson(response, 409, { error: 'partner_discount_requires_checkout', offer: { discountPercent: license.discount_percent } });
      try {
        const installationHash = validInstallationId(payload.installationId) ? sha(payload.installationId) : null;
        const summary = await accountAuth.grantLicense(current.account_id, license, installationHash, { displayName: payload.deviceName, platform: payload.platform, appVersion: payload.appVersion });
        if (installationHash) {
          const now = new Date().toISOString();
          db.prepare(`INSERT INTO installations(installation_hash,product_id,tier,app_version,platform,first_seen_at,last_seen_at,license_id)
            VALUES(?,?,'pro',?,?,?,?,?) ON CONFLICT(installation_hash) DO UPDATE SET tier='pro',license_id=excluded.license_id,last_seen_at=excluded.last_seen_at`).run(installationHash, 'digital.thaiduy.lightbi', String(payload.appVersion || ''), String(payload.platform || ''), now, now, license.id);
          db.prepare('INSERT OR IGNORE INTO license_installations(license_id,installation_hash,paired_at) VALUES(?,?,?)').run(license.id, installationHash, now);
        }
        return sendJson(response, 200, summary);
      } catch (error) {
        return sendJson(response, error?.message === 'license_already_redeemed' ? 409 : 400, { error: error instanceof Error ? error.message : 'license_redeem_failed' });
      }
    }
    const deviceAction = url.pathname.match(/^\/api\/account\/devices\/([^/]+)\/revoke$/);
    if (request.method === 'POST' && deviceAction) {
      const current = await authorizedAccount(request);
      if (!current) return sendJson(response, 401, { error: 'unauthorized' });
      return await accountAuth.revokeDevice(current.account_id, decodeURIComponent(deviceAction[1]))
        ? sendJson(response, 200, { revoked: true }) : sendJson(response, 404, { error: 'device_not_found' });
    }
    if (request.method === 'GET' && url.pathname === '/api/releases/latest') {
      const catalog = await releaseCatalog(url.searchParams.get('refresh') === '1');
      return sendJson(response, catalog.available ? 200 : 503, catalog);
    }
    if (request.method === 'GET' && url.pathname === '/api/releases') {
      const catalog = await releaseCatalog();
      return sendJson(response, 200, { ...catalog, releases: catalog.releases.slice(0, 3) });
    }
    if (request.method === 'POST' && url.pathname === '/api/visit') {
      const payload = JSON.parse((await body(request)).toString('utf8') || '{}');
      await analytics.record({ ...payload, kind: 'page_view', networkHash: anonymousNetworkHash(request) });
      return sendJson(response, 202, { recorded: analytics.enabled });
    }
    if (request.method === 'POST' && url.pathname === '/api/visit/end') {
      const payload = JSON.parse((await body(request)).toString('utf8') || '{}');
      await analytics.record({ ...payload, kind: 'visit_end', networkHash: anonymousNetworkHash(request) });
      return sendJson(response, 202, { recorded: analytics.enabled });
    }
    if (request.method === 'POST' && url.pathname === '/api/app/event') {
      const payload = JSON.parse((await body(request, 24_000)).toString('utf8') || '{}');
      if (!validInstallationId(payload.installationId)) return sendJson(response, 400, { error: 'invalid_installation_id' });
      const kind = ['app_open', 'app_close', 'feature_use', 'update_available', 'update_download_started', 'update_download_success', 'update_download_failed', 'update_install_started'].includes(payload.event) ? payload.event : null;
      const feature = kind === 'feature_use' && appFeatures.has(payload.feature) ? payload.feature : null;
      if (!kind || (kind === 'feature_use' && !feature)) return sendJson(response, 400, { error: 'unsupported_app_event' });
      await analytics.record({ kind, feature, installationId: payload.installationId, visitId: payload.sessionId, durationSeconds: payload.durationSeconds, appVersion: payload.appVersion, platform: payload.platform, environment: payload.environment });
      return sendJson(response, 202, { recorded: analytics.enabled });
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
      await analytics.record({
        kind: 'install_pair', installationId: payload.installationId, tier: installation?.tier || 'basic',
        appVersion: payload.appVersion, platform: payload.platform, environment: payload.environment,
      });
      return sendJson(response, 200, { paired: true, tier: installation?.tier || 'basic' });
    }
    if (request.method === 'POST' && url.pathname === '/api/download') {
      const payload = JSON.parse((await body(request)).toString('utf8') || '{}');
      db.prepare('INSERT INTO events (kind, tier, app_version, platform, created_at) VALUES (?, ?, ?, ?, ?)')
        .run('download', payload.tier === 'pro' ? 'pro' : 'basic', String(payload.appVersion || ''), String(payload.platform || 'windows'), new Date().toISOString());
      await analytics.record({ ...payload, kind: 'download', networkHash: anonymousNetworkHash(request) });
      const catalog = await releaseCatalog();
      const platform = ['windows', 'linux', 'macos'].includes(payload.platform) ? payload.platform : 'windows';
      const artifact = catalog.latest ? selectArtifact(catalog.latest, platform, payload.architecture) : null;
      return sendJson(response, 202, { releaseUrl: artifact?.url || releaseUrl, manifest: catalog.latest, artifact, fallback: !artifact });
    }
    if (request.method === 'POST' && url.pathname === '/api/license/activate') {
      const payload = JSON.parse((await body(request)).toString('utf8'));
      if (!validInstallationId(payload.installationId) || typeof payload.licenseKey !== 'string') return sendJson(response, 400, { error: 'invalid_activation' });
      const license = db.prepare("SELECT id,tier,max_devices,COALESCE(kind,'paid') AS kind,discount_percent FROM licenses WHERE license_hash = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > ?)").get(sha(payload.licenseKey), new Date().toISOString());
      if (!license) return sendJson(response, 404, { error: 'license_not_found' });
      if (!licenseGrantsPro(license)) return sendJson(response, 409, { error: 'partner_discount_requires_checkout', offer: { discountPercent: license.discount_percent } });
      const installationHash = sha(payload.installationId);
      const current = db.prepare('SELECT COUNT(*) AS count FROM license_installations WHERE license_id = ?').get(license.id)?.count || 0;
      const already = db.prepare('SELECT 1 FROM license_installations WHERE license_id = ? AND installation_hash = ?').get(license.id, installationHash);
      if (!already && current >= license.max_devices) return sendJson(response, 409, { error: 'device_limit_reached' });
      const now = new Date().toISOString();
      db.prepare('INSERT OR IGNORE INTO license_installations (license_id, installation_hash, paired_at) VALUES (?, ?, ?)').run(license.id, installationHash, now);
      db.prepare("UPDATE installations SET tier = 'pro', license_id = ?, last_seen_at = ? WHERE installation_hash = ?").run(license.id, now, installationHash);
      await analytics.record({ kind: 'license_activation', installationId: payload.installationId, tier: 'pro' });
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
      if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) await fulfillCheckout(event.data?.object);
      return sendJson(response, 200, { received: true });
    }
    if (request.method === 'POST' && url.pathname === '/api/admin/login') {
      if (!adminAuth.enabled) return sendJson(response, 503, { error: 'admin_auth_unavailable' });
      const payload = JSON.parse((await body(request, 16_000)).toString('utf8') || '{}');
      const result = await adminAuth.login(payload.email, payload.password, anonymousNetworkHash(request));
      if (!result.ok) return sendJson(response, result.reason === 'rate_limited' ? 429 : 401, { error: result.reason });
      return sendJson(response, 200, { authenticated: true, email: result.email }, {
        'set-cookie': `lightbi_admin=${encodeURIComponent(result.token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`,
      });
    }
    if (request.method === 'GET' && url.pathname === '/api/admin/session') {
      const session = await authorizedAdmin(request);
      return session ? sendJson(response, 200, { authenticated: true, email: session.email }) : sendJson(response, 401, { authenticated: false });
    }
    if (request.method === 'POST' && url.pathname === '/api/admin/logout') {
      if (adminAuth.enabled) await adminAuth.logout(cookie(request, 'lightbi_admin'));
      return sendJson(response, 200, { authenticated: false }, {
        'set-cookie': 'lightbi_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
      });
    }
    if (request.method === 'POST' && url.pathname === '/api/admin/password/request') {
      const payload = JSON.parse((await body(request, 8_000)).toString('utf8') || '{}');
      if (adminAuth.enabled && mailer.enabled) {
        await adminAuth.requestPasswordReset(payload.email, anonymousNetworkHash(request), new URL('/admin', publicBaseUrl).toString(), mailer.sendPasswordReset);
      }
      return sendJson(response, 202, { accepted: true, emailAvailable: Boolean(mailer.enabled) });
    }
    if (request.method === 'POST' && url.pathname === '/api/admin/password/reset') {
      const payload = JSON.parse((await body(request, 12_000)).toString('utf8') || '{}');
      const changed = adminAuth.enabled ? await adminAuth.resetPassword(payload.token, payload.password) : false;
      return changed ? sendJson(response, 200, { changed: true }) : sendJson(response, 400, { error: 'invalid_or_expired_reset' });
    }
    if (request.method === 'GET' && url.pathname === '/api/checkout/status') {
      const sessionId = url.searchParams.get('session_id');
      const installationId = url.searchParams.get('installation_id');
      if (!validInstallationId(installationId)) return sendJson(response, 400, { error: 'invalid_installation_id' });
      const license = sessionId && db.prepare('SELECT id, tier, installation_hash, delivery_value, delivered_at FROM licenses WHERE stripe_session_id = ?').get(sessionId);
      if (!license) return sendJson(response, 202, { ready: false });
      if (!license.installation_hash || !safeEqual(license.installation_hash, sha(installationId))) return sendJson(response, 403, { error: 'installation_mismatch' });
      const value = license.delivered_at ? null : (await licenseSecrets.get(license.id) || license.delivery_value);
      if (value) { db.prepare('UPDATE licenses SET delivered_at = ?, delivery_value = NULL WHERE id = ?').run(new Date().toISOString(), license.id); await licenseSecrets.remove(license.id); }
      return sendJson(response, 200, { ready: true, tier: license.tier, licenseKey: value });
    }
    if (request.method === 'GET' && url.pathname === '/api/admin/stats') {
      if (!await authorizedAdmin(request)) return sendJson(response, 401, { error: 'unauthorized' });
      const tiers = Object.fromEntries(db.prepare('SELECT tier, COUNT(*) AS count FROM installations GROUP BY tier').all().map((row) => [row.tier, row.count]));
      const downloads = db.prepare("SELECT COUNT(*) AS count FROM events WHERE kind = 'download'").get()?.count || 0;
      const activeLicenses = db.prepare("SELECT COUNT(*) AS count FROM licenses WHERE status='active' AND COALESCE(kind,'paid') IN ('paid','complimentary')").get()?.count || 0;
      const period = Math.min(365, Math.max(1, Number(url.searchParams.get('days')) || 30));
      const distribution = await analytics.summary(period);
      return sendJson(response, 200, {
        installations: { basic: tiers.basic || 0, pro: tiers.pro || 0 }, downloads, activeLicenses,
        distribution,
      });
    }
    if (request.method === 'GET' && url.pathname === '/api/admin/revenue') {
      if (!await authorizedAdmin(request)) return sendJson(response, 401, { error: 'unauthorized' });
      return sendJson(response, 200, revenueSummary(url.searchParams.get('days')));
    }
    if (request.method === 'GET' && url.pathname === '/api/admin/app-usage') {
      if (!await authorizedAdmin(request)) return sendJson(response, 401, { error: 'unauthorized' });
      return sendJson(response, 200, await analytics.appUsage(url.searchParams.get('days')));
    }
    if (request.method === 'GET' && url.pathname === '/api/admin/licenses') {
      if (!await authorizedAdmin(request)) return sendJson(response, 401, { error: 'unauthorized' });
      const accounts = accountAuth.enabled ? await accountAuth.listAccounts() : [];
      const owners = new Map(accounts.filter((item) => item.source_license_id).map((item) => [item.source_license_id, { accountId: item.id, email: item.email, displayName: item.display_name }]));
      return sendJson(response, 200, { licenses: listLicenses().map((item) => ({ ...item, assignedAccount: owners.get(item.id) || null })), mailAvailable: Boolean(mailer.enabled) });
    }
    if (request.method === 'GET' && url.pathname === '/api/admin/accounts') {
      if (!await authorizedAdmin(request)) return sendJson(response, 401, { error: 'unauthorized' });
      const accounts = accountAuth.enabled ? await accountAuth.listAccounts() : [];
      const licenses = new Map(listLicenses().map((item) => [item.id, item]));
      return sendJson(response, 200, { accounts: accounts.map((item) => ({ ...item, license: item.source_license_id ? licenses.get(item.source_license_id) || null : null })), enabled: accountAuth.enabled });
    }
    const accountAction = url.pathname.match(/^\/api\/admin\/accounts\/([^/]+)\/entitlement\/revoke$/);
    if (request.method === 'POST' && accountAction) {
      if (!await authorizedAdmin(request)) return sendJson(response, 401, { error: 'unauthorized' });
      if (request.headers['x-lightbi-admin-action'] !== '1') return sendJson(response, 403, { error: 'admin_action_header_required' });
      const revoked = accountAuth.enabled && await accountAuth.revokeAccountEntitlement(decodeURIComponent(accountAction[1]));
      return revoked ? sendJson(response, 200, { revoked: true }) : sendJson(response, 404, { error: 'active_entitlement_not_found' });
    }
    const accountStatusAction = url.pathname.match(/^\/api\/admin\/accounts\/([^/]+)\/status$/);
    if (request.method === 'POST' && accountStatusAction) {
      if (!await authorizedAdmin(request)) return sendJson(response, 401, { error: 'unauthorized' });
      if (request.headers['x-lightbi-admin-action'] !== '1') return sendJson(response, 403, { error: 'admin_action_header_required' });
      const payload = JSON.parse((await body(request, 4_000)).toString('utf8') || '{}');
      if (!['active','disabled'].includes(payload.status)) return sendJson(response, 400, { error: 'invalid_account_status' });
      const changed = accountAuth.enabled && await accountAuth.setAccountStatus(decodeURIComponent(accountStatusAction[1]), payload.status);
      return changed ? sendJson(response, 200, { status: payload.status }) : sendJson(response, 404, { error: 'account_not_found' });
    }
    const accountSessionsAction = url.pathname.match(/^\/api\/admin\/accounts\/([^/]+)\/sessions\/revoke$/);
    if (request.method === 'POST' && accountSessionsAction) {
      if (!await authorizedAdmin(request)) return sendJson(response, 401, { error: 'unauthorized' });
      if (request.headers['x-lightbi-admin-action'] !== '1') return sendJson(response, 403, { error: 'admin_action_header_required' });
      const changed = accountAuth.enabled && await accountAuth.revokeAccountSessions(decodeURIComponent(accountSessionsAction[1]));
      return changed ? sendJson(response, 200, { revoked: true }) : sendJson(response, 404, { error: 'account_not_found' });
    }
    if (request.method === 'POST' && url.pathname === '/api/admin/licenses') {
      if (!await authorizedAdmin(request)) return sendJson(response, 401, { error: 'unauthorized' });
      if (request.headers['x-lightbi-admin-action'] !== '1') return sendJson(response, 403, { error: 'admin_action_header_required' });
      const payload = JSON.parse((await body(request, 16_000)).toString('utf8') || '{}');
      return sendJson(response, 201, await createManualLicense(payload));
    }
    const licenseAction = url.pathname.match(/^\/api\/admin\/licenses\/([^/]+)\/(revoke|rotate)$/);
    if (request.method === 'POST' && licenseAction) {
      if (!await authorizedAdmin(request)) return sendJson(response, 401, { error: 'unauthorized' });
      if (request.headers['x-lightbi-admin-action'] !== '1') return sendJson(response, 403, { error: 'admin_action_header_required' });
      const current = listLicenses().find((item) => item.id === licenseAction[1]);
      if (!current) return sendJson(response, 404, { error: 'license_not_found' });
      const payload = licenseAction[2] === 'rotate' ? JSON.parse((await body(request, 16_000)).toString('utf8') || '{}') : {};
      if (!revokeLicense(current.id)) return sendJson(response, 409, { error: 'license_not_active' });
      if (licenseAction[2] === 'revoke') {
        if (accountAuth.enabled) await accountAuth.revokeLicenseEntitlement(current.id);
        return sendJson(response, 200, { revoked: true });
      }
      const replacement = await createManualLicense({ kind: current.kind, label: current.label, discountPercent: current.discount_percent, maxDevices: current.max_devices, expiresAt: current.expires_at, email: payload.email });
      if (accountAuth.enabled) {
        if (licenseGrantsPro(replacement.license)) await accountAuth.replaceLicenseEntitlement(current.id, replacement.license);
        else await accountAuth.revokeLicenseEntitlement(current.id);
      }
      return sendJson(response, 201, { rotated: true, ...replacement });
    }
    const resendAction = url.pathname.match(/^\/api\/admin\/licenses\/([^/]+)\/resend$/);
    if (request.method === 'POST' && resendAction) {
      if (!await authorizedAdmin(request)) return sendJson(response,401,{error:'unauthorized'});
      if(request.headers['x-lightbi-admin-action']!=='1')return sendJson(response,403,{error:'admin_action_header_required'});
      const current=listLicenses().find(item=>item.id===resendAction[1]);if(!current)return sendJson(response,404,{error:'license_not_found'});
      const payload=JSON.parse((await body(request,8000)).toString('utf8')||'{}');const recipient=String(payload.email||current.recipient_email||'').trim();
      const key=await licenseSecrets.get(current.id);if(!key)return sendJson(response,410,{error:'plaintext_expired_rotate_required'});
      if(!recipient||!mailer.enabled)return sendJson(response,503,{error:'mail_unavailable'});
      await mailer.sendProLicense({to:recipient,licenseKey:key,template:'manual',kind:current.kind,label:current.label,discountPercent:current.discount_percent,expiresAt:current.expires_at});
      return sendJson(response,200,{resent:true});
    }
    if (request.method === 'GET' && serveStatic(url.pathname, response)) return;
    sendJson(response, 404, { error: 'not_found' });
  } catch (error) {
    sendJson(response, error?.message === 'payload_too_large' ? 413 : 500, { error: 'request_failed' });
  }
});

server.listen(port, '0.0.0.0', () => console.log(`LightBI Distribution listening on ${port}`));

export { adminAuth, analytics, anonymousNetworkHash, createManualLicense, db, imageContentType, listLicenses, mailer, maskedLicenseKey, revenueSummary, revokeLicense, server, sha, validInstallationId, verifyStripeSignature };
