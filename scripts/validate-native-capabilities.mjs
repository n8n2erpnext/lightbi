import fs from 'node:fs';
import path from 'node:path';

const capabilityPath = path.resolve('crates/lightbi-tauri/capabilities/main.json');
const capability = JSON.parse(fs.readFileSync(capabilityPath, 'utf8'));
const permissions = new Set(Array.isArray(capability.permissions) ? capability.permissions : []);
const required = ['core:event:allow-listen', 'core:event:allow-unlisten', 'opener:allow-default-urls'];
for (const permission of required) {
  if (!permissions.has(permission)) throw new Error(`Missing native capability: ${permission}`);
}
if (!Array.isArray(capability.windows) || !capability.windows.includes('main')) {
  throw new Error('Native updater event capability must be scoped to the main window.');
}
if (permissions.has('core:event:default') || permissions.has('core:default')) {
  throw new Error('Native updater capability is broader than required.');
}
if (permissions.has('opener:allow-open-path') || permissions.has('opener:allow-open-url') || permissions.has('opener:default')) {
  throw new Error('External-link capability must remain URL-only and restricted to opener default URL schemes.');
}
const tauriConfig = JSON.parse(fs.readFileSync(path.resolve('crates/lightbi-tauri/tauri.conf.json'), 'utf8'));
const installMode = tauriConfig?.bundle?.windows?.nsis?.installMode;
const installerHooks = tauriConfig?.bundle?.windows?.nsis?.installerHooks;
const nsisConfig = tauriConfig?.bundle?.windows?.nsis ?? {};
const expectedBranding = { headerImage: './windows/branding/installer-header.bmp', sidebarImage: './windows/branding/installer-sidebar.bmp', uninstallerHeaderImage: './windows/branding/installer-header.bmp' };
for (const [key, expected] of Object.entries(expectedBranding)) {
  if (nsisConfig[key] !== expected) throw new Error(`Windows NSIS LightBI branding missing: ${key}`);
  if (!fs.existsSync(path.resolve('crates/lightbi-tauri', expected))) throw new Error(`Windows NSIS branding asset missing: ${expected}`);
}
const bmpDimensions = new Map([['./windows/branding/installer-header.bmp', [150, 57]], ['./windows/branding/installer-sidebar.bmp', [164, 314]]]);
for (const [relative, [expectedWidth, expectedHeight]] of bmpDimensions) {
  const bytes = fs.readFileSync(path.resolve('crates/lightbi-tauri', relative));
  if (bytes.toString('ascii', 0, 2) !== 'BM') throw new Error(`Windows NSIS branding asset is not BMP: ${relative}`);
  const width = bytes.readInt32LE(18); const height = Math.abs(bytes.readInt32LE(22));
  if (width !== expectedWidth || height !== expectedHeight) throw new Error(`Windows NSIS branding dimensions invalid: ${relative} ${width}x${height}`);
}
const nativeMain = fs.readFileSync(path.resolve('crates/lightbi-tauri/src/main.rs'), 'utf8');
const lifecycleSource = fs.readFileSync(path.resolve('crates/lightbi-tauri/src/installation_lifecycle.rs'), 'utf8');
if (installerHooks !== './windows/hooks.nsh') throw new Error('Windows NSIS lifecycle hook must remain configured.');
const lifecycleHook = fs.readFileSync(path.resolve('crates/lightbi-tauri/windows/hooks.nsh'), 'utf8');
if (!lifecycleHook.includes('NSIS_HOOK_PREUNINSTALL') || !lifecycleHook.includes('$UpdateMode <> 1')) {
  throw new Error('Real uninstall tracking must run before removal and must never classify /UPDATE as uninstall.');
}
if (!lifecycleHook.includes('--lightbi-uninstall-track') || !lifecycleHook.includes('/TIMEOUT=3000')) {
  throw new Error('Windows uninstall lifecycle tracking must stay bounded and fail-open.');
}
if (!lifecycleSource.includes('lightbi.thaiduy.digital') || !lifecycleSource.includes('lightbi-next.thaiduy.digital')) {
  throw new Error('Uninstall lifecycle receipt must be restricted to approved LightBI HTTPS endpoints.');
}
if (nativeMain.includes('prepare_verified_update') || nativeMain.includes('verified: true')) {
  throw new Error('SHA-only updater internals must not use verified/official trust vocabulary.');
}
if (!nativeMain.includes('prepare_integrity_checked_update') || !nativeMain.includes('integrity_checked: true')) {
  throw new Error('Native updater must name SHA-only staging as integrity-checked.');
}
if (installMode === 'perMachine') {
  if (!nativeMain.includes('ShellExecuteW') || !nativeMain.includes('OsStr::new(\"runas\")')) {
    throw new Error('Per-machine Windows installer requires an explicit UAC-aware ShellExecuteW runas launch path.');
  }
  if (!nativeMain.includes('WINDOWS_UPDATE_INSTALLER_ARGS: &str = \"/S /UPDATE /R\"')) {
    throw new Error('Windows updater must use Tauri NSIS silent update/restart mode (/S /UPDATE /R).');
  }
}
console.log(JSON.stringify({
  schema: 'lightbi.native-capability-check.v1', capability: capability.identifier, permissions: required,
  windowsInstallMode: installMode, elevatedInstallerLaunch: installMode === 'perMachine' ? 'shell_execute_runas' : 'not_required',
  windowsUpdateMode: installMode === 'perMachine' ? 'silent_update_restart' : 'platform_default',
  uninstallLifecycle: 'same_installation_pairing_identity_fail_open_update_excluded',
}));
