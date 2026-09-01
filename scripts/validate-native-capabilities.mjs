import fs from 'node:fs';
import path from 'node:path';

const capabilityPath = path.resolve('crates/lightbi-tauri/capabilities/main.json');
const capability = JSON.parse(fs.readFileSync(capabilityPath, 'utf8'));
const permissions = new Set(Array.isArray(capability.permissions) ? capability.permissions : []);
const required = ['core:event:allow-listen', 'core:event:allow-unlisten'];
for (const permission of required) {
  if (!permissions.has(permission)) throw new Error(`Missing native capability: ${permission}`);
}
if (!Array.isArray(capability.windows) || !capability.windows.includes('main')) {
  throw new Error('Native updater event capability must be scoped to the main window.');
}
if (permissions.has('core:event:default') || permissions.has('core:default')) {
  throw new Error('Native updater capability is broader than required.');
}
console.log(JSON.stringify({ schema: 'lightbi.native-capability-check.v1', capability: capability.identifier, permissions: required }));
