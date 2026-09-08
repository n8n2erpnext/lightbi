export type LightBIDensity = 'summary' | 'working' | 'evidence';

export const lightbiDensityClasses = {
  summary: {
    canvasGap: 'gap-[var(--lb-space-6)]',
    sectionGap: 'gap-[var(--lb-space-5)]',
    sectionPadding: 'py-[var(--lb-space-6)]',
  },
  working: {
    canvasGap: 'gap-[var(--lb-space-4)]',
    sectionGap: 'gap-[var(--lb-space-3)]',
    sectionPadding: 'py-[var(--lb-space-5)]',
  },
  evidence: {
    canvasGap: 'gap-[var(--lb-space-3)]',
    sectionGap: 'gap-[var(--lb-space-2)]',
    sectionPadding: 'py-[var(--lb-space-3)]',
  },
} as const;
