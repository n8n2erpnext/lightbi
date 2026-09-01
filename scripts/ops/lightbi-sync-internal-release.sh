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
    rm -f "$out"
    echo 'internal_release_available=false'
    echo 'reason=no_latest_release_yet'
    return 10
  fi
  [[ "$code" =~ ^2 ]] || { echo "R2 GET failed key=$key http=$code" >&2; return 11; }
}
if get_latest "$PREFIX/latest.json" "$TMP/latest.json"; then
  :
else
  rc=$?
  [[ "$rc" -eq 10 ]] && exit 0
  exit "$rc"
fi
get "$PREFIX/index.json" "$TMP/index.json"
jq -e '.schema_version=="lightbi.release.v1" and .product=="digital.thaiduy.lightbi" and .channel=="beta"' "$TMP/latest.json" >/dev/null
VERSION=$(jq -r '.version' "$TMP/latest.json")
[[ "$VERSION" =~ ^[0-9A-Za-z.-]+$ ]] || { echo 'unsafe release version' >&2; exit 4; }
ARTIFACT=$(jq -c '.artifacts[] | select(.platform=="windows" and .architecture=="x86_64")' "$TMP/latest.json" | head -1)
[[ -n "$ARTIFACT" ]] || { echo 'windows x86_64 artifact missing' >&2; exit 5; }
FILENAME=$(jq -r '.filename' <<<"$ARTIFACT")
EXPECTED=$(jq -r '.sha256' <<<"$ARTIFACT")
[[ "$FILENAME" == "$(basename "$FILENAME")" && "$FILENAME" == *.exe && "$EXPECTED" =~ ^[a-f0-9]{64}$ ]] || { echo 'unsafe artifact identity' >&2; exit 6; }
mkdir -p "$TMP/version"
get "$PREFIX/$VERSION/$FILENAME" "$TMP/version/$FILENAME"
get "$PREFIX/$VERSION/$FILENAME.sha256" "$TMP/version/$FILENAME.sha256"
get "$PREFIX/$VERSION/manifest.json" "$TMP/version/manifest.json"
ACTUAL=$(sha256sum "$TMP/version/$FILENAME" | awk '{print $1}')
[[ "$ACTUAL" == "$EXPECTED" ]] || { echo 'artifact SHA mismatch' >&2; exit 7; }
grep -Fq "$EXPECTED" "$TMP/version/$FILENAME.sha256" || { echo 'checksum sidecar mismatch' >&2; exit 8; }
mkdir -p "$DEST"
TARGET="$DEST/$VERSION"
if [[ -d "$TARGET" ]]; then
  EXISTING=$(sha256sum "$TARGET/$FILENAME" 2>/dev/null | awk '{print $1}' || true)
  [[ "$EXISTING" == "$EXPECTED" ]] || { echo 'immutable local release collision' >&2; exit 9; }
else
  mv "$TMP/version" "$TARGET"
fi
cp "$TMP/index.json" "$DEST/.index.next"
cp "$TMP/latest.json" "$DEST/.latest.next"
mv -f "$DEST/.index.next" "$DEST/index.json"
mv -f "$DEST/.latest.next" "$DEST/latest.json"
echo "internal_release_synced=true"
echo "version=$VERSION"
echo "artifact_sha256=$EXPECTED"
