import assert from 'node:assert/strict';
import test from 'node:test';
import { isControlPlanePublicPath } from './internal-gateway-routing.mjs';

test('routes public docs shell and distribution assets to the control plane', () => {
  for (const path of ['/docs','/docs/getting-started','/distribution-assets/app.js','/distribution-assets/docs.css','/internal-releases/latest.json','/internal-releases/0.9.2-next.25.3.2/LightBI.exe']) {
    assert.equal(isControlPlanePublicPath(path), true, path);
  }
});

test('does not invent a distribution mount or steal desktop/core/API routes', () => {
  for (const path of ['/','/advanced','/api/health','/distribution','/distribution/','/distribution-api/api/docs','/lightbi-generation.json']) {
    assert.equal(isControlPlanePublicPath(path), false, path);
  }
});
