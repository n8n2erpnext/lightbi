import { useCallback } from 'react';

interface HomeQuestionApiDependencies {
  apiBaseUrl: string;
  currentDataset: any;
  setSelectedTopic: (value: string) => void;
  setIsAsking: (value: boolean) => void;
  setResult: (value: any) => void;
}

export function useHomeQuestionApi(deps: HomeQuestionApiDependencies) {
  return useCallback(async (question: string) => {
    if (!deps.currentDataset) {
      deps.setSelectedTopic(question);
      return;
    }
    deps.setIsAsking(true);
    deps.setResult(null);
    try {
      const response = await fetch(`${deps.apiBaseUrl}/api/question/ask`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }),
      });
      deps.setResult({ ...(await response.json()), originalQuestion: question });
    } catch (error) {
      console.error(error);
      alert('Failed to ask question.');
    } finally {
      deps.setIsAsking(false);
    }
  }, [deps]);
}
