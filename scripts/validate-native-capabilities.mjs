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
const tauriConfig = JSON.parse(fs.readFileSync(path.resolve('crates/lightbi-tauri/tauri.conf.json'), 'utf8'));
const installMode = tauriConfig?.bundle?.windows?.nsis?.installMode;
const nativeMain = fs.readFileSync(path.resolve('crates/lightbi-tauri/src/main.rs'), 'utf8');
if (installMode === 'perMachine') {
  if (!nativeMain.includes('ShellExecuteW') || !nativeMain.includes('OsStr::new(\"runas\")')) {
    throw new Error('Per-machine Windows installer requires an explicit UAC-aware ShellExecuteW runas launch path.');
  }
}
console.log(JSON.stringify({
  schema: 'lightbi.native-capability-check.v1', capability: capability.identifier, permissions: required,
  windowsInstallMode: installMode, elevatedInstallerLaunch: installMode === 'perMachine' ? 'shell_execute_runas' : 'not_required',
}));
