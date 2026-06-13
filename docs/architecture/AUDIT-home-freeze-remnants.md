# AUDIT: Home Freeze Remnants (UX-6)

## Overview
This audit identifies all remaining BVQ (Business View & Question) architecture remnants and negative UI patterns across the frontend, specifically focusing on the `Home.tsx` entry point and its child components.

## Occurrences

### 1. `Explore`, `Investigate`, `Ask` Tabs
- **File:** `apps/desktop/src/pages/Home.tsx`
- **Component:** `Home` (AnalysisMode state and tab buttons)
- **Why it exists:** Legacy routing attempt to let users pick their starting paradigm (Dataset-first vs View-first vs Chat-first).
- **Action:** **Remove**. The application now enforces a single paradigm: Data -> Understanding -> Investigation.

### 2. Perspective Selector
- **File:** `apps/desktop/src/pages/Home.tsx`
- **Component:** `Home` (Perspective dropdown and state)
- **Why it exists:** Legacy BVQ feature to scope questions by business domains (e.g., Logistics vs Sales).
- **Action:** **Remove**. The Guided Investigation session already handles domain-specific context through the Analysis Opportunity.

### 3. Advanced Guided Views & "Unavailable / Missing Signals"
- **File:** `apps/desktop/src/pages/Home.tsx` & `apps/desktop/src/components/analysis/DatasetUnderstandingCard.tsx`
- **Why it exists:** Attempted to map raw datasets to strict BVQ schemas. If it failed, it threw a negative "Missing required signals" block.
- **Action:** **Remove**. Do not show "Unavailable" analysis on the Home screen. Hide the `unavailableAnalysis` rendering entirely.

### 4. Workspace Locked
- **File:** `apps/desktop/src/pages/Home.tsx`
- **Component:** `Home` (Investigate tab empty state)
- **Why it exists:** Shown when a user clicked the Investigate tab without selecting a Business View first.
- **Action:** **Remove**. The entire Investigate tab will be removed.

### 5. Questions Panel / Ask TextArea
- **File:** `apps/desktop/src/pages/Home.tsx`
- **Component:** `Home` (Ask tab and Question Suggestions grid)
- **Why it exists:** Legacy Chat-to-SQL entry point and predefined question list from the BVQ days.
- **Action:** **Remove**. Free-text queries belong inside the Investigation workspace if anywhere. The Home screen should only show structured Analysis Opportunities.

### 6. Confidence % and Partial Understanding
- **File:** `apps/desktop/src/components/analysis/DatasetUnderstandingCard.tsx`
- **Why it exists:** AI transparency metrics showing how many schema signals matched.
- **Action:** **Hide/Rename**. Remove `Confidence: X%` from the UI. Rename `Partial understanding` to `Basic understanding` to adopt a positive-first UX. 

### 7. "Dataset Understanding" Title
- **File:** `apps/desktop/src/components/analysis/DatasetUnderstandingCard.tsx`
- **Why it exists:** Internal architectural name for the Domain/Signal parsing engine.
- **Action:** **Rename** to `What LightBI Found`.

---
**Status:** Ready for implementation. All remnants listed above will be purged to freeze the Home screen as a pure Understanding-First entry point.
