import React, { useEffect, useState } from "react";
import { BrainCircuit, Check, AlertTriangle, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useUiLanguage } from "../../lib/ui-language";
import { readMicroBrainHealth, type MicroBrainHealthV1 } from "../../lib/understanding-core/micro-brain/health";

export const MicroBrainHealthBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { t } = useUiLanguage();
  const [health, setHealth] = useState<MicroBrainHealthV1 | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setHealth(readMicroBrainHealth(true)), 700);
    return () => window.clearTimeout(timer);
  }, []);

  const status = health?.status ?? "checking";
  const healthy = status === "healthy";
  const unavailable = status === "unavailable";
  const label = healthy ? t("Micro Brain healthy") : unavailable ? t("Micro Brain unavailable") : status === "degraded" ? t("Micro Brain degraded") : t("Checking Micro Brain");
  const tone = healthy ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : unavailable ? "bg-red-50 text-red-700 ring-red-200" : status === "degraded" ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-slate-50 text-slate-500 ring-slate-200";

  return <NavLink
    to="/settings?section=privacy"
    title={label}
    aria-label={label}
    className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2 text-[11px] font-semibold ring-1 ring-inset transition hover:brightness-95 ${tone}`}
  >
    <BrainCircuit className="h-3.5 w-3.5" />
    {healthy ? <Check className="h-3.5 w-3.5" /> : unavailable ? <X className="h-3.5 w-3.5" /> : status === "degraded" ? <AlertTriangle className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
    {!compact && <span>{healthy ? t("MB healthy") : unavailable ? t("MB unavailable") : status === "degraded" ? t("MB degraded") : t("MB check")}</span>}
  </NavLink>;
};
