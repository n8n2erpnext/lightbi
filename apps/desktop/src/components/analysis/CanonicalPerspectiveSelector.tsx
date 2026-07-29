import React from "react";
import { Sparkles } from "lucide-react";

export type CanonicalPerspectiveSelectionItemV1 = {
  id: string;
  label: string;
  question: string;
  state: "ready" | "partial" | "recognized" | "not_executable";
  badges: string[];
  recommended?: boolean;
};

type Props = {
  items: CanonicalPerspectiveSelectionItemV1[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  title?: string;
  description?: string;
};

const STATE_LABELS: Record<CanonicalPerspectiveSelectionItemV1["state"], string> = {
  ready: "Ready to analyze",
  partial: "Questions available",
  recognized: "Evidence found",
  not_executable: "Not executable yet",
};

export const CanonicalPerspectiveSelector: React.FC<Props> = ({
  items,
  selectedId,
  onSelect,
  title = "What do you want LightBI to investigate?",
  description = "Perspectives are derived from canonical business evidence. Choose one before reviewing questions or generating a chart.",
}) => (
  <section data-testid="canonical-business-perspectives">
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px]">1</span>
          Choose a business perspective
        </div>
        <h3 className="mt-1 text-[17px] font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-[12px] text-slate-500">{description}</p>
      </div>
      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-500">
        {items.length} evidence-backed perspective{items.length === 1 ? "" : "s"}
      </span>
    </div>

    {items.length > 0 ? (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {items.map((item) => {
          const active = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`business-perspective-${item.id}`}
              aria-pressed={active}
              onClick={() => onSelect(item.id)}
              className={`min-h-[170px] min-w-0 overflow-hidden rounded-xl border p-4 text-left transition ${
                active
                  ? "border-blue-500 bg-blue-50 shadow-sm ring-2 ring-blue-100"
                  : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600"}`}>
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${
                  item.state === "ready"
                    ? "bg-emerald-50 text-emerald-700"
                    : item.state === "partial"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                }`}>
                  {STATE_LABELS[item.state]}
                </span>
              </div>
              <h4 className="mt-3 text-[14px] font-semibold text-slate-950">{item.label}</h4>
              <p className="mt-1 text-[12px] leading-5 text-slate-600">{item.question}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.badges.slice(0, 8).map((badge) => <span key={badge} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{badge}</span>)}
              </div>
              {item.recommended && <div className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-blue-700">Recommended</div>}
            </button>
          );
        })}
      </div>
    ) : (
      <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-[12px] text-slate-500">
        No perspective has enough canonical evidence yet. Review unresolved mappings first.
      </div>
    )}
  </section>
);
