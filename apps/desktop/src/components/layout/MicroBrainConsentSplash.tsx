import React, { useEffect, useState } from "react";
import { BrainCircuit, HardDrive, ShieldCheck } from "lucide-react";
import { useUiLanguage } from "../../lib/ui-language";
import { decideMicroBrainLearning, readMicroBrainLearningState, subscribeMicroBrainState } from "../../lib/micro-brain-privacy";

export const MicroBrainConsentSplash: React.FC = () => {
  const { t } = useUiLanguage();
  const [state, setState] = useState(readMicroBrainLearningState);
  useEffect(() => subscribeMicroBrainState(() => setState(readMicroBrainLearningState())), []);
  if (state.consent !== "unset") return null;
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 p-5 backdrop-blur-[2px]">
    <section role="dialog" aria-modal="true" aria-labelledby="micro-brain-consent-title" className="w-full max-w-xl overflow-hidden rounded-3xl border border-black/10 bg-white shadow-2xl">
      <div className="bg-gradient-to-br from-violet-100 via-blue-50 to-white px-7 py-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm"><BrainCircuit className="h-6 w-6 text-violet-700"/></div>
        <h1 id="micro-brain-consent-title" className="mt-5 text-2xl font-semibold text-slate-950">{t("Meet Micro Brain")}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t("Micro Brain is LightBI's local intelligence layer. Its semantic lobe helps recover business meaning, while a separate presentation lobe can advise future chart and narrative planning. Evidence and deterministic planners remain the authority.")}</p>
      </div>
      <div className="space-y-3 px-7 py-6">
        <div className="flex gap-3 rounded-xl border border-slate-200 p-4"><HardDrive className="mt-0.5 h-5 w-5 text-blue-600"/><div><div className="font-semibold text-slate-900">{t("Optional local learning")}</div><p className="mt-1 text-sm leading-6 text-slate-500">{t("If you allow it, LightBI may keep sanitized learning evidence on this device. The current v1 memory stores privacy-safe activity evidence only; raw file values and queries are not stored there.")}</p></div></div>
        <div className="flex gap-3 rounded-xl border border-slate-200 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600"/><div><div className="font-semibold text-slate-900">{t("Analysis still works if you say no")}</div><p className="mt-1 text-sm leading-6 text-slate-500">{t("Both bundled Micro Brain lobes remain available if you say no. LightBI simply will not retain optional local learning evidence. You can change this later in Privacy and local data settings.")}</p></div></div>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={()=>decideMicroBrainLearning(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">{t("Not now")}</button><button type="button" onClick={()=>decideMicroBrainLearning(true)} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">{t("Allow local learning")}</button></div>
      </div>
    </section>
  </div>;
};
