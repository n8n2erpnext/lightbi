#!/usr/bin/env bash
set -Eeuo pipefail
CONFIG=${1:-}
[[ -n "$CONFIG" && -f "$CONFIG" ]] || { echo "usage: $0 <chassis-config>" >&2; exit 2; }
# shellcheck disable=SC1090
source "$CONFIG"
# shellcheck disable=SC1090
source "$LIGHTBI_RESTIC_ENV_FILE"
fail=0
check(){ if "$@" >/dev/null 2>&1; then echo "PASS $*"; else echo "FAIL $*"; fail=1; fi; }
check docker inspect "$LIGHTBI_POSTGRES_CONTAINER"
check restic cat config
[[ -f "$LIGHTBI_SQLITE_DB" ]] && echo "PASS sqlite $LIGHTBI_SQLITE_DB" || { echo "FAIL sqlite $LIGHTBI_SQLITE_DB"; fail=1; }
if [[ -n "${LIGHTBI_GENERATION_MANIFEST:-}" ]]; then
  python3 -m json.tool "$LIGHTBI_GENERATION_MANIFEST" >/dev/null && echo "PASS generation manifest" || { echo "FAIL generation manifest"; fail=1; }
fi
if [[ -n "${LIGHTBI_INFRA_COMPOSE:-}" && -n "${LIGHTBI_INFRA_ENV:-}" ]]; then
  docker compose --env-file "$LIGHTBI_INFRA_ENV" -f "$LIGHTBI_INFRA_COMPOSE" config -q && echo "PASS infra compose" || { echo "FAIL infra compose"; fail=1; }
fi
df -h / | tail -1
exit "$fail"
