import React from "react";
import { Database, Link2, Loader2 } from "lucide-react";
import type { CanonicalSourceRoleV1, GovernedRelationshipStateV1 } from "../../lib/understanding-core/canonical-multisource-boundary";

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
};

type Props = {
  sources: MultiSourceReviewSourceV1[];
  drafts: Record<string, MultiSourceDraftV1>;
  onChange: (key: string, value: MultiSourceDraftV1) => void;
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

export const CanonicalMultiSourceReview: React.FC<Props> = ({ sources, drafts, onChange, onBuild, building, relationshipState, blockers = [], relationshipPresentation = null }) => {
  const selected = sources.filter((source) => drafts[source.key]?.selected);
  const missingRoles = selected.filter((source) => !drafts[source.key]?.role);
  const buildDisabled = building || selected.length < 2 || missingRoles.length > 0;
  return (
  <section data-testid="canonical-multisource-review" className="rounded-xl border border-black/10 bg-white shadow-sm">
    <div className="border-b border-black/10 p-4">
      <div className="flex items-center gap-2"><Database className="h-4 w-4 text-blue-600" /><h3 className="text-[15px] font-semibold text-[#202123]">Build a governed multi-source dataset</h3></div>
      <p className="mt-1 text-[12px] leading-5 text-black/55">Confirm each source independently. LightBI will validate identity, period, currency, cardinality and full-source evidence before enabling a related analysis.</p>
    </div>
    <div className="grid gap-3 p-4">
      {sources.map((source) => {
        const value = drafts[source.key];
        if (!value) return null;
        return <div key={source.key} data-testid={`multisource-source-${source.key}`} className="rounded-lg border border-black/10 bg-[#fbfbfa] p-3">
          <div className="flex items-start gap-3">
            <input aria-label={`Include ${source.name}`} type="checkbox" checked={value.selected} onChange={(event) => onChange(source.key, { ...value, selected: event.target.checked })} className="mt-1" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="truncate text-[13px] font-semibold text-[#202123]">{source.name}</p><span className="text-[11px] text-black/45">{source.rowCount.toLocaleString()} rows · {source.columns.length} columns</span></div>
              <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                <label className="text-[11px] text-black/55">Source role<select aria-label={`Role for ${source.name}`} value={value.role} onChange={(event) => onChange(source.key, { ...value, role: event.target.value as CanonicalSourceRoleV1 | "" })} className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-2 text-[12px]">{roles.map((role) => <option key={role || "none"} value={role}>{role || "Select role..."}</option>)}</select></label>
                <label className="text-[11px] text-black/55">Document identity<select aria-label={`Document identity for ${source.name}`} value={value.documentColumn} onChange={(event) => onChange(source.key, { ...value, documentColumn: event.target.value })} className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-2 text-[12px]"><option value="">Not declared</option>{source.columns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label>
                <label className="text-[11px] text-black/55">Currency<input aria-label={`Currency for ${source.name}`} value={value.currency} onChange={(event) => onChange(source.key, { ...value, currency: event.target.value.toUpperCase() })} placeholder="VND" className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-2 text-[12px]" /></label>
                <label className="text-[11px] text-black/55">Period start<input aria-label={`Period start for ${source.name}`} type="date" value={value.periodStart} onChange={(event) => onChange(source.key, { ...value, periodStart: event.target.value })} className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-2 text-[12px]" /></label>
                <label className="text-[11px] text-black/55">Period end<input aria-label={`Period end for ${source.name}`} type="date" value={value.periodEnd} onChange={(event) => onChange(source.key, { ...value, periodEnd: event.target.value })} className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-2 text-[12px]" /></label>
                <label className="text-[11px] text-black/55">Monetary columns<input aria-label={`Monetary columns for ${source.name}`} value={value.monetaryColumns} onChange={(event) => onChange(source.key, { ...value, monetaryColumns: event.target.value })} placeholder="Revenue, COGS" className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-2 text-[12px]" /></label>
              </div>
            </div>
          </div>
        </div>;
      })}
      {(relationshipPresentation || relationshipState || blockers.length > 0) && <div data-testid="multisource-relationship-state" className="rounded-lg border border-black/10 bg-gray-50 p-3 text-[12px] text-black/65">
        <div className="flex items-center gap-2 font-semibold text-[#202123]"><Link2 className="h-4 w-4" />Relationship: {relationshipPresentation?.state ?? relationshipState ?? "not built"}</div>
        {relationshipPresentation && <p className="mt-1 break-all text-[11px] text-black/45">Artifact: {relationshipPresentation.relationshipArtifactId}</p>}
        {(relationshipPresentation?.blockers.length || blockers.length > 0) ? <p className="mt-1 break-words">{(relationshipPresentation?.blockers ?? blockers).join(", ")}</p> : null}
        {relationshipPresentation?.restrictions.length ? <p className="mt-1 break-words">Restrictions: {relationshipPresentation.restrictions.join(", ")}</p> : null}
      </div>}
      {missingRoles.length > 0 && <p role="status" className="text-[12px] text-amber-700">Select an explicit role for every included source. A placeholder is not source evidence.</p>}
      <div className="flex justify-end"><button data-testid="build-canonical-multisource" type="button" onClick={onBuild} disabled={buildDisabled} title={missingRoles.length ? "Select a source role for every included source." : undefined} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{building && <Loader2 className="h-4 w-4 animate-spin" />}Build governed dataset</button></div>
    </div>
  </section>
  );
};
