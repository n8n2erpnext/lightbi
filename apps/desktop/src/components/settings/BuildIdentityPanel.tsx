import React, { useEffect, useMemo, useState } from 'react';
import { buildGenerationManifest } from '../../lib/generation-manifest';
import { readNativeOsPublisherEvidence } from '../../lib/native-runtime';

function shortSha(value: string): string {
  return /^[0-9a-f]{40}$/u.test(value) ? value.slice(0, 9) : value;
}

export type OfficialVerificationState =
  | 'official_verified'
  | 'official_release_installation_unverified'
  | 'modified_or_unrecognized'
  | 'verification_unavailable'
  | 'internal_test';

export type BuildIdentityEvidence = {
  relVerified: boolean | null;
  artifactDigestVerified: boolean | null;
  artifactSha256?: string | null;
  installationStatus: 'valid' | 'absent' | 'invalid' | 'unavailable';
  installationCertificateId?: string | null;
  osPublisherStatus: 'verified' | 'not_verified' | 'not_applicable' | 'unavailable';
  osPublisherThumbprint?: string | null;
  osPublisherReason?: string | null;
};

const EMPTY_EVIDENCE: BuildIdentityEvidence = {
  relVerified: null,
  artifactDigestVerified: null,
  installationStatus: 'unavailable',
  osPublisherStatus: 'unavailable',
};
export function deriveOfficialVerificationState(
  channel: 'internal' | 'production',
  evidence: BuildIdentityEvidence,
): OfficialVerificationState {
  if (channel === 'internal') return 'internal_test';
  if (evidence.relVerified === false || evidence.artifactDigestVerified === false || evidence.installationStatus === 'invalid') {
    return 'modified_or_unrecognized';
  }
  if (evidence.relVerified === true && evidence.artifactDigestVerified === true) {
    if (evidence.installationStatus !== 'valid') return 'official_release_installation_unverified';
    if (evidence.osPublisherStatus === 'verified' || evidence.osPublisherStatus === 'not_applicable') {
      return 'official_verified';
    }
  }
  return 'verification_unavailable';
}

export type BuildIdentityPresentation = {
  state: OfficialVerificationState;
  title: string;
  badge: string;
  detail: string;
  verified: boolean;
};

export function describeBuildIdentity(
  generation = buildGenerationManifest(),
  evidence: BuildIdentityEvidence = EMPTY_EVIDENCE,
): BuildIdentityPresentation {
  const state = deriveOfficialVerificationState(generation.channel, evidence);
  if (state === 'internal_test') {
    return {
      state,
      title: 'Internal test build',
      badge: 'NEXT / TEST authority',
      detail: 'This successor is isolated for owner testing. Its UI, logo and NEXT trust evidence do not establish an official public release.',
      verified: false,
    };
  }
  if (state === 'official_verified') {
    return {
      state,
      title: 'Official LightBI — verified',
      badge: 'Official verified',
      detail: 'REL, artifact digest, installation certificate and the applicable OS publisher identity all passed independent verification.',
      verified: true,
    };
  }
  if (state === 'official_release_installation_unverified') {
    return {
      state,
      title: 'Official release; installation not verified',
      badge: 'Installation unverified',
      detail: 'The release identity and artifact digest are verified, but this installation does not yet have valid ATT evidence.',
      verified: false,
    };
  }
  if (state === 'modified_or_unrecognized') {
    return {
      state,
      title: 'Modified or unrecognized build',
      badge: 'No official-service authority',
      detail: 'Release, digest or installation evidence failed validation. Branding and client text cannot override that result.',
      verified: false,
    };
  }
  return {
    state,
    title: 'Publisher identity not cryptographically verified',
    badge: 'Verification unavailable',
    detail: generation.trust_status === 'phase2a_unfrozen'
      ? 'Release and installation trust are not active in this build. Do not rely on branding or an in-app badge as proof of origin.'
      : 'Trust contracts may be enabled, but this UI has not received the complete REL/ATT and OS publisher evidence required for official_verified.',
    verified: false,
  };
}

function evidenceLabel(value: boolean | null, positive: string, negative: string): string {
  return value === true ? positive : value === false ? negative : 'Not evaluated';
}

export function independentVerificationSurfaceUrl(
  channel: 'internal' | 'production',
  distributionOrigin: string,
  explicitUrl?: string | null,
): string | null {
  const configured = explicitUrl?.trim();
  if (configured) {
    try {
      const target = new URL(configured);
      return target.protocol === 'https:' || (channel === 'internal' && target.protocol === 'http:') ? target.toString() : null;
    } catch {
      return null;
    }
  }
  if (channel !== 'internal') return null;
  try {
    const target = new URL(distributionOrigin);
    if (target.protocol !== 'https:' && target.protocol !== 'http:') return null;
    return new URL('/verify', `${target.origin}/`).toString();
  } catch {
    return null;
  }
}

export const BuildIdentityPanel: React.FC = () => {
  const generation = useMemo(() => buildGenerationManifest(), []);
  const [evidence, setEvidence] = useState<BuildIdentityEvidence>(EMPTY_EVIDENCE);
  useEffect(() => {
    let active = true;
    void readNativeOsPublisherEvidence().then((publisher) => {
      if (!active) return;
      setEvidence((current) => ({
        ...current,
        osPublisherStatus: publisher.status,
        osPublisherThumbprint: publisher.signerThumbprint,
        osPublisherReason: publisher.reason,
      }));
    });
    return () => { active = false; };
  }, []);
  const identity = useMemo(() => describeBuildIdentity(generation, evidence), [generation, evidence]);
  const verifierUrl = independentVerificationSurfaceUrl(
    generation.channel,
    generation.distribution_origin,
    (import.meta.env as Record<string, string | undefined>).VITE_LIGHTBI_VERIFICATION_URL,
  );

  return (
    <div data-testid="build-identity-panel" data-verification-state={identity.state} className="mb-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Build identity</div>
          <div className="mt-1 font-semibold text-slate-900">{identity.title}</div>
          <div className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">{identity.detail}</div>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">{identity.badge}</span>
      </div>
      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-5">
        <div><span className="text-slate-400">Release identity</span><div className="font-semibold text-slate-800">{generation.app_version} · {generation.channel}</div></div>
        <div><span className="text-slate-400">Artifact digest</span><div className="font-semibold text-slate-800">{evidence.artifactSha256 ? shortSha(evidence.artifactSha256) : evidenceLabel(evidence.artifactDigestVerified, 'Matched', 'Mismatch')}</div></div>
        <div><span className="text-slate-400">REL verification</span><div className="font-semibold text-slate-800">{evidenceLabel(evidence.relVerified, 'Verified', 'Invalid')}</div></div>
        <div><span className="text-slate-400">Installation certificate</span><div className="font-semibold text-slate-800">{evidence.installationCertificateId ?? evidence.installationStatus}</div></div>
        <div><span className="text-slate-400">OS publisher</span><div className="font-semibold text-slate-800">{evidence.osPublisherStatus.replaceAll('_', ' ')}{evidence.osPublisherThumbprint ? ` · ${evidence.osPublisherThumbprint.slice(0, 12)}…` : ''}</div></div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span>Core source <span className="font-mono font-semibold text-slate-700">{shortSha(generation.core_commit)}</span></span>
        <span>Trust state <span className="font-semibold text-slate-700">{generation.trust_status}</span></span>
        {verifierUrl ? (
          <a className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2" href={verifierUrl} target="_blank" rel="noreferrer">Independent verification surface</a>
        ) : (
          <span>Independent verification surface <span className="font-semibold text-slate-700">not configured</span></span>
        )}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">Official origin is a derived evidence state. Editable client text, logos, HTTPS and SHA-256 staging alone are not official LightBI authority.</p>
    </div>
  );
};
