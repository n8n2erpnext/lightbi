export type LightBIReleaseChannel = 'beta' | 'stable';
export type LightBIReleasePlatform = 'windows' | 'linux' | 'macos';

export type LightBIReleaseArtifact = {
  platform: LightBIReleasePlatform;
  architecture: string;
  kind: 'exe' | 'msi' | 'deb' | 'appimage' | 'dmg' | 'pkg';
  filename: string;
  url: string;
  size: number | null;
  sha256: string;
  signature?: { algorithm: string; value?: string; url?: string } | null;
};

export type LightBIReleaseManifest = {
  schema_version: 'lightbi.release.v1';
  product: 'digital.thaiduy.lightbi';
  version: string;
  channel: LightBIReleaseChannel;
  published_at: string;
  release_notes: string;
  minimum_updater_version?: string | null;
  artifacts: LightBIReleaseArtifact[];
};

export type LightBIReleaseIndex = {
  schema_version: 'lightbi.release-index.v1';
  product: 'digital.thaiduy.lightbi';
  updated_at: string;
  releases: LightBIReleaseManifest[];
};
