import React from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  FileCheck2,
  Link2,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { CanonicalSourceRoleV1, GovernedRelationshipStateV1 } from "../../lib/understanding-core/canonical-multisource-boundary";
import {
  projectCanonicalBusinessPerspectives,
  type CanonicalBusinessPerspectiveCandidateV1,
  type CanonicalSourceCandidateProjectionV1,
  type GovernedBundleCandidateV1,
} from "../../lib/canonical-source-candidate-projection";
import { CanonicalPerspectiveSelector } from "./CanonicalPerspectiveSelector";

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
};

type Props = {
  sources: MultiSourceReviewSourceV1[];
  drafts: Record<string, MultiSourceDraftV1>;
  onChange: (key: string, value: MultiSourceDraftV1) => void;
  bundles?: GovernedBundleCandidateV1[];
  onReviewBundle?: (bundle: GovernedBundleCandidateV1) => void;
  onUseSource?: (key: string) => void;
  onBuild: () => void;
  building: boolean;
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

const roles: Array<CanonicalSourceRoleV1 | ""> = ["", "sales", "accounting", "logistics", "inventory_snapshot", "inventory_movement"];

const humanize = (value: string) => value.replaceAll("_", " ");

export const CanonicalMultiSourceReview: React.FC<Props> = ({
  sources,
  drafts,
  onChange,
  bundles = [],
  onReviewBundle,
  onUseSource,
  onBuild,
  building,
  relationshipState,
  blockers = [],
  relationshipPresentation = null,
}) => {
  const [selectedPerspectiveId, setSelectedPerspectiveId] = React.useState<CanonicalBusinessPerspectiveCandidateV1["perspectiveId"] | null>(null);
  const selected = sources.filter((source) => drafts[source.key]?.selected);
  const missingRoles = selected.filter((source) => !drafts[source.key]?.role);
  const buildDisabled = building || selected.length < 2 || missingRoles.length > 0;
  const roleCounts = sources.reduce<Record<string, number>>((counts, source) => {
    const role = source.candidates?.roleCandidates[0]?.value;
    if (role) counts[role] = (counts[role] ?? 0) + 1;
    return counts;
  }, {});
  const periods = [...new Set(sources.flatMap((source) => source.candidates?.reportingPeriodCandidates[0]
    ? [source.candidates.reportingPeriodCandidates[0].value.start.slice(0, 7)]
    : []))];
  const supportedBundles = bundles.filter((bundle) => bundle.state !== "unsupported_current_mvp");
  const perspectives = React.useMemo(
    () => projectCanonicalBusinessPerspectives(sources.map((source) => ({ key: source.key, candidates: source.candidates ?? null })), bundles),
    [sources, bundles],
  );
  const selectedPerspective = perspectives.find((perspective) => perspective.perspectiveId === selectedPerspectiveId) ?? null;
  const visibleBundleKinds = new Set(selectedPerspective?.bundleKinds ?? []);
  const perspectiveBundles = selectedPerspective
    ? bundles.filter((bundle) => visibleBundleKinds.has(bundle.kind))
    : [];
  const selectedSourceKeys = selected.map((source) => source.key).sort();
  const activeBundle = bundles.find((bundle) => {
    const bundleKeys = [...bundle.sourceKeys].sort();
    return bundleKeys.length === selectedSourceKeys.length
      && bundleKeys.every((key, index) => key === selectedSourceKeys[index]);
  }) ?? null;
  const sharedDocumentIdentityName = React.useMemo(() => {
    if (!activeBundle || activeBundle.sourceKeys.length < 2) return null;
    const normalizedNamesBySource = activeBundle.sourceKeys.map((key) => {
      const source = sources.find((item) => item.key === key);
      return new Set((source?.candidates?.documentIdentityCandidates ?? [])
        .map((candidate) => candidate.value.physicalColumn.trim().toLowerCase()));
    });
    const common = [...(normalizedNamesBySource[0] ?? new Set<string>())]
      .filter((name) => normalizedNamesBySource.every((names) => names.has(name)));
    return common.length === 1 ? common[0] : null;
  }, [activeBundle, sources]);
  const confirmedSourceCount = sources.filter((source) => {
    const value = drafts[source.key];
    return Boolean(value?.role || value?.documentColumn || value?.periodStart || value?.currency || value?.monetaryColumns);
  }).length;

  return (
    <section data-testid="canonical-multisource-review" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <header className="border-b border-slate-200 bg-slate-950 px-5 py-5 text-white md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">
              <ShieldCheck className="h-4 w-4" />
              Governed multi-source review
            </div>
            <h2 className="mt-2 text-[22px] font-semibold tracking-tight">Turn source evidence into safe analyses</h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-5 text-slate-300">
              LightBI found {sources.length} sources across {Object.keys(roleCounts).length} candidate roles and {periods.length} observed reporting periods.
              Choose the business perspective first. LightBI will then show the exact sources and evidence that perspective needs.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:min-w-[340px]">
            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-wide text-slate-400">Sources</div>
              <div className="mt-1 text-[20px] font-semibold">{sources.length}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-wide text-slate-400">Supported</div>
              <div className="mt-1 text-[20px] font-semibold">{supportedBundles.length}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-wide text-slate-400">Reviewed</div>
              <div className="mt-1 text-[20px] font-semibold">{confirmedSourceCount}/{sources.length}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-7 p-5 md:p-6">
        <CanonicalPerspectiveSelector
          items={perspectives.map((perspective) => ({
            id: perspective.perspectiveId,
            label: perspective.label,
            question: perspective.businessQuestion,
            state: perspective.state === "needs_evidence"
              ? "partial"
              : perspective.state === "reviewable"
                ? "recognized"
                : perspective.state === "partial"
                  ? "partial"
                  : "not_executable",
            badges: [...perspective.sourceRoles, ...perspective.periods],
            recommended: perspective.recommended,
          }))}
          selectedId={selectedPerspectiveId}
          onSelect={(id) => setSelectedPerspectiveId(id as CanonicalBusinessPerspectiveCandidateV1["perspectiveId"])}
          description="Perspectives are derived from source evidence. Partial and blocked perspectives remain visible with an exact reason."
        />

        <section data-testid="governed-bundle-candidates" className={selectedPerspective ? "" : "hidden"}>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px]">2</span>
                Review perspective capability
              </div>
              <h3 className="mt-1 text-[17px] font-semibold text-slate-950">{selectedPerspective?.label}</h3>
              <p className="mt-1 text-[12px] text-slate-500">{selectedPerspective?.purpose}</p>
            </div>
            {selectedPerspective && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-500">
                {perspectiveBundles.length} governed path{perspectiveBundles.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {selectedPerspective && selectedPerspective.blockers.length > 0 && (
            <div role="status" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">
              Current boundary: {selectedPerspective.blockers.map(humanize).join(" · ")}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {bundles.map((bundle) => {
              const unsupported = bundle.state === "unsupported_current_mvp";
              const visible = perspectiveBundles.includes(bundle);
              const sourceNames = bundle.sourceKeys.map((key) => sources.find((source) => source.key === key)?.name ?? key);
              return (
                <article
                  key={bundle.bundleId}
                  data-testid={`governed-bundle-${bundle.kind}`}
                  className={`${visible ? "flex" : "hidden"} min-h-[190px] flex-col rounded-xl border p-4 ${
                    unsupported
                      ? "border-slate-200 bg-slate-50/70"
                      : bundle.kind === "delivery_source_local"
                        ? "border-emerald-200 bg-emerald-50/35"
                        : "border-blue-200 bg-blue-50/35"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      unsupported ? "bg-slate-200/70 text-slate-500" : "bg-white text-blue-700 shadow-sm"
                    }`}>
                      {bundle.kind === "delivery_source_local" ? <FileCheck2 className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${
                      unsupported
                        ? "border-slate-200 bg-white text-slate-500"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}>
                      {unsupported ? "Unsupported in current MVP" : "Needs confirmation"}
                    </span>
                  </div>
                  <h4 className="mt-3 text-[14px] font-semibold leading-5 text-slate-950">{bundle.purpose}</h4>
                  <p className="mt-1 text-[11px] text-slate-500">{bundle.sourceKeys.length} source{bundle.sourceKeys.length === 1 ? "" : "s"} · {humanize(bundle.relationshipState)}</p>
                  <div className="mt-3 space-y-1">
                    {sourceNames.map((name) => (
                      <div key={name} className="truncate text-[11px] font-medium text-slate-700">{name}</div>
                    ))}
                  </div>
                  {bundle.requiredEvidence.length > 0 && (
                    <p className="mt-3 line-clamp-2 text-[11px] leading-4 text-amber-800">
                      {bundle.requiredEvidence.join(" · ")}
                    </p>
                  )}
                  <div className="mt-auto flex justify-end pt-4">
                    {bundle.kind === "delivery_source_local" ? (
                      <button type="button" onClick={() => onUseSource?.(bundle.sourceKeys[0])} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-[11px] font-semibold text-white hover:bg-emerald-800">
                        Use source <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    ) : unsupported ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <AlertCircle className="h-3.5 w-3.5" /> View limitation
                      </span>
                    ) : (
                      <button type="button" onClick={() => onReviewBundle?.(bundle)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-[11px] font-semibold text-white hover:bg-blue-800">
                        Review bundle <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
            {perspectiveBundles.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-[12px] text-slate-500 md:col-span-2 xl:col-span-3">
                This perspective is understood, but it does not yet have a governed execution path. LightBI will not fabricate a chart.
              </div>
            )}
          </div>
        </section>

        <section className={selectedPerspective ? "" : "hidden"}>
          <div className="mb-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px]">3</span>
              Confirm source evidence
            </div>
            <h3 className="mt-1 text-[17px] font-semibold text-slate-950">Review only what each source needs</h3>
            <p className="mt-1 text-[12px] text-slate-500">Suggestions are non-authoritative. Accepting them creates explicit, source-bound declarations.</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            {sources.map((source, index) => {
              const value = drafts[source.key];
              if (!value) return null;
              const roleCandidate = source.candidates?.roleCandidates[0];
              const sharedDocumentCandidate = sharedDocumentIdentityName && activeBundle?.sourceKeys.includes(source.key)
                ? source.candidates?.documentIdentityCandidates.find(
                  (candidate) => candidate.value.physicalColumn.trim().toLowerCase() === sharedDocumentIdentityName,
                )
                : undefined;
              const documentCandidate = sharedDocumentCandidate ?? source.candidates?.documentIdentityCandidates[0];
              const periodCandidate = source.candidates?.reportingPeriodCandidates[0];
              const monetaryCandidates = source.candidates?.monetaryColumnCandidates ?? [];
              const currencyCandidate = source.candidates?.observedCurrencyCandidates[0];
              const hasConfirmation = Boolean(value.role || value.documentColumn || value.periodStart || value.currency || value.monetaryColumns);
              const acceptSuggestions = () => onChange(source.key, {
                ...value,
                role: roleCandidate?.value ?? value.role,
                documentColumn: documentCandidate?.value.physicalColumn ?? value.documentColumn,
                periodStart: periodCandidate?.value.start ?? value.periodStart,
                periodEnd: periodCandidate?.value.end ?? value.periodEnd,
                currency: currencyCandidate?.value.currency ?? value.currency,
                monetaryColumns: monetaryCandidates.length > 0
                  ? monetaryCandidates.map((candidate) => candidate.value.physicalColumn).join(", ")
                  : value.monetaryColumns,
              });
              return (
                <details
                  key={source.key}
                  data-testid={`multisource-source-${source.key}`}
                  className={`group bg-white ${index > 0 ? "border-t border-slate-200" : ""}`}
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 hover:bg-slate-50">
                    <input
                      aria-label={`Include ${source.name}`}
                      type="checkbox"
                      checked={value.selected}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => onChange(source.key, { ...value, selected: event.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[13px] font-semibold text-slate-900">{source.name}</p>
                        {roleCandidate && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{roleCandidate.value}</span>
                        )}
                        {hasConfirmation ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            <Check className="h-3 w-3" /> Confirmed by user
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Review needed</span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span>{source.rowCount.toLocaleString()} rows</span>
                        <span>{source.columns.length} columns</span>
                        {periodCandidate && <span>{periodCandidate.value.start} — {periodCandidate.value.end}</span>}
                        <span className={currencyCandidate ? "text-slate-500" : "text-amber-700"}>
                          {currencyCandidate ? `Currency ${currencyCandidate.value.currency}` : "Currency: Missing"}
                        </span>
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                  </summary>

                  <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4 md:pl-11">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        {roleCandidate && <button type="button" onClick={() => onChange(source.key, { ...value, role: roleCandidate.value })} className="rounded-md border border-blue-200 bg-white px-2 py-1.5 text-blue-700">Suggested by LightBI: {roleCandidate.value}</button>}
                        {periodCandidate && <button type="button" onClick={() => onChange(source.key, { ...value, periodStart: periodCandidate.value.start, periodEnd: periodCandidate.value.end })} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-slate-700">Observed in source: {periodCandidate.value.start} to {periodCandidate.value.end}</button>}
                        {documentCandidate && <button type="button" onClick={() => onChange(source.key, { ...value, documentColumn: documentCandidate.value.physicalColumn })} className="rounded-md border border-blue-200 bg-white px-2 py-1.5 text-blue-700">{sharedDocumentCandidate ? "Suggested shared identity" : "Suggested identity"}: {documentCandidate.value.physicalColumn}</button>}
                        {monetaryCandidates.length > 0 && <button type="button" onClick={() => onChange(source.key, { ...value, monetaryColumns: monetaryCandidates.map((candidate) => candidate.value.physicalColumn).join(", ") })} className="rounded-md border border-blue-200 bg-white px-2 py-1.5 text-blue-700">Suggested money fields: {monetaryCandidates.length}</button>}
                        {currencyCandidate
                          ? <button type="button" onClick={() => onChange(source.key, { ...value, currency: currencyCandidate.value.currency })} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-slate-700">Observed currency: {currencyCandidate.value.currency}</button>
                          : <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-700">Missing currency evidence</span>}
                      </div>
                      <button type="button" onClick={acceptSuggestions} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-800 hover:bg-blue-100">
                        <Sparkles className="h-3.5 w-3.5" /> Accept suggestions
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <label className="text-[11px] font-medium text-slate-600">Source role<select aria-label={`Role for ${source.name}`} value={value.role} onChange={(event) => onChange(source.key, { ...value, role: event.target.value as CanonicalSourceRoleV1 | "" })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[12px] text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">{roles.map((role) => <option key={role || "none"} value={role}>{role || "Select role..."}</option>)}</select></label>
                      <label className="text-[11px] font-medium text-slate-600">Document identity<select aria-label={`Document identity for ${source.name}`} value={value.documentColumn} onChange={(event) => onChange(source.key, { ...value, documentColumn: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[12px] text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"><option value="">Not declared</option>{source.columns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label>
                      <label className="text-[11px] font-medium text-slate-600">Currency<input aria-label={`Currency for ${source.name}`} value={value.currency} onChange={(event) => onChange(source.key, { ...value, currency: event.target.value.toUpperCase() })} placeholder="e.g. VND" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[12px] text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label>
                      <label className="text-[11px] font-medium text-slate-600">Period start<div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" /><input aria-label={`Period start for ${source.name}`} type="date" value={value.periodStart} onChange={(event) => onChange(source.key, { ...value, periodStart: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[12px] text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></div></label>
                      <label className="text-[11px] font-medium text-slate-600">Period end<div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" /><input aria-label={`Period end for ${source.name}`} type="date" value={value.periodEnd} onChange={(event) => onChange(source.key, { ...value, periodEnd: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[12px] text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></div></label>
                      <label className="text-[11px] font-medium text-slate-600">Monetary columns<input aria-label={`Monetary columns for ${source.name}`} value={value.monetaryColumns} onChange={(event) => onChange(source.key, { ...value, monetaryColumns: event.target.value })} placeholder="Revenue, COGS" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[12px] text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label>
                    </div>
                    <button type="button" onClick={() => onChange(source.key, { selected: value.selected, role: "", documentColumn: "", periodStart: "", periodEnd: "", currency: "", monetaryColumns: "" })} className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800">
                      <RotateCcw className="h-3 w-3" /> Reset confirmations
                    </button>
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        <section className={`${selectedPerspective ? "" : "hidden"} rounded-xl border border-slate-200 bg-slate-50 p-4`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px]">4</span>
                Build governed dataset
              </div>
              <p className="mt-2 text-[12px] leading-5 text-slate-600">
                {selected.length === 0
                  ? "Choose Review bundle above or select the exact participating sources."
                  : `${selected.length} source${selected.length === 1 ? "" : "s"} selected${missingRoles.length > 0 ? ` · ${missingRoles.length} still need an explicit role` : " · source roles confirmed"}.`}
              </p>
              {missingRoles.length > 0 && <p role="status" className="mt-1 text-[11px] font-medium text-amber-700">A placeholder is not source evidence.</p>}
            </div>
            <button
              data-testid="build-canonical-multisource"
              type="button"
              onClick={onBuild}
              disabled={buildDisabled}
              title={missingRoles.length ? "Select an explicit role for every included source." : undefined}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-[12px] font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {building && <Loader2 className="h-4 w-4 animate-spin" />}
              Build governed dataset
            </button>
          </div>
        </section>

        {(relationshipPresentation || relationshipState || blockers.length > 0) && (
          <div data-testid="multisource-relationship-state" className="rounded-xl border border-slate-200 bg-white p-4 text-[12px] text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-900"><Link2 className="h-4 w-4 text-blue-700" />Relationship: {relationshipPresentation?.state ?? relationshipState ?? "not built"}</div>
            {relationshipPresentation && <details className="mt-2 text-[11px] text-slate-500"><summary className="cursor-pointer font-medium">Developer diagnostics</summary><p className="mt-1 break-all">Relationship artifact: {relationshipPresentation.relationshipArtifactId}</p></details>}
            {(relationshipPresentation?.blockers.length || blockers.length > 0) ? <p className="mt-2 break-words text-amber-700">{(relationshipPresentation?.blockers ?? blockers).join(", ")}</p> : null}
            {relationshipPresentation?.restrictions.length ? <p className="mt-2 break-words">Restrictions: {relationshipPresentation.restrictions.join(", ")}</p> : null}
          </div>
        )}
      </div>
    </section>
  );
};
