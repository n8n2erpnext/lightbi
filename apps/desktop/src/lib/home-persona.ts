import { homeGuidance } from '../content/home-guidance';

export interface PersonaSelectionParams {
  userRole?: string;
  projectType?: string;
  dataColumns?: string[];
  recentActivity?: string[];
}

export function selectHeroSuggestionPool(params: PersonaSelectionParams): keyof typeof homeGuidance.heroSuggestionPools {
  const { userRole, projectType, dataColumns } = params;

  // 1. Exact match by projectType (highest explicit intent)
  if (projectType && projectType in homeGuidance.heroSuggestionPools) {
    return projectType as keyof typeof homeGuidance.heroSuggestionPools;
  }

  // 2. Exact match by userRole
  if (userRole && userRole in homeGuidance.heroSuggestionPools) {
    return userRole as keyof typeof homeGuidance.heroSuggestionPools;
  }

  // 3. Match by data columns (if any signals hit)
  if (dataColumns && dataColumns.length > 0) {
    let bestMatch: keyof typeof homeGuidance.heroSuggestionPools | null = null;
    let highestPriority = -1;

    const columnStr = dataColumns.join(' ').toLowerCase();

    for (const [poolKey, metadata] of Object.entries(homeGuidance.heroSuggestionPoolMetadata)) {
      const match = metadata.signals.some(signal => columnStr.includes(signal));
      
      if (match && metadata.matchPriority > highestPriority) {
        highestPriority = metadata.matchPriority;
        bestMatch = poolKey as keyof typeof homeGuidance.heroSuggestionPools;
      }
    }

    if (bestMatch) {
      return bestMatch;
    }
  }

  // 4. Fallback to default
  return 'default';
}

export interface HeroSuggestionPrompt {
  text: string;
  category: string;
}

export function getStructuredPool(poolKey: keyof typeof homeGuidance.heroSuggestionPools): HeroSuggestionPrompt[] {
  const pool = homeGuidance.heroSuggestionPools[poolKey];
  
  if (poolKey !== 'default') {
    // If we have 'operator', map it to 'operations' category for styling
    const category = poolKey === 'operator' ? 'operations' : poolKey;
    return pool.map(text => ({ text, category }));
  }

  // Map default pool items to categories heuristically based on the text
  const defaultCategoryMap: Record<string, string> = {
    "Analyze sales performance": "retail",
    "Compare branch revenue": "retail",
    "Combine Excel reports": "operations",
    "Build executive summary": "manager",
    "Review receivables aging": "accounting",
    "Analyze student performance": "education",
    "Summarize support tickets": "it",
    "Review employee attendance": "hr"
  };

  return pool.map(text => ({
    text,
    category: defaultCategoryMap[text] || "general"
  }));
}
