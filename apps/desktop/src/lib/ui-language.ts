import { useDisplayPreferences } from '../stores/display-preferences-store';

export type UiLanguage = 'en' | 'vi';

export function pickUiText(language: UiLanguage, english: string, vietnamese: string): string {
  return language === 'vi' ? vietnamese : english;
}

export function useUiLanguage() {
  const language = useDisplayPreferences((state) => state.preferences.language);
  return {
    language,
    t: (english: string, vietnamese: string) => pickUiText(language, english, vietnamese),
  };
}
