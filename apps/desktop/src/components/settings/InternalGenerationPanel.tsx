import React, { useEffect, useMemo, useState } from 'react';
import type { LightBIGenerationDiagnostics } from '@lightbi/core-types';
import { buildGenerationManifest, generationIsolationBlockers } from '../../lib/generation-manifest';
import { probeGenerationDiagnostics } from '../../lib/generation-diagnostics';

function shortSha(value: string): string {
  return /^[0-9a-f]{40}$/u.test(value) ? value.slice(0, 9) : value;
}

function healthLabel(value: 'healthy' | 'unhealthy' | 'unknown'): string {
  return value === 'healthy' ? 'Healthy' : value === 'unhealthy' ? 'Unavailable' : 'Unknown';
}

export const InternalGenerationPanel: React.FC = () => {
  const generation = useMemo(() => buildGenerationManifest(), []);
  const blockers = useMemo(() => generationIsolationBlockers(generation), [generation]);
  const [diagnostics, setDiagnostics] = useState<LightBIGenerationDiagnostics | null>(null);

  useEffect(() => {
    if (generation.channel !== 'internal' || blockers.length > 0) return;
    let active = true;
    void probeGenerationDiagnostics(generation).then(result => {
      if (active) setDiagnostics(result);
    });
    return () => { active = false; };
  }, [generation, blockers.length]);

  if (generation.channel !== 'internal') return null;
  const safe = blockers.length === 0;
  return (
    <div data-testid="internal-generation-panel" className={`mb-5 rounded-xl border p-4 ${safe ? 'border-violet-200 bg-violet-50/70' : 'border-red-200 bg-red-50/80'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">LightBI NEXT · Internal</div>
          <div className="mt-1 font-semibold text-slate-900">{generation.generation_id}</div>
          <div className="mt-1 text-xs text-slate-500">Parent: {generation.parent_generation_id ?? 'missing'}</div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${safe ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
          {safe ? 'Isolation OK' : 'BLOCKED'}
        </span>
      </div>
      {!safe && <div className="mt-3 rounded-lg bg-white/80 p-3 text-xs text-red-700">{blockers.join(' · ')}</div>}
      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <div><span className="text-slate-400">Core</span><div className="font-mono font-semibold text-slate-800">{shortSha(generation.core_commit)}</div></div>
        <div><span className="text-slate-400">Control plane</span><div className="font-mono font-semibold text-slate-800">{shortSha(generation.control_plane_commit)}</div></div>
        <div><span className="text-slate-400">Schema target</span><div className="font-semibold text-slate-800">{generation.control_plane_schema_version}</div></div>
        <div><span className="text-slate-400">Test pack</span><div className="font-semibold text-slate-800">{generation.test_pack_version}</div></div>
        <div><span className="text-slate-400">Core API</span><div className="font-semibold text-slate-800">{healthLabel(diagnostics?.coreApi ?? 'unknown')}</div></div>
        <div><span className="text-slate-400">Control plane</span><div className="font-semibold text-slate-800">{healthLabel(diagnostics?.controlPlane ?? 'unknown')}</div></div>
        <div><span className="text-slate-400">DB schema runtime</span><div className="font-semibold text-slate-800">{diagnostics?.schema ?? 'unknown'}</div></div>
        <div><span className="text-slate-400">Worker runtime</span><div className="font-semibold text-slate-800">{diagnostics?.worker ?? 'unknown'}</div></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span>Update: {generation.release_update_channel}</span>
        <span>Trust: {generation.trust_status}</span>
        <span>Analytics: {generation.analytics_namespace}</span>
        <span>Release namespace: {generation.release_namespace}</span>
      </div>
    </div>
  );
};
