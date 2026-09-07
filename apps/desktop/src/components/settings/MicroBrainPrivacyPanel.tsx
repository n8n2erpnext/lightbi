import React, { useEffect, useState } from "react";
import { BrainCircuit, CheckCircle2, ExternalLink, HardDrive, RotateCcw, ShieldCheck, AlertTriangle } from "lucide-react";
import { openExternalUrl } from "../../lib/native-capabilities";
import { lightBIFrontendUrl } from "../../lib/lightbi-routing";
import { useUiLanguage } from "../../lib/ui-language";
import { readMicroBrainHealth, type MicroBrainHealthV1 } from "../../lib/understanding-core/micro-brain/health";
import {
  clearMicroBrainLearningMemory,
  microBrainLearningMemoryBytes,
  readMicroBrainLearningState,
  readMicroBrainRuntimeState,
  setMicroBrainLearningEnabled,
  subscribeMicroBrainState,
} from "../../lib/micro-brain-privacy";

export const MicroBrainPrivacyPanel: React.FC = () => {
  const { t } = useUiLanguage();
  const [state, setState] = useState(readMicroBrainLearningState);
  const [runtime, setRuntime] = useState(readMicroBrainRuntimeState);
  const [health, setHealth] = useState<MicroBrainHealthV1 | null>(null);
  useEffect(() => subscribeMicroBrainState(() => { setState(readMicroBrainLearningState()); setRuntime(readMicroBrainRuntimeState()); }), []);
  useEffect(() => { const timer = window.setTimeout(() => setHealth(readMicroBrainHealth(true)), 50); return () => window.clearTimeout(timer); }, []);
  const memoryBytes = microBrainLearningMemoryBytes();
  const healthy = health?.status === "healthy";
  const passedChecks = health?.checks.filter((item) => item.ok).length ?? 0;
  const totalChecks = health?.checks.length ?? 0;

  return <div className="space-y-5">
    <section className="rounded-xl border border-violet-200 bg-violet-50/50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <BrainCircuit className="mt-0.5 h-5 w-5 text-violet-700" />
          <div>
            <div className="font-semibold text-slate-900">{t("Micro Brain local learning")}</div>
            <p className="mt-1 text-sm leading-6 text-slate-600">{t("Micro Brain has separate semantic and presentation-advisory lobes. Curated retrieval keeps working even when optional local learning evidence is off.")}</p>
          </div>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={state.learningEnabled} onChange={event=>setMicroBrainLearningEnabled(event.target.checked)} className="h-4 w-4" />{state.learningEnabled?t("On"):t("Off")}</label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-white/80 p-3"><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t("This session")}</div><div className="mt-1 text-lg font-semibold text-slate-900">{runtime.retrievals}</div><div className="text-xs text-slate-500">{t("semantic retrievals")}</div></div>
        <div className="rounded-lg bg-white/80 p-3"><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t("Learning evidence")}</div><div className="mt-1 text-lg font-semibold text-slate-900">{state.evidence.retrievals}</div><div className="text-xs text-slate-500">{t("sanitized events stored locally")}</div></div>
        <div className="rounded-lg bg-white/80 p-3"><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t("Local memory")}</div><div className="mt-1 text-lg font-semibold text-slate-900">{memoryBytes} B</div><div className="text-xs text-slate-500">{t("no raw values or queries")}</div></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={()=>void openExternalUrl(lightBIFrontendUrl("microBrainStatus"))} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"><ExternalLink className="h-4 w-4" />{t("View Micro Brain live status")}</button>
        <button type="button" onClick={clearMicroBrainLearningMemory} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><RotateCcw className="h-4 w-4" />{t("Clear local learning memory")}</button>
      </div>
    </section>

    <section className="p-1">
      <div className="flex items-start justify-between gap-4">
        <div><h3 className="font-semibold text-slate-900">{t("Micro Brain check")}</h3><p className="mt-1 text-sm text-slate-500">{t("A local deterministic self-check validates both brain lobes and their safety boundaries. It does not inspect or upload your business data.")}</p></div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${healthy ? "bg-emerald-100 text-emerald-800" : health ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>{healthy ? <CheckCircle2 className="h-4 w-4"/> : health ? <AlertTriangle className="h-4 w-4"/> : null}{health ? `${passedChecks}/${totalChecks}` : t("Checking…")}</span>
      </div>
      {health && <div className="mt-4 grid gap-x-5 gap-y-2 sm:grid-cols-2">{health.checks.map(item=><div key={item.id} className="flex items-start gap-2 text-sm"><span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${item.ok?"bg-emerald-500":"bg-amber-500"}`}/><div><div className="font-medium text-slate-700">{t(item.id === "semantic_index" ? "Semantic lobe" : item.id === "presentation_index" ? "Presentation advisory lobe" : item.id === "lobe_isolation" ? "Lobe isolation" : item.id === "presentation_authority" ? "Advisory authority" : item.id === "constitutional_guard" ? "Constitutional guard" : item.id === "semantic_retrieval" ? "Semantic retrieval smoke check" : item.id === "presentation_retrieval" ? "Presentation retrieval smoke check" : "Bundled footprint")}</div></div></div>)}</div>}
      {health && <div className="mt-4 text-xs text-slate-500">{t("Active semantic pack")}: {health.activePackVersion ?? t("Bundled fallback")} · {(health.bundledFootprintBytes / 1024 / 1024).toFixed(2)} MiB / {(health.bundledCeilingBytes / 1024 / 1024).toFixed(0)} MiB</div>}
    </section>

    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex gap-3 rounded-lg border border-slate-200 p-4"><HardDrive className="mt-0.5 h-5 w-5 text-slate-500"/><div><div className="font-medium text-slate-800">{t("On-device boundary")}</div><p className="mt-1 text-sm leading-6 text-slate-500">{t("Local learning evidence stays on this device. When local learning and anonymous pairing are enabled, LightBI may send aggregate retrieval counters only; raw files, queries, values and local memory are never uploaded.")}</p></div></div>
      <div className="flex gap-3 rounded-lg border border-slate-200 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600"/><div><div className="font-medium text-slate-800">{t("Evidence authority stays unchanged")}</div><p className="mt-1 text-sm leading-6 text-slate-500">{t("Turning learning on never lets retrieval similarity override evidence, domain support, formulas, governed metrics, or deterministic presentation planners.")}</p></div></div>
    </div>
  </div>;
};
