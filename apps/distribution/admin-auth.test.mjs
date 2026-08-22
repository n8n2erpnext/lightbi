import assert from 'node:assert/strict';
import test from 'node:test';
import { passwordHash, verifyPassword } from './admin-auth.mjs';

test('stores a salted scrypt hash instead of the admin password', async () => {
  const password = 'one-time-generated-password-example';
  const encoded = await passwordHash(password);
  assert.match(encoded, /^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
  assert.equal(encoded.includes(password), false);
  assert.equal(await verifyPassword(password, encoded), true);
  assert.equal(await verifyPassword(`${password}x`, encoded), false);
});
