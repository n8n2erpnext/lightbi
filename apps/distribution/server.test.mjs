import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';

const temp = mkdtempSync(path.join(tmpdir(), 'lightbi-distribution-'));
process.env.PORT = '0';
process.env.LIGHTBI_DISTRIBUTION_DATA_DIR = temp;
const module = await import('./server.mjs');
if (!module.server.listening) await once(module.server, 'listening');

function serverBaseUrl() {
  const address = module.server.address();
  assert.ok(address && typeof address !== 'string');
  return `http://127.0.0.1:${address.port}`;
}

after(() => {
  module.server.close();
  module.db.close();
  rmSync(temp, { recursive: true, force: true });
});

test('accepts random installation identifiers and rejects unsafe values', () => {
  assert.equal(module.validInstallationId('9cf044a8-7605-42da-b2b2-f7a70513e14a'), true);
  assert.equal(module.validInstallationId('../secret'), false);
});

test('hashes installation ids before persistence', () => {
  const value = '9cf044a8-7605-42da-b2b2-f7a70513e14a';
  assert.notEqual(module.sha(value), value);
  assert.equal(module.sha(value), module.sha(value));
});

test('stores only a rotating HMAC of the coarse client network', () => {
  const request = (ip) => ({ headers: { 'x-forwarded-for': `${ip}, 127.0.0.1` }, socket: {} });
  const january = new Date('2026-01-15T00:00:00Z');
  const sameNetworkA = module.anonymousNetworkHash(request('203.0.113.10'), january);
  const sameNetworkB = module.anonymousNetworkHash(request('203.0.113.240'), january);
  const otherNetwork = module.anonymousNetworkHash(request('203.0.114.10'), january);
  const rotated = module.anonymousNetworkHash(request('203.0.113.10'), new Date('2026-02-01T00:00:00Z'));
  assert.equal(sameNetworkA, sameNetworkB);
  assert.notEqual(sameNetworkA, otherNetwork);
  assert.notEqual(sameNetworkA, rotated);
  assert.equal(sameNetworkA.includes('203.0.113'), false);
});

test('verifies Stripe webhook signatures with replay tolerance', () => {
  const payload = JSON.stringify({ type: 'checkout.session.completed' });
  const timestamp = Math.floor(Date.now() / 1000);
  const secret = 'whsec_test';
  const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  assert.equal(module.verifyStripeSignature(Buffer.from(payload), `t=${timestamp},v1=${signature}`, secret), true);
  assert.equal(module.verifyStripeSignature(Buffer.from(`${payload}x`), `t=${timestamp},v1=${signature}`, secret), false);
});

test('serves every distribution screenshot with its real image type', async () => {
  for (const name of [
    'lightbi-deep-ba-step1.png',
    'lightbi-deep-ba-step2.png',
    'lightbi-multifile-executive.png',
    'lightbi-advanced-mode.png',
  ]) {
    const response = await fetch(`${serverBaseUrl()}/screenshots/${name}`);
    assert.equal(response.status, 200, name);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const isPng = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
    const isJpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    assert.equal(isPng || isJpeg, true, name);
    assert.equal(response.headers.get('content-type'), isJpeg ? 'image/jpeg' : 'image/png', name);
  }
});

test('returns a clean 404 when a static asset is unavailable', async () => {
  const response = await fetch(`${serverBaseUrl()}/screenshots/not-allowed.png`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'not_found' });
});

test('accepts privacy-safe visit signals without requiring analytics infrastructure', async () => {
  const response = await fetch(`${serverBaseUrl()}/api/visit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      visitorId: 'anonymous-browser-id-1234567890', path: '/distribution/',
      utmSource: 'test', environment: 'test',
    }),
  });
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { recorded: false });
});

test('accepts anonymous visit-end duration signals', async () => {
  const response = await fetch(`${serverBaseUrl()}/api/visit/end`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ visitorId: 'anonymous-browser-id-1234567890', visitId: 'anonymous-visit-id-1234567890', durationSeconds: 42, environment: 'test' }),
  });
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { recorded: false });
});

test('accepts only whitelisted native-app usage events', async () => {
  const valid = await fetch(`${serverBaseUrl()}/api/app/event`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ event: 'feature_use', feature: 'advanced_database_edit', installationId: 'native-installation-1234567890', sessionId: 'native-session-1234567890', environment: 'test' }),
  });
  assert.equal(valid.status, 202);
  const invalid = await fetch(`${serverBaseUrl()}/api/app/event`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ event: 'feature_use', feature: 'SELECT * FROM private_table', installationId: 'native-installation-1234567890' }),
  });
  assert.equal(invalid.status, 400);
});

test('serves the admin shell under the proxied route target', async () => {
  const response = await fetch(`${serverBaseUrl()}/admin`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /LightBI/);
});

test('fails closed when end-user Google account infrastructure is not configured', async () => {
  const session = await fetch(`${serverBaseUrl()}/api/account/session`);
  assert.equal(session.status, 401);
  const google = await fetch(`${serverBaseUrl()}/api/auth/google/start`, { redirect: 'manual' });
  assert.equal(google.status, 503);
});

test('keeps revenue empty and payment dormant before Stripe configuration', () => {
  const revenue = module.revenueSummary(30);
  assert.equal(revenue.paidOrders, 0);
  assert.equal(revenue.activeLicenses, 0);
  assert.deepEqual(revenue.currencies, []);
  assert.equal(revenue.paymentConfigured, false);
});

test('creates and revokes a manual Pro key without storing plaintext', async () => {
  const created = await module.createManualLicense({ kind: 'complimentary', label: 'Test partner', maxDevices: 2 });
  assert.match(created.licenseKey, /^LBI-PRO-/);
  assert.match(created.license.masked_key, /^LBI-PRO-•+[A-Z0-9_-]{6}$/);
  assert.equal(created.license.masked_key.endsWith(created.licenseKey.slice(-6)), true);
  assert.equal(created.license.masked_key.includes(created.licenseKey.slice(8, -6)), false);
  const stored = module.db.prepare('SELECT license_hash,delivery_value,status FROM licenses WHERE id=?').get(created.license.id);
  assert.equal(stored.delivery_value, null);
  assert.equal(stored.license_hash.includes(created.licenseKey), false);
  assert.equal(module.revokeLicense(created.license.id), true);
  assert.equal(module.db.prepare('SELECT status FROM licenses WHERE id=?').get(created.license.id).status, 'revoked');
});

test('masks license keys with a visible product prefix and safe suffix only', () => {
  assert.equal(module.maskedLicenseKey('AB12CD'), 'LBI-PRO-••••••••••••AB12CD');
  assert.equal(module.maskedLicenseKey(''), 'LBI-PRO-••••••••••••');
});
