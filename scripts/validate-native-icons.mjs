import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const requiredPngs = [
  ['32x32.png', 32],
  ['128x128.png', 128],
  ['128x128@2x.png', 256],
];

function pngSize(buffer) {
  if (buffer.length < 24 || buffer.subarray(1, 4).toString('ascii') !== 'PNG') throw new Error('Invalid PNG signature');
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

for (const [name, expected] of requiredPngs) {
  const buffer = await readFile(resolve(root, 'crates/lightbi-tauri/icons', name));
  const [width, height] = pngSize(buffer);
  if (width !== expected || height !== expected) throw new Error(`${name} must be ${expected}x${expected}, received ${width}x${height}`);
  if (buffer.length < 1_000) throw new Error(`${name} appears empty or unbranded`);
}

const ico = await readFile(resolve(root, 'crates/lightbi-tauri/icons/icon.ico'));
if (ico.length < 10_000 || ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1 || ico.readUInt16LE(4) < 4) {
  throw new Error('icon.ico must contain a multi-resolution branded Windows icon');
}

console.log('Native LightBI icon set is valid.');
