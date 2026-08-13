import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import type { CanonicalConsumerBuildResultV1 } from "../../lib/understanding-core/canonical-consumer-boundary";
import type { CanonicalRemediationOperationV1 } from "../../lib/understanding-core/canonical-consumer-presentation-contract";
import {
  appendCanonicalEvidenceDeclaration,
  appendCanonicalMappingDecision,
  compatibleRegistrySignals,
  createCanonicalUserOverlay,
  removeCanonicalEvidenceDeclaration,
  resetCanonicalUserOverlay,
  type CanonicalUserOverlayV1,
} from "../../lib/understanding-core/canonical-user-overlay";
import { useUiLanguage } from "../../lib/ui-language";

type Props = {
  artifact: CanonicalConsumerBuildResultV1;
  overlay: CanonicalUserOverlayV1 | null;
  rebuildState: "idle" | "pending" | "succeeded" | "failed";
  onChange: (overlay: CanonicalUserOverlayV1) => void;
  target?: CanonicalRemediationOperationV1 | null;
  perspectiveId?: string | null;
};

const GUIDED_SIGNAL_PRIORITY: Record<string, readonly string[]> = {
  revenue: ["revenue", "net_revenue", "invoice_total", "sales", "quantity", "sold_qty"],
  finance: ["gross_profit", "profit", "revenue", "net_revenue", "invoice_total", "cost", "total_cost"],
  inventory: ["stock_qty", "inventory", "sku", "product", "warehouse", "time_period"],
  operations: ["shipment", "trip", "delivery_status", "warehouse", "report_date", "time_period"],
  performance: ["quality_score", "performance_rank", "person", "team", "role"],
  customer: ["customer", "segment", "contact", "previous_outcome", "previous_contacts"],
};

const USABLE_GUIDED_DISPOSITIONS = new Set(["selected", "viable"]);
const LINE_MEASURE_SIGNALS = new Set([
  "revenue", "net_revenue", "invoice_total", "sales", "quantity", "sold_qty",
  "gross_profit", "profit", "cost", "total_cost",
]);
const DOCUMENT_SIGNALS = new Set(["order", "sales_order", "billing_document", "shipment", "trip"]);

export const CanonicalEvidenceReview: React.FC<Props> = ({ artifact, overlay, rebuildState, onChange, target, perspectiveId }) => {
  const { t } = useUiLanguage();
  const boundary = artifact.sourceBoundary;
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [currency, setCurrency] = useState("");
  const [moneyColumns, setMoneyColumns] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [role, setRole] = useState("");
  const [quantityColumn, setQuantityColumn] = useState("");
  const [uomColumn, setUomColumn] = useState("");
  const [uom, setUom] = useState("");
  const [asOfColumn, setAsOfColumn] = useState("");
  const [asOfDate, setAsOfDate] = useState("");
  const [itemColumn, setItemColumn] = useState("");
  const [warehouseColumn, setWarehouseColumn] = useState("");
  const [documentColumn, setDocumentColumn] = useState("");

  const reviewColumns = useMemo(() => artifact.status === "valid"
    ? artifact.canonicalSource.semantic.columns.filter((column) => ["ambiguous", "unknown"].includes(column.finalState))
    : [], [artifact]);
  const columns = boundary?.semanticSample.columns ?? [];
  useEffect(() => {
    if (!target) return;
    const details = detailsRef.current;
    if (!details) return;
    details.open = true;
    const targetId = target.kind === "open_mapping_review" && target.physicalColumn
      ? `mapping:${target.physicalColumn}`
      : target.kind;
    window.requestAnimationFrame(() => {
      const destination = Array.from(details.querySelectorAll<HTMLElement>("[data-remediation-target]"))
        .find((element) => element.dataset.remediationTarget === targetId);
      destination?.scrollIntoView({ block: "center" });
      destination?.focus();
    });
  }, [target]);
  if (!boundary) return null;
  const current = overlay ?? createCanonicalUserOverlay(boundary);
  const activeMappings = [...current.mappingDecisions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).filter((item, index, all) => all.findIndex((candidate) => candidate.physicalColumn === item.physicalColumn) === index);
  const activeDeclarations = [...current.sourceEvidenceDeclarations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).filter((item, index, all) => all.findIndex((candidate) => candidate.evidenceType === item.evidenceType && JSON.stringify(candidate.scope) === JSON.stringify(item.scope)) === index);
  const guidedSetup = (() => {
    if (artifact.status !== "valid" || !perspectiveId) return null;
    const priority = GUIDED_SIGNAL_PRIORITY[perspectiveId] ?? [];
    const priorityIndex = new Map(priority.map((signal, index) => [signal, index]));
    const recommendedMappings = reviewColumns.flatMap((column) => {
      const candidates = column.candidateTraces
        .filter((trace) => USABLE_GUIDED_DISPOSITIONS.has(trace.disposition) && priorityIndex.has(trace.candidateId))
        .sort((left, right) =>
          (priorityIndex.get(left.candidateId) ?? 999) - (priorityIndex.get(right.candidateId) ?? 999)
          || left.candidateId.localeCompare(right.candidateId));
      return candidates[0] ? [{ column, signal: candidates[0].candidateId }] : [];
    });
    if (recommendedMappings.length === 0) return null;
    const semanticSignalFor = (column: typeof artifact.canonicalSource.semantic.columns[number]) =>
      recommendedMappings.find((item) => item.column.physicalColumn === column.physicalColumn)?.signal
      ?? column.selectedCandidateId;
    const rowIdentity = artifact.canonicalSource.semantic.columns.find((column) => {
      const signal = semanticSignalFor(column);
      const profile = boundary.fullFileProfile.artifact.sourceProfile.columns[column.sourceColumnIndex];
      return signal === "record_id" && profile?.uniqueness.isUnique === true && profile.nullCount === 0;
    });
    const documentIdentity = artifact.canonicalSource.semantic.columns.find((column) => {
      const signal = semanticSignalFor(column);
      const profile = boundary.fullFileProfile.artifact.sourceProfile.columns[column.sourceColumnIndex];
      return Boolean(signal && DOCUMENT_SIGNALS.has(signal) && profile && profile.nullCount === 0);
    });
    const lineMeasures = rowIdentity
      ? recommendedMappings.filter((item) => LINE_MEASURE_SIGNALS.has(item.signal))
      : [];
    return {
      recommendedMappings,
      rowIdentity,
      documentIdentity,
      lineMeasures,
      labels: [
        ...recommendedMappings.map((item) => `${item.column.physicalColumn} = ${item.signal.replaceAll("_", " ")}`),
        ...(documentIdentity ? [`${documentIdentity.physicalColumn} = document identity`] : []),
        ...lineMeasures.map((item) => `${item.column.physicalColumn} = value on each source row`),
      ],
    };
  })();

  const updateMapping = (physicalColumn: string, sourceColumnIndex: number, signal: string | null, decisionType: "confirm_candidate" | "map_to_existing_signal" | "ignore_for_semantic_analysis" | "reset_to_inferred", candidates: string[]) => {
    onChange(appendCanonicalMappingDecision(current, boundary, { physicalColumn, sourceColumnIndex, selectedCanonicalSignal: signal, decisionType, originalCandidateList: candidates }));
  };

  const applyEvidence = () => {
    let next = current;
    if (periodStart || periodEnd) next = appendCanonicalEvidenceDeclaration(next, boundary, { evidenceType: "reporting_period", value: { kind: "reporting_period", start: periodStart, end: periodEnd }, scope: { level: "source_file" } });
    const scopedMoney = moneyColumns.split(",").map((item) => item.trim()).filter(Boolean);
    if (currency.trim() && scopedMoney.length) next = appendCanonicalEvidenceDeclaration(next, boundary, { evidenceType: "reporting_currency", value: { kind: "reporting_currency", currency, monetaryColumns: scopedMoney }, scope: { level: "source_file" } });
    if (role) next = appendCanonicalEvidenceDeclaration(next, boundary, { evidenceType: "source_role", value: { kind: "source_role", role: role as "sales" | "accounting" | "logistics" | "inventory_snapshot" | "inventory_movement" }, scope: { level: "source_file" } });
    if (quantityColumn && uomColumn && uom) next = appendCanonicalEvidenceDeclaration(next, boundary, { evidenceType: "unit_of_measure", value: { kind: "unit_of_measure", unit: uom, quantityColumn, uomColumn }, scope: { level: "canonical_signal_binding", physicalColumn: quantityColumn, canonicalSignal: "stock_qty" } });
    if (asOfColumn && asOfDate) next = appendCanonicalEvidenceDeclaration(next, boundary, { evidenceType: "snapshot_as_of_date", value: { kind: "snapshot_as_of_date", date: asOfDate, physicalColumn: asOfColumn }, scope: { level: "physical_column", physicalColumn: asOfColumn } });
    if (itemColumn) next = appendCanonicalEvidenceDeclaration(next, boundary, { evidenceType: "item_identity", value: { kind: "item_identity", physicalColumn: itemColumn }, scope: { level: "canonical_signal_binding", physicalColumn: itemColumn, canonicalSignal: "sku" } });
    if (warehouseColumn) next = appendCanonicalEvidenceDeclaration(next, boundary, { evidenceType: "warehouse_location_identity", value: { kind: "warehouse_location_identity", physicalColumn: warehouseColumn }, scope: { level: "canonical_signal_binding", physicalColumn: warehouseColumn, canonicalSignal: "warehouse" } });
    if (documentColumn) next = appendCanonicalEvidenceDeclaration(next, boundary, { evidenceType: "document_identity", value: { kind: "document_identity", physicalColumn: documentColumn }, scope: { level: "physical_column", physicalColumn: documentColumn } });
    onChange(next);
  };

  const applyGuidedSetup = () => {
    if (!guidedSetup) return;
    let next = current;
    for (const item of guidedSetup.recommendedMappings) {
      next = appendCanonicalMappingDecision(next, boundary, {
        physicalColumn: item.column.physicalColumn,
        sourceColumnIndex: item.column.sourceColumnIndex,
        selectedCanonicalSignal: item.signal,
        decisionType: "confirm_candidate",
        originalCandidateList: item.column.candidateTraces.map((trace) => trace.candidateId),
      });
    }
    if (guidedSetup.documentIdentity) {
      next = appendCanonicalEvidenceDeclaration(next, boundary, {
        evidenceType: "document_identity",
        value: { kind: "document_identity", physicalColumn: guidedSetup.documentIdentity.physicalColumn },
        scope: { level: "physical_column", physicalColumn: guidedSetup.documentIdentity.physicalColumn },
      });
    }
    if (guidedSetup.rowIdentity) {
      for (const item of guidedSetup.lineMeasures) {
        next = appendCanonicalEvidenceDeclaration(next, boundary, {
          evidenceType: "line_measure",
          value: {
            kind: "line_measure",
            physicalColumn: item.column.physicalColumn,
            semanticId: item.signal,
            rowIdentityPhysicalColumn: guidedSetup.rowIdentity.physicalColumn,
          },
          scope: {
            level: "canonical_signal_binding",
            physicalColumn: item.column.physicalColumn,
            canonicalSignal: item.signal,
          },
        });
      }
    }
    onChange(next);
  };

  const guidedSetupCard = guidedSetup && (
    <section className="rounded-xl border border-blue-200 bg-blue-50 p-4" data-testid="canonical-guided-setup">
      <div className="text-[13px] font-semibold text-blue-950">LightBI can prepare this perspective</div>
      <p className="mt-1 text-[12px] leading-5 text-blue-800">
        Confirm these source-bound meanings once. LightBI will rebuild the analysis and will still refuse any chart that fails the governed safety check.
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {guidedSetup.labels.map((label) => (
          <span key={label} className="rounded-full border border-blue-200 bg-white px-2 py-1 text-[11px] text-blue-800">{label}</span>
        ))}
      </div>
      <button
        type="button"
        disabled={rebuildState === "pending"}
        onClick={applyGuidedSetup}
        className="mt-3 rounded-lg bg-blue-700 px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
      >
        {t('Confirm LightBI setup')}
      </button>
    </section>
  );

  return (
    <>
    {guidedSetupCard}
    <details ref={detailsRef} className="rounded-lg border border-gray-200 bg-white" aria-busy={rebuildState === "pending"} data-testid="canonical-evidence-review">
      <summary className="cursor-pointer px-4 py-3 text-[13px] font-semibold text-gray-800">{t('Review mappings and source evidence')}</summary>
      <div className="space-y-4 border-t border-gray-100 p-4">
        <div className="flex items-center justify-between gap-3 text-[12px]">
          <div className="min-w-0 text-gray-500">{t('Source-bound confirmation')} · {t('revision')} {current.revision}</div>
          <div className="flex shrink-0 items-center gap-2">
            {rebuildState === "pending" && <span className="flex items-center gap-1 text-blue-700"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> {t('Rebuilding')}</span>}
            {rebuildState === "succeeded" && <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> {t('Rebuilt')}</span>}
            {rebuildState === "failed" && <span className="flex items-center gap-1 text-red-700"><AlertTriangle className="h-3.5 w-3.5" /> {t('Rebuild failed')}</span>}
            <button type="button" className="rounded border border-gray-200 px-2 py-1 text-gray-600" onClick={() => onChange(resetCanonicalUserOverlay(current, boundary))}>{t('Reset current source')}</button>
          </div>
        </div>
        <details className="text-[11px] text-gray-500">
          <summary className="cursor-pointer font-medium text-gray-600">Developer diagnostics</summary>
          <p className="mt-1 break-all"><span className="font-medium">Source fingerprint:</span> {boundary.sourceFingerprint}</p>
        </details>

        {artifact.status === "valid" && artifact.overlayValidation.blockers.length > 0 && (
          <div className="rounded border border-amber-200 bg-amber-50 p-2 text-[12px] text-amber-800">Invalid or stale declarations were not applied: {artifact.overlayValidation.blockers.join(", ")}</div>
        )}

        {(activeMappings.length > 0 || activeDeclarations.length > 0) && <div className="space-y-2 rounded border border-gray-100 p-3 text-[12px]">
          <div className="text-[11px] font-semibold uppercase text-gray-500">Current source-bound overlay</div>
          {activeMappings.map((item) => <div key={item.decisionId} className="flex flex-wrap items-center gap-2 text-gray-600">
            <span className="font-medium text-gray-800">{item.physicalColumn}</span>
            <span>{item.decisionType === "ignore_for_semantic_analysis" ? "Ignored" : item.decisionType === "reset_to_inferred" ? "Inferred mapping restored" : `User-confirmed as ${item.selectedCanonicalSignal}`}</span>
            <span className="text-gray-400">scope: {item.binding.sheetOrTable ?? "source file"}</span>
          </div>)}
          {activeDeclarations.map((item) => <div key={item.declarationId} className="flex flex-wrap items-center gap-2 text-gray-600">
            <span className="font-medium text-gray-800">{item.evidenceType}</span>
            <span>User-confirmed</span>
            <span className={item.validationStatus === "valid" ? "text-emerald-700" : "text-red-700"}>{item.validationStatus}</span>
            <span className="text-gray-400">scope: {scopeLabel(item.scope)}</span>
            <button type="button" className="rounded border border-gray-200 px-2 py-0.5 text-gray-600" onClick={() => onChange(removeCanonicalEvidenceDeclaration(current, boundary, item.declarationId))}>Remove</button>
          </div>)}
        </div>}

        {reviewColumns.length > 0 && <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase text-gray-500">Ambiguous and unknown columns</div>
          <div className="text-[11px] text-gray-400">Observed source evidence is shown below each inferred candidate. User confirmations remain separately labeled in the overlay.</div>
          {reviewColumns.map((column) => {
            const candidates = column.candidateTraces.map((trace) => trace.candidateId);
            const compatible = compatibleRegistrySignals(boundary, column.physicalColumn);
            const traces = column.candidateTraces.map((trace) => ({ id: trace.candidateId, supporting: trace.completeEvidenceProfile.supportingEvidence.map((item) => item.evidenceId), contradicting: trace.completeEvidenceProfile.conflictingEvidence.map((item) => item.evidenceId) }));
            return <MappingRow key={`${column.sourceColumnIndex}:${column.physicalColumn}`} column={column.physicalColumn} state={column.finalState} candidates={candidates} traces={traces} compatible={compatible.map((item) => ({ id: item.canonicalId, label: item.label }))} onApply={(signal, type) => updateMapping(column.physicalColumn, column.sourceColumnIndex, signal, type, candidates)} />;
          })}
        </div>}

        <div className="grid gap-3 md:grid-cols-2">
          <label tabIndex={-1} data-remediation-target="open_currency_declaration" className="text-[12px] text-gray-600">Reporting currency<input value={currency} onChange={(event) => setCurrency(event.target.value)} placeholder="Enter currency code" className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5" /></label>
          <label className="text-[12px] text-gray-600">Monetary columns, comma separated<input value={moneyColumns} onChange={(event) => setMoneyColumns(event.target.value)} className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5" /></label>
          <label tabIndex={-1} data-remediation-target="open_reporting_period_declaration" className="text-[12px] text-gray-600">Period start<input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5" /></label>
          <label className="text-[12px] text-gray-600">Period end<input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5" /></label>
          <Select target="open_source_role_declaration" label="Source role" value={role} onChange={setRole} options={["", "sales", "accounting", "logistics", "inventory_snapshot", "inventory_movement"]} />
          <Select target="open_snapshot_declaration" label="Quantity column" value={quantityColumn} onChange={setQuantityColumn} options={["", ...columns]} />
          <Select target="open_uom_declaration" label="UOM column" value={uomColumn} onChange={setUomColumn} options={["", ...columns]} />
          <label className="text-[12px] text-gray-600">Unit of measure<input value={uom} onChange={(event) => setUom(event.target.value)} placeholder="Enter unit code" className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5" /></label>
          <Select label="As-of column" value={asOfColumn} onChange={setAsOfColumn} options={["", ...columns]} />
          <label className="text-[12px] text-gray-600">Snapshot as-of date<input type="date" value={asOfDate} onChange={(event) => setAsOfDate(event.target.value)} className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5" /></label>
          <Select target="open_item_identity_declaration" label="Item identity" value={itemColumn} onChange={setItemColumn} options={["", ...columns]} />
          <Select target="open_warehouse_identity_declaration" label="Warehouse identity" value={warehouseColumn} onChange={setWarehouseColumn} options={["", ...columns]} />
          <Select target="open_document_identity_declaration" label="Document identity" value={documentColumn} onChange={setDocumentColumn} options={["", ...columns]} />
        </div>
        <button type="button" onClick={applyEvidence} className="rounded border border-indigo-200 bg-indigo-50 px-3 py-2 text-[12px] font-semibold text-indigo-700">Apply evidence and rebuild</button>
      </div>
    </details>
    </>
  );
};

const Select: React.FC<{ label: string; value: string; options: string[]; target?: string; onChange: (value: string) => void }> = ({ label, value, options, target, onChange }) => <label tabIndex={target ? -1 : undefined} data-remediation-target={target} className="text-[12px] text-gray-600">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5">{options.map((option) => <option key={option || "none"} value={option}>{option || "Select..."}</option>)}</select></label>;

function scopeLabel(scope: CanonicalUserOverlayV1["sourceEvidenceDeclarations"][number]["scope"]): string {
  if (scope.level === "sheet_table") return `sheet/table ${scope.sheetOrTable}`;
  if (scope.level === "physical_column") return `column ${scope.physicalColumn}`;
  if (scope.level === "canonical_signal_binding") return `${scope.physicalColumn} → ${scope.canonicalSignal}`;
  return scope.level.replace("_", " ");
}

const MappingRow: React.FC<{ column: string; state: string; candidates: string[]; traces: Array<{ id: string; supporting: string[]; contradicting: string[] }>; compatible: Array<{ id: string; label: string }>; onApply: (signal: string | null, type: "confirm_candidate" | "map_to_existing_signal" | "ignore_for_semantic_analysis" | "reset_to_inferred") => void }> = ({ column, state, candidates, traces, compatible, onApply }) => {
  const [signal, setSignal] = useState(candidates[0] ?? "");
  const isCandidate = candidates.includes(signal);
  return <div tabIndex={-1} data-remediation-target={`mapping:${column}`} className="rounded border border-gray-100 bg-gray-50 p-3 text-[12px]">
    <div className="font-medium text-gray-800">{column} <span className="ml-1 text-gray-400">{state}</span></div>
    <div className="mt-1 text-gray-500">Inferred candidates: {candidates.join(", ") || "none"}.</div>
    {traces.map((trace) => <div key={trace.id} className="mt-1 text-[11px] text-gray-400">{trace.id}: supporting {trace.supporting.join(", ") || "none"}; contradicting {trace.contradicting.join(", ") || "none"}</div>)}
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select value={signal} onChange={(event) => setSignal(event.target.value)} className="min-w-[220px] rounded border border-gray-200 bg-white px-2 py-1.5">{compatible.map((item) => <option key={item.id} value={item.id}>{item.label} ({item.id})</option>)}</select>
      <button type="button" disabled={!signal} onClick={() => onApply(signal, isCandidate ? "confirm_candidate" : "map_to_existing_signal")} className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1.5 font-medium text-emerald-700 disabled:opacity-40">Confirm mapping</button>
      <button type="button" onClick={() => onApply(null, "ignore_for_semantic_analysis")} className="rounded border border-gray-200 bg-white px-2 py-1.5 text-gray-600">Ignore</button>
      <button type="button" onClick={() => onApply(null, "reset_to_inferred")} className="rounded border border-gray-200 bg-white px-2 py-1.5 text-gray-600">Reset</button>
    </div>
  </div>;
};
