import { useEffect, useState } from 'react';
import type { InvestigationSession } from '../lib/investigation-session';
import { materializeRuntimeDatasetSource } from '../lib/full-file-runtime-materializer';
import { buildFocusSubjectComparison, type FocusSubjectComparison } from '../lib/focus-subject-analysis';
import type { BAAnalysisAuthorityContextV1 } from '../lib/understanding-core/ba-analysis-authority-context';

export type FocusComparisonState =
  | { status: 'idle'; comparison: null; error: '' }
  | { status: 'loading'; comparison: null; error: '' }
  | { status: 'ready'; comparison: FocusSubjectComparison; error: '' }
  | { status: 'unavailable'; comparison: null; error: string };

export function useFocusSubjectComparison(session: InvestigationSession | null, analysisAuthority: BAAnalysisAuthorityContextV1 | null = null): FocusComparisonState {
  const [state, setState] = useState<FocusComparisonState>({ status: 'idle', comparison: null, error: '' });

  useEffect(() => {
    if (!session?.focusSubject) {
      setState({ status: 'idle', comparison: null, error: '' });
      return;
    }
    if (!session.runtimeDatasetSource) {
      setState({ status: 'unavailable', comparison: null, error: 'Full comparison source is unavailable. Reselect the source to compare this focus safely.' });
      return;
    }

    const controller = new AbortController();
    setState({ status: 'loading', comparison: null, error: '' });
    void materializeRuntimeDatasetSource(
      session.runtimeDatasetSource,
      controller.signal,
      session.runtimeDatasetSource.binding,
    ).then(materialized => {
      if (controller.signal.aborted) return;
      const rows = JSON.parse(materialized.jsonText) as Record<string, unknown>[];
      if (!Array.isArray(rows) || materialized.rowCount !== session.runtimeDatasetSource?.sourceRowCount || rows.length !== materialized.rowCount) {
        throw new Error('FOCUS_COMPARISON_FULL_SOURCE_MISMATCH');
      }
      const comparison = buildFocusSubjectComparison(rows, session.focusSubject!, session.analysisAction, 10, { kind: 'full_source', isTruncated: false }, analysisAuthority);
      if (!comparison) throw new Error('FOCUS_SUBJECT_NOT_FOUND_IN_FULL_SOURCE');
      setState({ status: 'ready', comparison, error: '' });
    }).catch(error => {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
      setState({
        status: 'unavailable',
        comparison: null,
        error: error instanceof Error && error.message === 'FOCUS_SUBJECT_NOT_FOUND_IN_FULL_SOURCE'
          ? 'The selected focus is not present in the verified full source.'
          : 'Full-source comparison is unavailable. LightBI will not substitute sampled rows.',
      });
    });

    return () => controller.abort();
  }, [session?.id, session?.focusSubject?.candidateId, session?.focusSubject?.value, analysisAuthority?.artifactIdentity, analysisAuthority?.authorization.metric?.metricId, analysisAuthority?.authorization.metric?.runtimeState]);

  return state;
}
