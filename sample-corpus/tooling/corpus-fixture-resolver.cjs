const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const MANIFESTS = {
  "1.2.0": "sample-corpus/manifest.json",
  "1.3.0": "sample-corpus/versions/1.3.0/corpus-manifest.json",
  "1.4.0": "sample-corpus/versions/1.4.0/manifest.json",
};

function repositoryPath(relativePath) {
  if (path.isAbsolute(relativePath)) throw new Error(`CORPUS_ABSOLUTE_PATH_FORBIDDEN:${relativePath}`);
  const resolved = path.resolve(ROOT, relativePath);
  if (resolved !== ROOT && !resolved.startsWith(`${ROOT}${path.sep}`)) throw new Error(`CORPUS_PATH_ESCAPE_FORBIDDEN:${relativePath}`);
  return resolved;
}

function loadManifest(version = "1.4.0") {
  const relative = MANIFESTS[version];
  if (!relative) throw new Error(`CORPUS_VERSION_UNSUPPORTED:${version}`);
  const file = repositoryPath(relative);
  if (!fs.existsSync(file)) throw new Error(`CORPUS_MANIFEST_MISSING:${relative}`);
  return { path: relative, document: JSON.parse(fs.readFileSync(file, "utf8")) };
}

function resolveFixture(version, relativePath) {
  if (version === "1.4.0" && relativePath.startsWith("sample data/")) throw new Error(`CORPUS_140_SAMPLE_DATA_FALLBACK_FORBIDDEN:${relativePath}`);
  const file = repositoryPath(relativePath);
  if (!fs.existsSync(file)) throw new Error(`CORPUS_REQUIRED_FIXTURE_MISSING:${version}:${relativePath}`);
  if (version === "1.4.0") {
    const allowed = relativePath.startsWith("sample-corpus/versions/1.4.0/") || relativePath.startsWith("sample-corpus/anchors/1.3.0/");
    if (!allowed) throw new Error(`CORPUS_140_UNTRACKED_ROOT_FORBIDDEN:${relativePath}`);
  }
  return file;
}

function loadGroundTruth(version = "1.4.0") {
  const { document: manifest } = loadManifest(version);
  if (version === "1.3.0") return { manifest, samples: manifest.derivedCases ?? [] };
  const samples = manifest.groundTruthFiles.flatMap((entry) => {
    const file = repositoryPath(entry.path);
    if (!fs.existsSync(file)) throw new Error(`CORPUS_GROUND_TRUTH_MISSING:${version}:${entry.path}`);
    return JSON.parse(fs.readFileSync(file, "utf8")).samples;
  });
  return { manifest, samples };
}

module.exports = { ROOT, loadGroundTruth, loadManifest, repositoryPath, resolveFixture };
