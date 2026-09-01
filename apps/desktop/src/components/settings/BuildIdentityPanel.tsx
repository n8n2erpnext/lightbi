import React, { useMemo } from 'react';
import { buildGenerationManifest } from '../../lib/generation-manifest';

function shortSha(value: string): string {
  return /^[0-9a-f]{40}$/u.test(value) ? value.slice(0, 9) : value;
}

export type BuildIdentityPresentation = {
  title: string;
  badge: string;
  detail: string;
  verified: boolean;
};

export function describeBuildIdentity(
  generation = buildGenerationManifest(),
): BuildIdentityPresentation {
  if (generation.channel === 'internal') {
    return {
      title: 'Internal test build',
      badge: 'Not an official public release',
      detail: 'This successor is isolated for owner testing. Its client UI is not proof of official public origin.',
      verified: false,
    };
  }

  if (generation.trust_status === 'phase2a_unfrozen') {
    return {
      title: 'Publisher identity not cryptographically verified',
      badge: 'Verification unavailable',
      detail: 'Release and installation trust are not active in this build. Do not rely on branding or an in-app badge as proof of origin.',
      verified: false,
    };
  }

  return {
    title: 'Trust foundation present',
    badge: 'Release verification pending',
    detail: 'Trust contracts may be enabled, but this UI has not received independent REL/ATT verification evidence. It therefore does not claim an official verified release.',
    verified: false,
  };
}

export const BuildIdentityPanel: React.FC = () => {
  const generation = useMemo(() => buildGenerationManifest(), []);
  const identity = useMemo(() => describeBuildIdentity(generation), [generation]);

  return (
    <div data-testid="build-identity-panel" className="mb-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Build identity</div>
          <div className="mt-1 font-semibold text-slate-900">{identity.title}</div>
          <div className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">{identity.detail}</div>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">{identity.badge}</span>
      </div>
      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <div><span className="text-slate-400">Version</span><div className="font-semibold text-slate-800">{generation.app_version}</div></div>
        <div><span className="text-slate-400">Channel</span><div className="font-semibold capitalize text-slate-800">{generation.channel}</div></div>
        <div><span className="text-slate-400">Core source</span><div className="font-mono font-semibold text-slate-800">{shortSha(generation.core_commit)}</div></div>
        <div><span className="text-slate-400">Trust state</span><div className="font-semibold text-slate-800">{generation.trust_status}</div></div>
      </div>
      <p className="mt-3 text-[11px] text-slate-500">Official origin is established by independent project signing/attestation authority, not by editable client text or logos.</p>
    </div>
  );
};
