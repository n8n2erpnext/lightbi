#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
CONFIG=${1:-}
SNAPSHOT=${2:-latest}
[[ -n "$CONFIG" && -f "$CONFIG" ]] || { echo "usage: $0 <chassis-config> [snapshot|latest]" >&2; exit 2; }
# shellcheck disable=SC1090
source "$CONFIG"
# shellcheck disable=SC1090
source "$LIGHTBI_RESTIC_ENV_FILE"
: "${LIGHTBI_CHASSIS_NAME:?}"; : "${LIGHTBI_SNAPSHOT_STAGING_DIR:?}"
for cmd in restic docker python3 sha256sum; do command -v "$cmd" >/dev/null || { echo "missing command: $cmd" >&2; exit 3; }; done
TMP=$(mktemp -d "${TMPDIR:-/tmp}/lightbi-drill-${LIGHTBI_CHASSIS_NAME}.XXXXXX")
CONTAINER="lightbi-drill-${LIGHTBI_CHASSIS_NAME}-$$"
cleanup(){ docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
restic restore "$SNAPSHOT" --tag "chassis:$LIGHTBI_CHASSIS_NAME" --include "$LIGHTBI_SNAPSHOT_STAGING_DIR/**" --target "$TMP" >/dev/null
STAGE="$TMP$LIGHTBI_SNAPSHOT_STAGING_DIR"
[[ -f "$STAGE/postgres.dump" && -f "$STAGE/sqlite/distribution.sqlite" ]] || { echo 'drill payload incomplete' >&2; exit 4; }
( cd "$STAGE" && sha256sum -c SHA256SUMS >/dev/null )
python3 - "$STAGE/sqlite/distribution.sqlite" <<'PY'
import sqlite3,sys
with sqlite3.connect(sys.argv[1]) as db:
    result=db.execute('pragma integrity_check').fetchone()[0]
assert result == 'ok', result
print('sqlite_integrity=ok')
PY
if [[ -f "$STAGE/core-data/metadata.db" ]]; then
python3 - "$STAGE/core-data/metadata.db" <<'PYCORE'
import sqlite3,sys
with sqlite3.connect(sys.argv[1]) as db:
    result=db.execute('pragma integrity_check').fetchone()[0]
assert result == 'ok', result
print('core_metadata_integrity=ok')
PYCORE
fi
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=drill-only -e POSTGRES_DB=lightbi_drill postgres:16-alpine >/dev/null
stable=0
for _ in $(seq 1 60); do
  if docker exec "$CONTAINER" psql -U postgres -d lightbi_drill -Atc 'select 1' 2>/dev/null | grep -qx 1; then
    stable=$((stable+1))
    [[ "$stable" -ge 2 ]] && break
  else
    stable=0
  fi
  sleep 1
done
[[ "$stable" -ge 2 ]] || { echo 'ephemeral_postgres_not_stable' >&2; docker logs "$CONTAINER" | tail -60 >&2; exit 5; }
docker exec -i "$CONTAINER" pg_restore -U postgres -d lightbi_drill --no-owner --no-privileges < "$STAGE/postgres.dump"
TABLES=$(docker exec "$CONTAINER" psql -U postgres -d lightbi_drill -Atc "select count(*) from pg_tables where schemaname='public';")
[[ "$TABLES" =~ ^[0-9]+$ && "$TABLES" -gt 0 ]] || { echo 'restored database has no public tables' >&2; exit 6; }
MIGRATIONS=$(docker exec "$CONTAINER" psql -U postgres -d lightbi_drill -Atc "select count(*) from lightbi_schema_migrations;" 2>/dev/null || true)
echo "restore_drill=PASS chassis=$LIGHTBI_CHASSIS_NAME public_tables=$TABLES migrations=${MIGRATIONS:-n/a}"
