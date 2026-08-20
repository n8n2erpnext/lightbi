import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';

const temp = mkdtempSync(path.join(tmpdir(), 'lightbi-distribution-'));
process.env.PORT = '0';
process.env.LIGHTBI_DISTRIBUTION_DATA_DIR = temp;
const module = await import('./server.mjs');

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

test('verifies Stripe webhook signatures with replay tolerance', () => {
  const payload = JSON.stringify({ type: 'checkout.session.completed' });
  const timestamp = Math.floor(Date.now() / 1000);
  const secret = 'whsec_test';
  const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  assert.equal(module.verifyStripeSignature(Buffer.from(payload), `t=${timestamp},v1=${signature}`, secret), true);
  assert.equal(module.verifyStripeSignature(Buffer.from(`${payload}x`), `t=${timestamp},v1=${signature}`, secret), false);
});
