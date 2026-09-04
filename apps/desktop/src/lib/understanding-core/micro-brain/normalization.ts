export function normalizeMicroBrainSurface(value: unknown): string {
  return String(value ?? "")
    .replace(/đ/gi, (character) => (character === "Đ" ? "D" : "d"))
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const CONSERVATIVE_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "by", "for", "from", "in", "is", "of", "on", "or", "the", "to", "with",
  "la", "va", "cua", "cho", "tu", "trong", "tren", "voi",
]);

export function tokenizeMicroBrainSurface(value: unknown): string[] {
  return normalizeMicroBrainSurface(value)
    .split(" ")
    .filter((token) => token.length > 0 && (!CONSERVATIVE_STOP_WORDS.has(token) || token.length <= 2));
}

export function characterNgrams(token: string, minimum = 3, maximum = 5): string[] {
  const normalized = normalizeMicroBrainSurface(token).replace(/\s+/g, "_");
  const grams: string[] = [];
  for (let size = minimum; size <= maximum; size += 1) {
    if (normalized.length < size) continue;
    for (let index = 0; index <= normalized.length - size; index += 1) {
      grams.push(normalized.slice(index, index + size));
    }
  }
  return grams;
}
export function microBrainFeaturesForText(value: unknown, includeCharGrams = false): string[] {
  const tokens = tokenizeMicroBrainSurface(value);
  const features = tokens.map((token) => `w:${token}`);
  for (let index = 0; index < tokens.length - 1; index += 1) {
    features.push(`b:${tokens[index]}_${tokens[index + 1]}`);
  }
  if (includeCharGrams) {
    for (const token of tokens.filter((item) => item.length >= 4)) {
      for (const gram of characterNgrams(token, 3, 4)) features.push(`c:${gram}`);
    }
  }
  return features;
}