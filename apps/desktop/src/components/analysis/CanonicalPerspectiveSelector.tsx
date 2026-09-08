import React from "react";
import { Sparkles } from "lucide-react";
import { pickUiText, useUiLanguage } from "../../lib/ui-language";

export type CanonicalPerspectiveSelectionItemV1 = {
  id: string;
  label: string;
  question: string;
  state: "ready" | "partial" | "recognized" | "not_executable";
  badges: string[];
  recommended?: boolean;
  selectable?: boolean;
};

type Props = {
  items: CanonicalPerspectiveSelectionItemV1[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClear?: () => void;
  title?: string;
  description?: string;
  eyebrow?: string;
  stepNumber?: string | null;
};

export function getCanonicalPerspectiveDisplay(
  _id: string,
  label: string,
  question: string,
  language: string,
): { label: string; question: string } {
  return {
    label: pickUiText(language, label),
    question: pickUiText(language, question),
  };
}

export const CanonicalPerspectiveSelector: React.FC<Props> = ({
  items,
  selectedId,
  onSelect,
  onClear,
  title = "What do you want LightBI to investigate?",
  description = "Perspectives are derived from canonical business evidence. Choose one before reviewing questions or generating a chart.",
  eyebrow = "Choose a business perspective",
  stepNumber = "1",
}) => {
  const { language, t } = useUiLanguage();
  const stateLabels: Record<CanonicalPerspectiveSelectionItemV1["state"], string> = {
    ready: t("Ready to analyze"),
    partial: t("Questions available"),
    recognized: t("Evidence found"),
    not_executable: t("Not executable yet"),
  };
  return (
  <section data-testid="canonical-business-perspectives" data-density="compact">
    <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700">
          {stepNumber && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px]">{stepNumber}</span>}
          {t(eyebrow)}
        </div>
        <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
          <h3 className="shrink-0 text-[14px] font-semibold text-slate-950">{t(title)}</h3>
          <p className="hidden min-w-0 truncate text-[11px] text-slate-500 lg:block">{t(description)}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {selectedId && onClear && <button type="button" onClick={onClear} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">{t("Clear perspective")}</button>}
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-500">
          {t(`${items.length} evidence-backed perspective${items.length === 1 ? "" : "s"}`)}
        </span>
      </div>
    </div>

    {items.length > 0 ? (
      <div className="border-y border-[var(--lb-divider)]" data-layout="ranked-stack">
        {items.map((item, index) => {
          const active = item.id === selectedId;
          const selectable = item.selectable ?? (item.state === "ready" || item.state === "partial");
          const localized = getCanonicalPerspectiveDisplay(item.id, item.label, item.question, language);
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`business-perspective-${item.id}`}
              aria-pressed={active}
              aria-disabled={!selectable}
              aria-posinset={index + 1}
              aria-setsize={items.length}
              disabled={!selectable}
              onClick={() => selectable && onSelect(item.id)}
              className={`group flex min-h-10 w-full min-w-0 items-center gap-3 border-b border-[var(--lb-divider)] px-1 py-2 text-left transition last:border-b-0 ${
                active
                  ? "border-l-2 border-l-blue-600 bg-blue-50/50 pl-3"
                  : selectable
                    ? "hover:bg-black/[0.025]"
                    : "cursor-not-allowed bg-black/[0.015] opacity-65"
              }`}
            >
              <span className="w-6 shrink-0 text-[10px] font-semibold tabular-nums text-[var(--lb-ink-muted)]">{String(index + 1).padStart(2, "0")}</span>
              <span className="flex min-w-0 flex-1 items-baseline gap-2">
                <span className="shrink-0 text-[13px] font-semibold text-[var(--lb-ink)]">{localized.label}</span>
                {item.recommended && <span className="inline-flex shrink-0 items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-blue-700"><Sparkles className="h-3 w-3" />{t("Recommended")}</span>}
                <span className="hidden min-w-0 flex-1 truncate text-[11px] text-[var(--lb-ink-secondary)] md:inline">{localized.question}</span>
              </span>
              <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${
                item.state === "ready"
                  ? "bg-emerald-50 text-emerald-700"
                  : item.state === "partial"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-slate-100 text-slate-600"
              }`}>
                {stateLabels[item.state]}
              </span>
            </button>
          );
        })}
      </div>
    ) : (
      <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-[12px] text-slate-500">
        {t("No perspective has enough canonical evidence yet. Review unresolved mappings first.")}
      </div>
    )}
  </section>
  );
};
