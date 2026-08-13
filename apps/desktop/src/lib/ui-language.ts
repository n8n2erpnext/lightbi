import { translateCatalogMessage } from '../i18n/language-registry';
import { useDisplayPreferences } from '../stores/display-preferences-store';

export type UiLanguage = string;

/**
 * Presentation copy is keyed by its stable English source text. Language
 * packages own every translation; components and analysis engines stay
 * language-neutral. The optional legacy argument is intentionally ignored so
 * existing plugins remain source-compatible while they migrate to catalogs.
 */
export function pickUiText(language: UiLanguage, english: string, _legacyTranslation?: string): string {
  return translateCatalogMessage(language, english);
}

/** Localizes deterministic text emitted by analysis engines and plugins. */
export function localizeBusinessText(language: UiLanguage, value: string | null | undefined): string {
  const source = String(value ?? '');
  if (!source.trim()) return source;
  const leading = source.match(/^\s*/)?.[0] ?? '';
  const trailing = source.match(/\s*$/)?.[0] ?? '';
  return `${leading}${translateCatalogMessage(language, source.trim())}${trailing}`;
}

/** Localizes visible application copy, including legacy and plugin surfaces. */
export function localizeUiSurfaceText(language: UiLanguage, value: string | null | undefined): string {
  return localizeBusinessText(language, value);
}

export function useUiLanguage() {
  const language = useDisplayPreferences((state) => state.preferences.language);
  return {
    language,
    t: (english: string, legacyTranslation?: string) => pickUiText(language, english, legacyTranslation),
    localize: (value: string | null | undefined) => localizeUiSurfaceText(language, value),
  };
}
