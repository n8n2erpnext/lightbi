import React from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Database,
  Loader2,
  Settings2,
  Sparkles,
} from "lucide-react";
import type { CanonicalSourceRoleV1, GovernedRelationshipStateV1 } from "../../lib/understanding-core/canonical-multisource-boundary";
import {
  projectCanonicalBusinessPerspectives,
  type CanonicalBusinessPerspectiveCandidateV1,
  type CanonicalSourceCandidateProjectionV1,
  type GovernedBundleCandidateV1,
} from "../../lib/canonical-source-candidate-projection";
import {
  buildDatasetCollectionUnderstanding,
  type ReportingPeriodScopeV1,
} from "../../lib/understanding-core/collection-understanding";
import { CanonicalPerspectiveSelector, getCanonicalPerspectiveDisplay } from "./CanonicalPerspectiveSelector";
import { useDisplayPreferences } from "../../stores/display-preferences-store";
import { useUiLanguage } from "../../lib/ui-language";
import type { FocusSubjectCandidate } from "../../lib/focus-subject-analysis";
import { MultiSourceFocusSubjectSelector } from "./MultiSourceFocusSubjectSelector";
import type { MultiSourceFocusSubjectSelectionV1 } from "../../lib/multisource-focus-subject";

export type MultiSourceDraftV1 = {
  selected: boolean;
  role: CanonicalSourceRoleV1 | "";
  documentColumn: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  monetaryColumns: string;
};

export type MultiSourceReviewSourceV1 = {
  key: string;
  name: string;
  rowCount: number;
  columns: string[];
  candidates?: CanonicalSourceCandidateProjectionV1 | null;
  focusCandidates?: FocusSubjectCandidate[];
};

type Props = {
  sources: MultiSourceReviewSourceV1[];
  drafts: Record<string, MultiSourceDraftV1>;
  onChange: (key: string, value: MultiSourceDraftV1) => void;
  bundles?: GovernedBundleCandidateV1[];
  onReviewBundle?: (bundle: GovernedBundleCandidateV1) => void;
  onUseSource?: (key: string) => void;
  onAnalyzePerspective?: (
    perspective: CanonicalBusinessPerspectiveCandidateV1,
    periodScope: ReportingPeriodScopeV1 | null,
    options: { currency: string | null },
  ) => void;
  onBuild: () => void;
  building: boolean;
  selectedFocusSubject?: MultiSourceFocusSubjectSelectionV1 | null;
  onFocusSubjectChange?: (selection: MultiSourceFocusSubjectSelectionV1 | null) => void;
  relationshipState?: GovernedRelationshipStateV1 | null;
  blockers?: string[];
  relationshipPresentation?: {
    state: string;
    relationshipArtifactId: string;
    participatingSources: Array<{ sourceId: string; label: string; role: string; required: boolean }>;
    blockers: string[];
    restrictions: string[];
  } | null;
};

const humanize = (value: string) => value.replaceAll("_", " ");
const workflowLabels = {
  order_to_cash_and_delivery: "Sales → Accounting → Delivery",
  period_partition: "Comparable reports across periods",
  multi_source_business_evidence: "Related business evidence",
  unresolved: "Sources need one clarification",
} as const;
export const CanonicalMultiSourceReview: React.FC<Props> = ({
  sources,
  drafts,
  onChange,
  bundles = [],
  onUseSource,
  onAnalyzePerspective,
  onBuild,
  building,
  selectedFocusSubject = null,
  onFocusSubjectChange,
  relationshipState,
  blockers = [],
  relationshipPresentation = null,
}) => {
  const preferences = useDisplayPreferences((state) => state.preferences);
  const { language, t } = useUiLanguage();
  const collectionSources = React.useMemo(
    () => sources.map((source) => ({
      key: source.key,
      name: source.name,
      rowCount: source.rowCount,
      columns: source.columns,
      candidates: source.candidates ?? null,
    })),
    [sources],
  );
  const collection = React.useMemo(
    () => buildDatasetCollectionUnderstanding(collectionSources, bundles),
    [collectionSources, bundles],
  );
  const perspectives = React.useMemo(
    () => projectCanonicalBusinessPerspectives(
      sources.map((source) => ({ key: source.key, candidates: source.candidates ?? null })),
      bundles,
    ),
    [sources, bundles],
  );
  const [selectedPerspectiveId, setSelectedPerspectiveId] = React.useState<CanonicalBusinessPerspectiveCandidateV1["perspectiveId"] | null>(
    collection.defaultPerspectiveId,
  );
  const [baselinePeriod, setBaselinePeriod] = React.useState(collection.observedPeriods[0] ?? "");
  const [comparisonPeriod, setComparisonPeriod] = React.useState(collection.observedPeriods.at(-1) ?? "");
  const [currency, setCurrency] = React.useState("");

  React.useEffect(() => {
    if (!selectedPerspectiveId && collection.defaultPerspectiveId) setSelectedPerspectiveId(collection.defaultPerspectiveId);
  }, [collection.defaultPerspectiveId, selectedPerspectiveId]);
  React.useEffect(() => {
    if (!collection.observedPeriods.includes(baselinePeriod)) setBaselinePeriod(collection.observedPeriods[0] ?? "");
    if (!collection.observedPeriods.includes(comparisonPeriod)) setComparisonPeriod(collection.observedPeriods.at(-1) ?? "");
  }, [baselinePeriod, collection.observedPeriods, comparisonPeriod]);

  const selectedPerspective = perspectives.find((item) => item.perspectiveId === selectedPerspectiveId) ?? null;
  const selectedPerspectiveDisplay = selectedPerspective
    ? getCanonicalPerspectiveDisplay(selectedPerspective.perspectiveId, selectedPerspective.label, selectedPerspective.purpose, language)
    : null;
  const selectedSources = selectedPerspective
    ? sources.filter((source) => selectedPerspective.sourceKeys.includes(source.key))
    : [];
  const hasMoneyEvidence = selectedSources.some((source) => (source.candidates?.monetaryColumnCandidates.length ?? 0) > 0);
  const observedCurrencies = [...new Set(selectedSources.flatMap((source) =>
    source.candidates?.observedCurrencyCandidates.map((candidate) => candidate.value.currency) ?? []))];
  const settingsCurrency = /^[A-Z]{3}$/.test(preferences.currencyCode)
    ? preferences.currencyCode
    : "";
  const currencyConflict = observedCurrencies.length > 1
    || (observedCurrencies.length === 1
      && Boolean(settingsCurrency)
      && observedCurrencies[0] !== settingsCurrency);
  const needsCurrency = Boolean(
    selectedPerspective
    && hasMoneyEvidence
    && selectedPerspective.capabilityIds.some((capability) =>
      capability === "sales_revenue" || capability === "gross_profit")
    && (currencyConflict || (observedCurrencies.length === 0 && !settingsCurrency)),
  );
  const resolvedCurrency = currencyConflict
    ? currency.trim().toUpperCase()
    : observedCurrencies.length === 1
      ? observedCurrencies[0]
      : settingsCurrency || currency.trim().toUpperCase();
  const periodScope: ReportingPeriodScopeV1 | null = collection.observedPeriods.length === 0
    ? null
    : collection.observedPeriods.length === 1
      ? { mode: "single", periodId: collection.observedPeriods[0] }
      : { mode: "compare", baselinePeriodId: baselinePeriod, comparisonPeriodId: comparisonPeriod };
  const unresolvedForSelection = selectedPerspective
    ? collection.ambiguities.filter((ambiguity) => selectedPerspective.sourceKeys.some((key) => ambiguity.endsWith(key)))
    : [];
  const canAnalyze = Boolean(
    selectedPerspective
    && selectedPerspective.state !== "not_yet_executable"
    && selectedPerspective.sourceKeys.length > 0
    && (collection.observedPeriods.length < 2 || baselinePeriod !== comparisonPeriod)
    && (!needsCurrency || /^[A-Z]{3}$/.test(resolvedCurrency))
  );

  return (
    <section data-testid="canonical-multisource-review" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_65px_rgba(15,23,42,0.07)]">
      <header className="bg-slate-950 px-6 py-6 text-white md:px-8 md:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">
              <Sparkles className="h-4 w-4" />
              {t('LightBI understood your data')}
            </div>
            <h2 className="mt-3 text-[25px] font-semibold tracking-tight md:text-[30px]">
              {t(workflowLabels[collection.workflow])}
            </h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-slate-300">
              {collection.sourceCount} sources contain {collection.roles.length || "unresolved"} business role{collection.roles.length === 1 ? "" : "s"}
              {collection.observedPeriods.length > 0 ? ` across ${collection.observedPeriods.length} reporting period${collection.observedPeriods.length === 1 ? "" : "s"}` : ""}.
              {t(
                ' Choose what you want to understand; LightBI will prepare the sources, metrics and charts.',
              )}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:min-w-[390px]">
            {[
              [t("Sources"), collection.sourceCount.toLocaleString()],
              [t("Rows"), collection.totalRows.toLocaleString()],
              [t("Periods"), collection.observedPeriods.length.toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
                <div className="mt-1 text-[21px] font-semibold">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="space-y-7 p-5 md:p-8">
        {sources.length === 1 && onUseSource && (
          <section className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                {t("Source ready for understanding")}
              </div>
              <p className="mt-2 text-[13px] leading-6 text-slate-700">
                {t(
                  "LightBI can analyze this source without making you choose a technical source role first. You can correct its interpretation later if needed.",
                )}
              </p>
            </div>
            <button
              type="button"
              data-testid="use-single-source"
              disabled={building}
              onClick={() => onUseSource(sources[0].key)}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-[13px] font-semibold text-white shadow-lg shadow-emerald-700/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {t("Analyze this source")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </section>
        )}

        <CanonicalPerspectiveSelector
          items={perspectives.map((perspective) => ({
            id: perspective.perspectiveId,
            label: perspective.label,
            question: perspective.businessQuestion,
            state: perspective.state === "not_yet_executable"
              ? "not_executable"
              : perspective.state === "partial"
                ? "partial"
                : perspective.state === "reviewable"
                  ? "recognized"
                  : "ready",
            badges: [...perspective.sourceRoles.map(humanize), ...perspective.periods],
            recommended: perspective.recommended,
            // Data trust reviews source evidence and does not require a chart action.
            selectable: perspective.state !== "reviewable" || perspective.perspectiveId === "data_trust",
          }))}
          selectedId={selectedPerspectiveId}
          onSelect={(id) => { setSelectedPerspectiveId(id as CanonicalBusinessPerspectiveCandidateV1["perspectiveId"]); onFocusSubjectChange?.(null); }}
          description={t(
            'Pick the business view that matches your job. LightBI handles source selection and analysis automatically.',
          )}
        />

        {selectedPerspective && (
          <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">{t('Your analysis')}</div>
                <h3 className="mt-2 text-[20px] font-semibold text-slate-950">{selectedPerspectiveDisplay?.label ?? selectedPerspective.label}</h3>
                <p className="mt-1 text-[13px] leading-6 text-slate-600">{selectedPerspectiveDisplay?.question ?? selectedPerspective.purpose}</p>

                {onFocusSubjectChange && <MultiSourceFocusSubjectSelector sources={sources} activeSourceKeys={selectedPerspective.sourceKeys} selected={selectedFocusSubject} onChange={onFocusSubjectChange} />}

                {collection.observedPeriods.length > 1 && (
                  <div className="mt-5 flex flex-wrap items-end gap-3">
                    <label className="text-[11px] font-semibold text-slate-600">
                      {t('Compare')}
                      <select value={baselinePeriod} onChange={(event) => setBaselinePeriod(event.target.value)} className="mt-1.5 block min-w-36 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] text-slate-900">
                        {collection.observedPeriods.map((period) => <option key={period} value={period}>{period}</option>)}
                      </select>
                    </label>
                    <span className="pb-3 text-[12px] font-medium text-slate-400">{t('with')}</span>
                    <label className="text-[11px] font-semibold text-slate-600">
                      {t('Period')}
                      <select value={comparisonPeriod} onChange={(event) => setComparisonPeriod(event.target.value)} className="mt-1.5 block min-w-36 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] text-slate-900">
                        {collection.observedPeriods.map((period) => <option key={period} value={period}>{period}</option>)}
                      </select>
                    </label>
                  </div>
                )}

                {needsCurrency && (
                  <label className="mt-5 block max-w-sm text-[11px] font-semibold text-slate-600">
                    {currencyConflict
                      ? t('The source currency conflicts with Settings. Which currency should govern this analysis?')
                      : t('What currency are the amounts in?')}
                    <div className="mt-1.5 flex items-center rounded-xl border border-slate-200 bg-white px-3">
                      <input
                        value={currency}
                        onChange={(event) => setCurrency(event.target.value.toUpperCase().slice(0, 3))}
                        placeholder="e.g. VND"
                        aria-label="Reporting currency"
                        className="min-w-0 flex-1 bg-transparent py-2.5 text-[12px] uppercase text-slate-900 outline-none placeholder:normal-case placeholder:text-slate-400"
                      />
                      <span className="text-[10px] font-medium text-slate-400">3-letter code</span>
                    </div>
                    <span className="mt-1.5 block font-normal leading-5 text-slate-500">
                      {t(
                        'LightBI asks only because no reporting currency is configured or the source evidence conflicts.',
                      )}
                    </span>
                  </label>
                )}
                {!needsCurrency && hasMoneyEvidence && resolvedCurrency && (
                  <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {observedCurrencies.length === 1
                      ? t(`Currency ${resolvedCurrency} confirmed by source evidence.`)
                      : t(`Using ${resolvedCurrency} from Settings.`)}
                  </p>
                )}

                {unresolvedForSelection.length > 0 && (
                  <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-amber-800">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {t(
                      'LightBI can start safely, but may ask one clarification before making a decision-level conclusion.',
                    )}
                  </p>
                )}
              </div>

              <button
                type="button"
                data-testid="analyze-selected-perspective"
                disabled={!canAnalyze || building}
                onClick={() => {
                  if (!selectedPerspective) return;
                  if (onAnalyzePerspective) {
                    onAnalyzePerspective(selectedPerspective, periodScope, {
                      currency: resolvedCurrency || null,
                    });
                  }
                  else onBuild();
                }}
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-[13px] font-semibold text-white shadow-lg shadow-blue-700/15 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {building ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {selectedPerspective.perspectiveId === "data_trust"
                  ? t('Review data trust')
                  : t('Analyze this perspective')}
                {!building && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </section>
        )}

        <details className="group rounded-2xl border border-slate-200 bg-slate-50/70">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4">
            <Settings2 className="h-4 w-4 text-slate-500" />
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-slate-800">{t('Review technical evidence')}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{t('Optional. Use this only when LightBI asks for a clarification.')}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
          </summary>
          <div className="border-t border-slate-200 bg-white px-5 py-4">
            <div className="grid gap-3 md:grid-cols-2">
              {sources.map((source) => {
                const draft = drafts[source.key];
                const role = source.candidates?.roleCandidates[0];
                const period = source.candidates?.reportingPeriodCandidates[0];
                if (!draft) return null;
                return (
                  <div key={source.key} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <Database className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-slate-900">{source.name}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{source.rowCount.toLocaleString()} rows · {source.columns.length} columns</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {role && <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700">{humanize(role.value)}</span>}
                          {period && <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600">{period.value.start.slice(0, 7)}</span>}
                          {role?.confidence && role.confidence >= 0.7 && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] text-emerald-700"><CheckCircle2 className="h-3 w-3" /> strong evidence</span>}
                        </div>
                        <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Correct role if needed
                          <select
                            value={draft.role}
                            onChange={(event) => { onFocusSubjectChange?.(null); onChange(source.key, { ...draft, role: event.target.value as CanonicalSourceRoleV1 | "" }); }}
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] normal-case tracking-normal text-slate-800"
                          >
                            <option value="">Use LightBI suggestion</option>
                            {["sales", "accounting", "logistics", "inventory_snapshot", "inventory_movement"].map((item) => <option key={item} value={item}>{humanize(item)}</option>)}
                          </select>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </details>

        {(relationshipPresentation || relationshipState || blockers.length > 0) && (
          <div data-testid="multisource-relationship-state" className="rounded-xl border border-slate-200 bg-white p-4 text-[11px] text-slate-600">
            <p className="font-semibold text-slate-900">Relationship: {humanize(relationshipPresentation?.state ?? relationshipState ?? "not built")}</p>
            {(relationshipPresentation?.blockers.length || blockers.length > 0)
              ? <p className="mt-2 text-amber-700">{(relationshipPresentation?.blockers ?? blockers).map(humanize).join(", ")}</p>
              : null}
          </div>
        )}
      </div>
    </section>
  );
};
