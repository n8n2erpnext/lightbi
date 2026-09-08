export const lightbiDesignTokens = {
  typography: {
    caption: 11,
    ui: 12,
    bodySm: 13,
    body: 14,
    section: 14,
    pageTitle: 18,
  },
  dimensions: {
    compactControl: 32,
    compactRow: 40,
    dataRow: 48,
    comfortableRow: 56,
    appHeader: 64,
    sidebar: 224,
    windowChrome: 28,
    windowControlWidth: 48,
    scrollbar: 10,
  },
  radius: { compact: 5, default: 8, strong: 12 },
  motion: { fast: 100, normal: 150 },
} as const;

export type LightBIDesignTokens = typeof lightbiDesignTokens;
