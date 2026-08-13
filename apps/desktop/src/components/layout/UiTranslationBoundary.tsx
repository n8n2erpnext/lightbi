import { useEffect, useRef, type PropsWithChildren } from 'react';
import { localizeUiSurfaceText, useUiLanguage } from '../../lib/ui-language';
import { getLanguageMetadata } from '../../i18n/language-registry';

const TRANSLATABLE_ATTRIBUTES = ['aria-label', 'placeholder', 'title'] as const;
const SKIP_SELECTOR = 'script,style,noscript,textarea,pre,code,[data-no-ui-translate]';

function translateElement(root: HTMLElement, language: string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  for (const node of textNodes) {
    const parent = node.parentElement;
    if (!parent || parent.closest(SKIP_SELECTOR)) continue;
    const translated = localizeUiSurfaceText(language, node.nodeValue);
    if (translated !== node.nodeValue) node.nodeValue = translated;
  }

  for (const element of [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]) {
    if (element.closest(SKIP_SELECTOR)) continue;
    for (const attribute of TRANSLATABLE_ATTRIBUTES) {
      const current = element.getAttribute(attribute);
      if (!current) continue;
      const translated = localizeUiSurfaceText(language, current);
      if (translated !== current) element.setAttribute(attribute, translated);
    }
  }
}

/**
 * Final presentation boundary for copy emitted by legacy pages, runtime
 * contracts and future domain plugins. It never changes source data or engine
 * payloads; only rendered text and accessibility labels are localized.
 */
export function UiTranslationBoundary({ children }: PropsWithChildren) {
  const { language } = useUiLanguage();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const metadata = getLanguageMetadata(language);
    document.documentElement.lang = metadata.code;
    document.documentElement.dir = metadata.direction ?? 'ltr';
    const root = rootRef.current;
    if (!root) return;
    translateElement(root, language);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          const parent = mutation.target.parentElement;
          if (parent) translateElement(parent, language);
          continue;
        }
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement) translateElement(node, language);
          else if (node.parentElement) translateElement(node.parentElement, language);
        }
      }
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);

  return <div ref={rootRef} className="contents">{children}</div>;
}
