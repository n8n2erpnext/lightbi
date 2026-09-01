#!/usr/bin/env bash
set -Eeuo pipefail
umask 022
ENV_FILE=${1:-/home/ubuntu/.config/lightbi-backup-r2.env}
DEST=${2:-/home/ubuntu/services/lightbi-next-releases}
PREFIX=${LIGHTBI_INTERNAL_RELEASE_R2_PREFIX:-lightbi-next/releases}
# shellcheck disable=SC1090
source "$ENV_FILE"
: "${AWS_ACCESS_KEY_ID:?}"; : "${AWS_SECRET_ACCESS_KEY:?}"; : "${R2_ACCOUNT_ID:?}"; : "${R2_BUCKET:?}"
BUCKET=${LIGHTBI_R2_BUCKET_ROOT:-${R2_BUCKET%%/*}}
for cmd in curl jq sha256sum; do command -v "$cmd" >/dev/null || { echo "missing command: $cmd" >&2; exit 3; }; done
ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
TMP=$(mktemp -d "${TMPDIR:-/tmp}/lightbi-next-release-sync.XXXXXX")
trap 'rm -rf "$TMP"' EXIT
get(){ local key=$1 out=$2; curl -fsS --aws-sigv4 'aws:amz:auto:s3' --user "${AWS_ACCESS_KEY_ID}:${AWS_SECRET_ACCESS_KEY}" "$ENDPOINT/$BUCKET/$key" -o "$out"; }
get_latest(){
  local key=$1 out=$2 code
  code=$(curl -sS -o "$out" -w '%{http_code}' --aws-sigv4 'aws:amz:auto:s3' --user "${AWS_ACCESS_KEY_ID}:${AWS_SECRET_ACCESS_KEY}" "$ENDPOINT/$BUCKET/$key")
  if [[ "$code" == 404 ]]; then
    rm -f "$out"; echo 'internal_release_available=false'; echo 'reason=no_latest_release_yet'; return 10
  fi
  [[ "$code" =~ ^2 ]] || { echo "R2 GET failed key=$key http=$code" >&2; return 11; }
}
valid_version(){ [[ "$1" =~ ^[0-9A-Za-z.-]+$ ]]; }
valid_artifact(){
  local filename=$1 expected=$2
  [[ "$filename" == "$(basename "$filename")" && "$filename" == *.exe && "$expected" =~ ^[a-f0-9]{64}$ ]]
}
verify_release_dir(){
  local dir=$1 version=$2 filename=$3 expected=$4 actual
  [[ -f "$dir/$filename" && -f "$dir/$filename.sha256" && -f "$dir/manifest.json" ]] || return 1
  actual=$(sha256sum "$dir/$filename" | awk '{print $1}')
  [[ "$actual" == "$expected" ]] || return 1
  grep -Fq "$expected" "$dir/$filename.sha256" || return 1
  jq -e --arg v "$version" --arg f "$filename" --arg sha "$expected" '
    .schema_version=="lightbi.release.v1" and .product=="digital.thaiduy.lightbi" and
    .version==$v and .channel=="beta" and
    any(.artifacts[]; .platform=="windows" and .architecture=="x86_64" and .filename==$f and .sha256==$sha)
  ' "$dir/manifest.json" >/dev/null
}
if get_latest "$PREFIX/latest.json" "$TMP/latest.json"; then :; else
  rc=$?; [[ "$rc" -eq 10 ]] && exit 0; exit "$rc"
fi
get "$PREFIX/index.json" "$TMP/index.json"
jq -e '.schema_version=="lightbi.release.v1" and .product=="digital.thaiduy.lightbi" and .channel=="beta"' "$TMP/latest.json" >/dev/null
jq -e '.schema_version=="lightbi.release-index.v1" and .product=="digital.thaiduy.lightbi" and (.releases|type=="array") and (.releases|length>0)' "$TMP/index.json" >/dev/null
LATEST_VERSION=$(jq -r '.version' "$TMP/latest.json")
valid_version "$LATEST_VERSION" || { echo 'unsafe latest release version' >&2; exit 4; }
INDEX_LATEST=$(jq -r '.releases[0].version // empty' "$TMP/index.json")
[[ "$INDEX_LATEST" == "$LATEST_VERSION" ]] || { echo 'latest/index release mismatch' >&2; exit 5; }
LATEST_ARTIFACT=$(jq -c 'first(.artifacts[] | select(.platform=="windows" and .architecture=="x86_64")) // empty' "$TMP/latest.json")
[[ -n "$LATEST_ARTIFACT" ]] || { echo 'latest windows x86_64 artifact missing' >&2; exit 6; }
LATEST_EXPECTED=$(jq -r '.sha256' <<<"$LATEST_ARTIFACT")
mapfile -t RELEASES < <(jq -c '.releases[]' "$TMP/index.json")
mkdir -p "$DEST"
mirrored=()
for RELEASE in "${RELEASES[@]}"; do
  jq -e '.schema_version=="lightbi.release.v1" and .product=="digital.thaiduy.lightbi" and .channel=="beta"' <<<"$RELEASE" >/dev/null
  VERSION=$(jq -r '.version' <<<"$RELEASE")
  valid_version "$VERSION" || { echo "unsafe indexed release version: $VERSION" >&2; exit 7; }
  ARTIFACT=$(jq -c 'first(.artifacts[] | select(.platform=="windows" and .architecture=="x86_64")) // empty' <<<"$RELEASE")
  [[ -n "$ARTIFACT" ]] || { echo "windows x86_64 artifact missing: $VERSION" >&2; exit 8; }
  FILENAME=$(jq -r '.filename' <<<"$ARTIFACT")
  EXPECTED=$(jq -r '.sha256' <<<"$ARTIFACT")
  valid_artifact "$FILENAME" "$EXPECTED" || { echo "unsafe artifact identity: $VERSION" >&2; exit 9; }
  [[ "$VERSION" != "$LATEST_VERSION" || "$EXPECTED" == "$LATEST_EXPECTED" ]] || { echo 'latest/index checksum mismatch' >&2; exit 10; }
  TARGET="$DEST/$VERSION"
  if [[ -d "$TARGET" ]]; then
    verify_release_dir "$TARGET" "$VERSION" "$FILENAME" "$EXPECTED" || { echo "immutable local release collision: $VERSION" >&2; exit 12; }
  else
    VDIR="$TMP/version-$VERSION"; mkdir -p "$VDIR"
    get "$PREFIX/$VERSION/$FILENAME" "$VDIR/$FILENAME"
    get "$PREFIX/$VERSION/$FILENAME.sha256" "$VDIR/$FILENAME.sha256"
    get "$PREFIX/$VERSION/manifest.json" "$VDIR/manifest.json"
    verify_release_dir "$VDIR" "$VERSION" "$FILENAME" "$EXPECTED" || { echo "release integrity failed: $VERSION" >&2; exit 13; }
    mv "$VDIR" "$TARGET"
  fi
  mirrored+=("$VERSION")
done
cp "$TMP/index.json" "$DEST/.index.next"; cp "$TMP/latest.json" "$DEST/.latest.next"
mv -f "$DEST/.index.next" "$DEST/index.json"; mv -f "$DEST/.latest.next" "$DEST/latest.json"
echo "internal_release_synced=true"
echo "version=$LATEST_VERSION"
echo "artifact_sha256=$LATEST_EXPECTED"
echo "mirrored_versions=${mirrored[*]}"
