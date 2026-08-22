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

test('serves the admin shell under the proxied route target', async () => {
  const response = await fetch(`${serverBaseUrl()}/admin`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /LightBI/);
});
