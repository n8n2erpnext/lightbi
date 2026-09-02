import assert from 'node:assert/strict';
import test from 'node:test';
import { isControlPlanePublicPath } from './internal-gateway-routing.mjs';

test('routes public Control Plane surfaces through the internal gateway', () => {
  for (const pathname of ['/','/docs','/docs/keyboard-shortcuts','/account','/account/verify','/admin','/verify','/distribution-assets/logo.svg','/internal-releases/latest.json']) {
    assert.equal(isControlPlanePublicPath(pathname), true, pathname);
  }
});

test('keeps Desktop and Core surfaces out of the Control Plane route set', () => {
  for (const pathname of ['/app','/app/advanced','/settings','/api/health','/api/pair']) {
    assert.equal(isControlPlanePublicPath(pathname), false, pathname);
  }
});
