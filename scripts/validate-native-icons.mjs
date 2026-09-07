import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const requiredPngs = [
  ['32x32.png', 32, 400],
  ['128x128.png', 128, 1_200],
  ['128x128@2x.png', 256, 2_500],
];
const primaryMarkSha256 = '9486181bb525d1d4a704addaebfc2f1caa5abbd9d1240bad252b85a3f58e0d7b';

function pngSize(buffer) {
  if (buffer.length < 24 || buffer.subarray(1, 4).toString('ascii') !== 'PNG') throw new Error('Invalid PNG signature');
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

for (const [name, expected, minBytes] of requiredPngs) {
  const buffer = await readFile(resolve(root, 'crates/lightbi-tauri/icons', name));
  const [width, height] = pngSize(buffer);
  if (width !== expected || height !== expected) throw new Error(`${name} must be ${expected}x${expected}, received ${width}x${height}`);
  if (buffer.length < minBytes) throw new Error(`${name} appears empty or unbranded`);
}


const mark = await readFile(resolve(root, 'apps/desktop/public/branding/lightbi-icon.svg'));
const favicon = await readFile(resolve(root, 'apps/desktop/public/favicon.svg'));
const markSha256 = createHash('sha256').update(mark).digest('hex');
if (markSha256 !== primaryMarkSha256) throw new Error('Primary LightBI SVG mark does not match the approved optimized-li authority');
if (!mark.equals(favicon)) throw new Error('favicon.svg must be derived byte-for-byte from the primary LightBI SVG mark');

const appIcon = await readFile(resolve(root, 'apps/desktop/public/branding/lightbi-app-icon.png'));
const [appIconWidth, appIconHeight] = pngSize(appIcon);
if (appIconWidth !== 512 || appIconHeight !== 512) throw new Error('lightbi-app-icon.png must be 512x512');

const ico = await readFile(resolve(root, 'crates/lightbi-tauri/icons/icon.ico'));
if (ico.length < 10_000 || ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1 || ico.readUInt16LE(4) < 4) {
  throw new Error('icon.ico must contain a multi-resolution branded Windows icon');
}

console.log('Native LightBI icon set is valid.');
