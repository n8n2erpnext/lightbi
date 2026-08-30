import fs from 'node:fs';
import path from 'node:path';

const HARD_LIMIT = 1000;
const WARNING_LIMIT = 800;
const ROOTS = ['apps/desktop/src', 'apps/server/src', 'crates', 'packages'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.rs']);

function walk(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function isProductionSource(file) {
  if (!SOURCE_EXTENSIONS.has(path.extname(file))) return false;
  const normalized = file.replaceAll('\\', '/').toLowerCase();
  return !normalized.includes('/tests/')
    && !normalized.includes('/__tests__/')
    && !/\.(test|spec)\.[^.]+$/.test(normalized);
}

const measured = ROOTS.flatMap(walk)
  .filter(isProductionSource)
  .map((file) => ({ file, lines: fs.readFileSync(file, 'utf8').split(/\r?\n/).length - 1 }))
  .sort((left, right) => right.lines - left.lines);
const violations = measured.filter((item) => item.lines > HARD_LIMIT);
const warnings = measured.filter((item) => item.lines >= WARNING_LIMIT && item.lines <= HARD_LIMIT);

for (const item of warnings) {
  console.warn(`WARN ${item.lines} lines: ${item.file}`);
}

if (violations.length > 0) {
  console.error(`Source module size gate failed: ${violations.length} production module(s) exceed ${HARD_LIMIT} lines.`);
  for (const item of violations) console.error(`FAIL ${item.lines} lines: ${item.file}`);
  process.exit(1);
}

console.log(
  `Source module size gate passed: ${measured.length} production modules checked; `
  + `hard limit ${HARD_LIMIT}, warning threshold ${WARNING_LIMIT}.`,
);
