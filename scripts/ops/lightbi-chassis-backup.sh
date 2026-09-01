#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
CONFIG=${1:-}
[[ -n "$CONFIG" && -f "$CONFIG" ]] || { echo "usage: $0 <chassis-config>" >&2; exit 2; }
# shellcheck disable=SC1090
source "$CONFIG"
: "${LIGHTBI_CHASSIS_NAME:?}"
: "${LIGHTBI_RESTIC_ENV_FILE:?}"
: "${LIGHTBI_SNAPSHOT_STAGING_DIR:?}"
: "${LIGHTBI_POSTGRES_CONTAINER:?}"
: "${LIGHTBI_POSTGRES_USER:?}"
: "${LIGHTBI_POSTGRES_DB:?}"
: "${LIGHTBI_SQLITE_DB:?}"
: "${LIGHTBI_CORE_DATA_DIR:=}"
: "${LIGHTBI_REDIS_POLICY:=fresh_start}"
# shellcheck disable=SC1090
source "$LIGHTBI_RESTIC_ENV_FILE"
for cmd in restic docker python3 sha256sum; do command -v "$cmd" >/dev/null || { echo "missing command: $cmd" >&2; exit 3; }; done
docker inspect "$LIGHTBI_POSTGRES_CONTAINER" >/dev/null
STAGE="$LIGHTBI_SNAPSHOT_STAGING_DIR"
rm -rf "$STAGE"
mkdir -p "$STAGE/sqlite" "$STAGE/core-data"
cleanup(){ rm -rf "$STAGE"; }
trap cleanup EXIT
UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "[backup] chassis=$LIGHTBI_CHASSIS_NAME utc=$UTC"
docker exec "$LIGHTBI_POSTGRES_CONTAINER" pg_dump \
  -U "$LIGHTBI_POSTGRES_USER" -d "$LIGHTBI_POSTGRES_DB" \
  --format=custom --no-owner --no-privileges > "$STAGE/postgres.dump"
python3 - "$LIGHTBI_SQLITE_DB" "$STAGE/sqlite/distribution.sqlite" <<'PY'
import sqlite3,sys
src,dst=sys.argv[1:3]
with sqlite3.connect(src) as source, sqlite3.connect(dst) as target:
    source.backup(target)
PY
if [[ -n "$LIGHTBI_CORE_DATA_DIR" && -f "$LIGHTBI_CORE_DATA_DIR/metadata.db" ]]; then
python3 - "$LIGHTBI_CORE_DATA_DIR/metadata.db" "$STAGE/core-data/metadata.db" <<'PYCORE'
import sqlite3,sys
src,dst=sys.argv[1:3]
with sqlite3.connect(src) as source, sqlite3.connect(dst) as target:
    source.backup(target)
PYCORE
fi
python3 - "$STAGE/backup-metadata.json" "$LIGHTBI_CHASSIS_NAME" "$UTC" "$LIGHTBI_REDIS_POLICY" "${LIGHTBI_GENERATION_MANIFEST:-}" <<'PY'
import hashlib,json,platform,socket,sys
from pathlib import Path
out,chassis,created,redis_policy,manifest_path=sys.argv[1:6]
manifest=Path(manifest_path) if manifest_path else Path('/nonexistent')
meta={
 'schema':'lightbi.chassis-backup.v1','chassis':chassis,
 'created_at':created,'hostname':socket.gethostname(),'machine':platform.machine(),
 'redis_restore_policy':redis_policy,'generation_manifest':None,
}
if manifest.is_file():
 data=manifest.read_bytes(); meta['generation_manifest']={'sha256':hashlib.sha256(data).hexdigest(),'json':json.loads(data)}
Path(out).write_text(json.dumps(meta,indent=2,sort_keys=True)+'\n')
PY
( cd "$STAGE" && { sha256sum postgres.dump sqlite/distribution.sqlite; [[ ! -f core-data/metadata.db ]] || sha256sum core-data/metadata.db; } > SHA256SUMS )
PATHS=("$STAGE")
for path in "${LIGHTBI_BACKUP_PATHS[@]:-}"; do [[ -e "$path" ]] && PATHS+=("$path"); done
restic backup "${PATHS[@]}" --tag lightbi --tag "chassis:$LIGHTBI_CHASSIS_NAME" --tag 'schema:lightbi.chassis-backup.v1'
restic check --read-data-subset=1/100 >/dev/null
echo "[backup] completed chassis=$LIGHTBI_CHASSIS_NAME"
