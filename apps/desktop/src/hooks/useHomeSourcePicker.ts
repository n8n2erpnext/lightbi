import { useEffect, useRef, useState } from 'react';
import type { DataIntakeRequest } from '../lib/data-intake';
import { createSourceCandidate } from '../lib/source-preflight';

export function useHomeSourcePicker() {
  const [inputValue, setInputValue] = useState('');
  const [analysisIntent, setAnalysisIntent] = useState<string | null>(null);
  const questionInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [questionPlaceholder, setQuestionPlaceholder] = useState('Ask a question about your data...');
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isReplaceMenuOpen, setIsReplaceMenuOpen] = useState(false);
  const [activeConnection, setActiveConnection] = useState<DataIntakeRequest | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = inputValue.trim();
      if (!trimmed) {
        setAnalysisIntent(null);
        return;
      }
      const candidate = createSourceCandidate(trimmed);
      if (!('status' in candidate)) {
        setActiveConnection({
          sourceKind: 'online_link', sourceType: candidate.sourceType, label: candidate.label,
          requiresInput: true, nextStep: 'url_input', initialUrl: trimmed,
        });
        setInputValue('');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [inputValue]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPlusMenuOpen(false);
        setIsReplaceMenuOpen(false);
      }
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      if ((event.target as HTMLElement).closest('.source-picker-toggle')) return;
      setIsPlusMenuOpen(false);
      setIsReplaceMenuOpen(false);
    };
    if (isPlusMenuOpen || isReplaceMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlusMenuOpen, isReplaceMenuOpen]);

  const closeMenus = () => {
    setIsPlusMenuOpen(false);
    setIsReplaceMenuOpen(false);
  };
  const openLocalFilePicker = () => {
    closeMenus();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };
  const openOnlineDataDrawer = () => {
    closeMenus();
    setQuestionPlaceholder('Paste Google Sheet, Microsoft 365, OneDrive, CSV, or Excel URL...');
    setActiveConnection({ sourceKind: 'online_link', sourceType: 'online_link', label: 'Online Data', requiresInput: true, nextStep: 'url_input' });
  };
  const openDatabaseDrawer = () => {
    closeMenus();
    setActiveConnection({ sourceKind: 'system', sourceType: 'database', label: 'Database System', requiresInput: true, nextStep: 'connection_form' });
  };

  return {
    inputValue, setInputValue, analysisIntent, setAnalysisIntent, questionInputRef, fileInputRef, menuRef,
    questionPlaceholder, isPlusMenuOpen, setIsPlusMenuOpen, isReplaceMenuOpen, setIsReplaceMenuOpen,
    activeConnection, setActiveConnection, isInputFocused, setIsInputFocused,
    openLocalFilePicker, openOnlineDataDrawer, openDatabaseDrawer,
  };
}
