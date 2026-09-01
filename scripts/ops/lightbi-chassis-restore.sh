#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
CONFIG=${1:-}; SNAPSHOT=${2:-latest}; MODE=${3:---verify-only}
[[ -n "$CONFIG" && -f "$CONFIG" ]] || { echo "usage: $0 <chassis-config> [snapshot|latest] [--verify-only|--apply]" >&2; exit 2; }
# shellcheck disable=SC1090
source "$CONFIG"
# shellcheck disable=SC1090
source "$LIGHTBI_RESTIC_ENV_FILE"
: "${LIGHTBI_CHASSIS_NAME:?}"; : "${LIGHTBI_SNAPSHOT_STAGING_DIR:?}"
TMP=$(mktemp -d "${TMPDIR:-/tmp}/lightbi-restore-${LIGHTBI_CHASSIS_NAME}.XXXXXX")
trap 'rm -rf "$TMP"' EXIT
restic restore "$SNAPSHOT" --tag "chassis:$LIGHTBI_CHASSIS_NAME" --target "$TMP" >/dev/null
RESTORED_STAGE="$TMP$LIGHTBI_SNAPSHOT_STAGING_DIR"
[[ -f "$RESTORED_STAGE/backup-metadata.json" && -f "$RESTORED_STAGE/postgres.dump" ]] || { echo 'backup payload incomplete' >&2; exit 4; }
( cd "$RESTORED_STAGE" && sha256sum -c SHA256SUMS )
python3 - "$RESTORED_STAGE/backup-metadata.json" "$LIGHTBI_CHASSIS_NAME" <<'PY'
import json,sys
meta=json.load(open(sys.argv[1])); expected=sys.argv[2]
assert meta.get('schema')=='lightbi.chassis-backup.v1'
assert meta.get('chassis')==expected
print('backup_metadata_valid=true')
print('generation='+str((meta.get('generation_manifest') or {}).get('json',{}).get('generation_id','unknown')))
PY
[[ "$MODE" == '--verify-only' ]] && { echo 'restore_verify_only=true'; exit 0; }
[[ "$MODE" == '--apply' ]] || { echo "unknown mode: $MODE" >&2; exit 2; }
[[ "${LIGHTBI_RESTORE_CONFIRM:-}" == "$LIGHTBI_CHASSIS_NAME" ]] || { echo "set LIGHTBI_RESTORE_CONFIRM=$LIGHTBI_CHASSIS_NAME for destructive restore" >&2; exit 5; }
if docker inspect "$LIGHTBI_POSTGRES_CONTAINER" >/dev/null 2>&1 && [[ "${LIGHTBI_RESTORE_ALLOW_EXISTING:-0}" != 1 ]]; then
  echo 'existing postgres container detected; refuse restore without LIGHTBI_RESTORE_ALLOW_EXISTING=1' >&2; exit 6
fi
for path in "${LIGHTBI_BACKUP_PATHS[@]:-}"; do
  src="$TMP$path"; [[ -e "$src" ]] || continue
  mkdir -p "$(dirname "$path")"
  if [[ -d "$src" ]]; then mkdir -p "$path"; cp -a "$src"/. "$path"/; else cp -a "$src" "$path"; fi
done
mkdir -p "$(dirname "$LIGHTBI_SQLITE_DB")"
cp -a "$RESTORED_STAGE/sqlite/distribution.sqlite" "$LIGHTBI_SQLITE_DB"
if [[ -n "${LIGHTBI_CORE_DATA_DIR:-}" && -f "$RESTORED_STAGE/core-data/metadata.db" ]]; then
  mkdir -p "$LIGHTBI_CORE_DATA_DIR"
  cp -a "$RESTORED_STAGE/core-data/metadata.db" "$LIGHTBI_CORE_DATA_DIR/metadata.db"
fi
docker compose --env-file "$LIGHTBI_INFRA_ENV" -f "$LIGHTBI_INFRA_COMPOSE" up -d postgres redis
for _ in $(seq 1 30); do docker exec "$LIGHTBI_POSTGRES_CONTAINER" pg_isready -U "$LIGHTBI_POSTGRES_USER" -d "$LIGHTBI_POSTGRES_DB" >/dev/null 2>&1 && break; sleep 2; done
docker exec -i "$LIGHTBI_POSTGRES_CONTAINER" pg_restore -U "$LIGHTBI_POSTGRES_USER" -d "$LIGHTBI_POSTGRES_DB" --clean --if-exists --no-owner --no-privileges < "$RESTORED_STAGE/postgres.dump"
export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/run/user/$(id -u)}
export DBUS_SESSION_BUS_ADDRESS=${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}
systemctl --user daemon-reload
for unit in "${LIGHTBI_SERVICE_UNITS[@]:-}"; do systemctl --user enable --now "$unit"; done
echo "restore_applied=true redis_policy=${LIGHTBI_REDIS_POLICY:-fresh_start}"
