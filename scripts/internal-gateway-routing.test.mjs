import assert from 'node:assert/strict';
import test from 'node:test';
import { isControlPlaneDistributionPath, isControlPlanePublicPath } from './internal-gateway-routing.mjs';

test('mounts the distribution portal without stealing distribution-api', () => {
  for (const path of ['/distribution','/distribution/','/distribution/api/config','/distribution/admin']) {
    assert.equal(isControlPlaneDistributionPath(path), true, path);
  }
  assert.equal(isControlPlaneDistributionPath('/distribution-api/api/docs'), false);
});

test('routes public docs shell and distribution assets to the control plane', () => {
  for (const path of ['/docs','/docs/getting-started','/distribution-assets/app.js','/distribution-assets/docs.css']) {
    assert.equal(isControlPlanePublicPath(path), true, path);
  }
});

test('does not steal desktop, core API or distribution API routes', () => {
  for (const path of ['/','/advanced','/api/health','/distribution-api/api/docs','/lightbi-generation.json']) {
    assert.equal(isControlPlanePublicPath(path), false, path);
  }
});
