#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
CONFIG=${1:-}
[[ -n "$CONFIG" && -f "$CONFIG" ]] || { echo "usage: $0 <edge-config>" >&2; exit 2; }
# shellcheck disable=SC1090
source "$CONFIG"
# shellcheck disable=SC1090
source "$LIGHTBI_RESTIC_ENV_FILE"
: "${LIGHTBI_EDGE_NAME:?}"; : "${LIGHTBI_EDGE_STAGING_DIR:?}"; : "${LIGHTBI_EDGE_HELPER_IMAGE:?}"
STAGE="$LIGHTBI_EDGE_STAGING_DIR"; rm -rf "$STAGE"; mkdir -p "$STAGE"
paused=0
cleanup(){ if [[ $paused == 1 ]]; then docker unpause "$LIGHTBI_EDGE_PAUSE_CONTAINER" >/dev/null 2>&1 || true; fi; rm -rf "$STAGE"; }
trap cleanup EXIT
if [[ -n "${LIGHTBI_EDGE_PAUSE_CONTAINER:-}" ]]; then docker pause "$LIGHTBI_EDGE_PAUSE_CONTAINER" >/dev/null; paused=1; fi
for volume in "${LIGHTBI_EDGE_VOLUMES[@]}"; do
  safe=${volume//[^A-Za-z0-9_.-]/_}
  docker run --rm -v "$volume:/source:ro" -v "$STAGE:/backup" "$LIGHTBI_EDGE_HELPER_IMAGE" sh -lc "tar -czf '/backup/${safe}.tar.gz' -C /source ."
done
if [[ $paused == 1 ]]; then docker unpause "$LIGHTBI_EDGE_PAUSE_CONTAINER" >/dev/null; paused=0; fi
for bind in "${LIGHTBI_EDGE_BACKUP_PATHS[@]:-}"; do
  safe=$(basename "$bind" | tr -c 'A-Za-z0-9_.-' '_')
  docker run --rm -v "$bind:/source:ro" -v "$STAGE:/backup" "$LIGHTBI_EDGE_HELPER_IMAGE" sh -lc "tar --exclude='./backup' -czf '/backup/${safe}.tar.gz' -C /source ."
done
( cd "$STAGE" && sha256sum ./*.tar.gz > SHA256SUMS )
restic backup "$STAGE" --tag lightbi --tag "edge:$LIGHTBI_EDGE_NAME" --tag 'schema:lightbi.edge-backup.v1'
echo "edge_backup_completed=true edge=$LIGHTBI_EDGE_NAME"
