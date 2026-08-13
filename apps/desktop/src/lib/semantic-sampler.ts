export type SemanticSampleStrategy = "full" | "matrix_sample";

export type SemanticSample<T> = {
  rows: T[];
  rowIndexes: number[];
  strategy: SemanticSampleStrategy;
  sourceRowCount: number;
  sampleRowCount: number;
};

export type SemanticSampleOptions = {
  maxRows?: number;
  fullRows?: number;
  headRows?: number;
  tailRows?: number;
  evenRows?: number;
  randomRows?: number;
  seed?: string;
};

const DEFAULT_OPTIONS = {
  maxRows: 1000,
  headRows: 100,
  tailRows: 100,
  evenRows: 500,
  randomRows: 300
};

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextRandom(state: number): [number, number] {
  let value = state || 0x9e3779b9;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return [value >>> 0, (value >>> 0) / 4294967296];
}

function addRange(indexes: Set<number>, start: number, count: number, rowCount: number) {
  for (let offset = 0; offset < count; offset++) {
    const index = start + offset;
    if (index >= 0 && index < rowCount) indexes.add(index);
  }
}

function addEvenlySpaced(indexes: Set<number>, count: number, rowCount: number) {
  if (count <= 0 || rowCount <= 0) return;
  if (count === 1) {
    indexes.add(0);
    return;
  }
  for (let offset = 0; offset < count; offset++) {
    indexes.add(Math.round((offset * (rowCount - 1)) / (count - 1)));
  }
}

function addDeterministicRandom(indexes: Set<number>, count: number, rowCount: number, seed: string) {
  if (count <= 0 || rowCount <= 0) return;
  let state = hashSeed(seed);
  let attempts = 0;
  const targetSize = Math.min(rowCount, indexes.size + count);
  const maxAttempts = Math.max(count * 20, rowCount * 2);
  while (indexes.size < targetSize && attempts < maxAttempts) {
    const next = nextRandom(state);
    state = next[0];
    indexes.add(Math.floor(next[1] * rowCount));
    attempts++;
  }
}

function capIndexes(indexes: number[], maxRows: number, seed: string): number[] {
  if (indexes.length <= maxRows) return indexes;
  const required = new Set<number>();
  addRange(required, 0, Math.min(100, maxRows), indexes.length);
  addRange(required, Math.max(0, indexes.length - Math.min(100, maxRows)), Math.min(100, maxRows), indexes.length);

  const selected = new Set<number>();
  for (const position of required) {
    selected.add(indexes[position]);
    if (selected.size >= maxRows) return [...selected].sort((a, b) => a - b);
  }

  let state = hashSeed(seed);
  while (selected.size < maxRows) {
    const next = nextRandom(state);
    state = next[0];
    selected.add(indexes[Math.floor(next[1] * indexes.length)]);
  }
  return [...selected].sort((a, b) => a - b);
}

export function createSemanticSample<T>(
  rows: T[],
  options: SemanticSampleOptions = {}
): SemanticSample<T> {
  const rowCount = Array.isArray(rows) ? rows.length : 0;
  const maxRows = options.maxRows ?? DEFAULT_OPTIONS.maxRows;
  const fullRows = options.fullRows ?? maxRows;
  const seed = options.seed ?? String(rowCount);

  if (rowCount === 0 || maxRows <= 0) {
    return { rows: [], rowIndexes: [], strategy: "full", sourceRowCount: rowCount, sampleRowCount: 0 };
  }

  if (rowCount <= Math.min(maxRows, fullRows)) {
    return {
      rows: rows.slice(),
      rowIndexes: rows.map((_, index) => index),
      strategy: "full",
      sourceRowCount: rowCount,
      sampleRowCount: rowCount
    };
  }

  const indexes = new Set<number>();
  addRange(indexes, 0, options.headRows ?? DEFAULT_OPTIONS.headRows, rowCount);
  addRange(indexes, rowCount - (options.tailRows ?? DEFAULT_OPTIONS.tailRows), options.tailRows ?? DEFAULT_OPTIONS.tailRows, rowCount);
  addEvenlySpaced(indexes, options.evenRows ?? DEFAULT_OPTIONS.evenRows, rowCount);
  addDeterministicRandom(indexes, options.randomRows ?? DEFAULT_OPTIONS.randomRows, rowCount, seed);

  const rowIndexes = capIndexes([...indexes].sort((a, b) => a - b), maxRows, seed);
  return {
    rows: rowIndexes.map(index => rows[index]),
    rowIndexes,
    strategy: "matrix_sample",
    sourceRowCount: rowCount,
    sampleRowCount: rowIndexes.length
  };
}

export function createUnderstandingSample<T>(
  rows: T[],
  options: Omit<SemanticSampleOptions, "maxRows" | "fullRows" | "headRows" | "tailRows" | "evenRows" | "randomRows"> & {
    maxRows?: number;
  } = {}
): SemanticSample<T> {
  return createSemanticSample(rows, {
    maxRows: options.maxRows ?? DEFAULT_OPTIONS.maxRows,
    fullRows: 100,
    headRows: 100,
    tailRows: 100,
    evenRows: 500,
    randomRows: 300,
    seed: options.seed
  });
}
