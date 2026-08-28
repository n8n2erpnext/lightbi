const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const shaPattern = /^[a-f0-9]{64}$/;
const platforms = new Set(['windows', 'linux', 'macos']);
const channels = new Set(['beta', 'stable']);

export function compareVersions(left, right) {
  const parse = (value) => {
    const [core, prerelease = ''] = String(value).replace(/^v/, '').split('-', 2);
    return { core: core.split('.').map((part) => Number(part) || 0), prerelease };
  };
  const a = parse(left), b = parse(right);
  for (let index = 0; index < 3; index += 1) {
    if (a.core[index] !== b.core[index]) return a.core[index] > b.core[index] ? 1 : -1;
  }
  if (a.prerelease === b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  return a.prerelease.localeCompare(b.prerelease, undefined, { numeric: true });
}

export function validateReleaseManifest(input) {
  if (!input || input.schema_version !== 'lightbi.release.v1' || input.product !== 'digital.thaiduy.lightbi') throw new Error('invalid_release_identity');
  if (!versionPattern.test(input.version) || !channels.has(input.channel) || Number.isNaN(Date.parse(input.published_at))) throw new Error('invalid_release_metadata');
  if (!Array.isArray(input.artifacts) || input.artifacts.length === 0) throw new Error('release_artifact_required');
  const artifacts = input.artifacts.map((artifact) => {
    if (!platforms.has(artifact.platform) || !artifact.architecture || !artifact.filename || !artifact.url || !shaPattern.test(String(artifact.sha256 || '').toLowerCase())) throw new Error('invalid_release_artifact');
    const url = new URL(artifact.url);
    if (url.protocol !== 'https:') throw new Error('release_artifact_https_required');
    return { ...artifact, sha256: artifact.sha256.toLowerCase(), size: Number.isFinite(Number(artifact.size)) ? Number(artifact.size) : null };
  });
  return { ...input, release_notes: String(input.release_notes || ''), minimum_updater_version: input.minimum_updater_version || null, artifacts };
}

export function updateReleaseIndex(existing, manifest, limit = 12) {
  const current = existing?.schema_version === 'lightbi.release-index.v1' && Array.isArray(existing.releases) ? existing.releases : [];
  const releases = [manifest, ...current.filter((item) => item.version !== manifest.version || item.channel !== manifest.channel)]
    .map(validateReleaseManifest)
    .sort((left, right) => compareVersions(right.version, left.version))
    .slice(0, Math.max(3, Math.min(50, limit)));
  return { schema_version: 'lightbi.release-index.v1', product: 'digital.thaiduy.lightbi', updated_at: new Date().toISOString(), releases };
}

export function selectArtifact(manifest, platform, architecture = null) {
  const candidates = validateReleaseManifest(manifest).artifacts.filter((artifact) => artifact.platform === platform);
  return candidates.find((artifact) => !architecture || artifact.architecture === architecture) || candidates[0] || null;
}
