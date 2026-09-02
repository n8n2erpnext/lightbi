import assert from 'node:assert/strict';
import test from 'node:test';
import { isControlPlaneApiPath, isControlPlanePublicPath } from './internal-gateway-routing.mjs';

test('routes public Control Plane surfaces through the internal gateway', () => {
  for (const pathname of ['/','/docs','/docs/keyboard-shortcuts','/account','/account/verify','/admin','/verify','/distribution-assets/logo.svg','/internal-releases/latest.json']) {
    assert.equal(isControlPlanePublicPath(pathname), true, pathname);
  }
});

test('keeps Desktop and Core surfaces out of the Control Plane public route set', () => {
  for (const pathname of ['/app','/app/advanced','/settings','/api/health','/api/project/sessions']) {
    assert.equal(isControlPlanePublicPath(pathname), false, pathname);
  }
});

test('routes Control Plane API namespaces to the Control Plane', () => {
  for (const pathname of [
    '/api/admin/login','/api/admin/passkey/login/start','/api/account/session','/api/account/verify',
    '/api/releases/latest','/api/installation/uninstall','/api/license/activate','/api/pair',
    '/api/docs','/api/catalog','/api/auth/google/start','/api/newsletter/unsubscribe','/api/webhooks/stripe',
  ]) assert.equal(isControlPlaneApiPath(pathname), true, pathname);
});

test('keeps Core API namespaces on the Core service', () => {
  for (const pathname of [
    '/api/health','/api/project/sessions','/api/project/source-files','/api/advanced/connections',
    '/api/question/ask','/api/online-source/fetch-csv','/api/plugins/providers','/api/v1/health',
  ]) assert.equal(isControlPlaneApiPath(pathname), false, pathname);
});
