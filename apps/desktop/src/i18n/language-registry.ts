export interface LanguageMetadata {
  code: string;
  label: string;
  nativeLabel: string;
  locale: string;
  direction?: 'ltr' | 'rtl';
}

export interface LanguageCatalog {
  meta: LanguageMetadata;
  messages: Record<string, string>;
  patterns?: Array<{
    source: string;
    target: string;
    flags?: string;
  }>;
}

const DEFAULT_LANGUAGE = 'en';

const modules = import.meta.glob('./languages/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, LanguageCatalog>;

const catalogs = new Map<string, LanguageCatalog>();

for (const catalog of Object.values(modules)) {
  if (!catalog?.meta?.code || !catalog.meta.locale || !catalog.messages) continue;
  const code = catalog.meta.code.trim();
  if (!code) continue;
  catalogs.set(code, {
    ...catalog,
    meta: {
      ...catalog.meta,
      code,
      direction: catalog.meta.direction ?? 'ltr',
    },
  });
}

const reverseToEnglish = new Map<string, string>();
for (const catalog of catalogs.values()) {
  if (catalog.meta.code === DEFAULT_LANGUAGE) continue;
  for (const [source, translated] of Object.entries(catalog.messages)) {
    if (translated && !reverseToEnglish.has(translated)) reverseToEnglish.set(translated, source);
  }
}

function resolveCatalog(code: string): LanguageCatalog | undefined {
  const normalized = code.trim();
  if (!normalized) return catalogs.get(DEFAULT_LANGUAGE);
  return catalogs.get(normalized)
    ?? catalogs.get(normalized.split('-')[0])
    ?? catalogs.get(DEFAULT_LANGUAGE);
}

export function getAvailableLanguages(): LanguageMetadata[] {
  return [...catalogs.values()]
    .map((catalog) => catalog.meta)
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function getLanguageMetadata(code: string): LanguageMetadata {
  return resolveCatalog(code)?.meta
    ?? { code: 'en', label: 'English', nativeLabel: 'English', locale: 'en-US', direction: 'ltr' };
}

export function translateCatalogMessage(language: string, source: string): string {
  if (!source) return source;
  const catalog = resolveCatalog(language);
  const exact = catalog?.messages[source];
  if (exact) return exact;
  // English is the stable source language for catalogued UI copy. Legacy
  // engines can still emit Vietnamese, and the presentation boundary may
  // already contain Vietnamese text when users switch languages at runtime.
  // Reversing exact catalog entries keeps both directions complete without
  // duplicating thousands of strings and allowing the two JSON packages to drift.
  if (catalog?.meta.code === DEFAULT_LANGUAGE) {
    const reverse = reverseToEnglish.get(source);
    if (reverse) return reverse;
  }
  for (const pattern of catalog?.patterns ?? []) {
    try {
      const expression = new RegExp(pattern.source, pattern.flags ?? 'i');
      if (expression.test(source)) return source.replace(expression, pattern.target);
    } catch {
      // A malformed optional pattern must not prevent the language package
      // or the application from loading. Schema and unit tests report it.
    }
  }
  return source;
}
