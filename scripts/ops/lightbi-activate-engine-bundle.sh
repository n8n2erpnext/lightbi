#!/usr/bin/env bash
set -Eeuo pipefail
ENGINE_ROOT=${LIGHTBI_ENGINE_ROOT:-/home/ubuntu/services/lightbi-next-engines}
GENERATION=${1:-}
[[ -n "$GENERATION" ]] || { echo "usage: $0 <generation-id>" >&2; exit 2; }
TARGET="$ENGINE_ROOT/$GENERATION"
[[ -d "$TARGET" ]] || { echo "engine not found: $TARGET" >&2; exit 3; }
[[ $(jq -r '.generation_id' "$TARGET/lightbi-generation.json") == "$GENERATION" ]] || { echo 'manifest generation mismatch' >&2; exit 4; }
( cd "$TARGET" && sha256sum -c SHA256SUMS >/dev/null )
ln -sfn "$GENERATION" "$ENGINE_ROOT/.current-next"
mv -Tf "$ENGINE_ROOT/.current-next" "$ENGINE_ROOT/current"
echo "engine_current=$(readlink -f "$ENGINE_ROOT/current")"
