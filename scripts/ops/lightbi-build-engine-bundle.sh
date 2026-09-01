#!/usr/bin/env bash
set -Eeuo pipefail
umask 022
ROOT=$(git rev-parse --show-toplevel)
GENERATION=${1:-}
MANIFEST=${2:-$ROOT/releases/internal/lightbi-generation.json}
ENGINE_ROOT=${LIGHTBI_ENGINE_ROOT:-/home/ubuntu/services/lightbi-next-engines}
[[ -n "$GENERATION" && -f "$MANIFEST" ]] || { echo "usage: $0 <generation-id> [manifest]" >&2; exit 2; }
for cmd in git jq pnpm cargo sha256sum; do command -v "$cmd" >/dev/null || { echo "missing command: $cmd" >&2; exit 3; }; done
HEAD=$(git rev-parse HEAD)
[[ $(jq -r '.generation_id' "$MANIFEST") == "$GENERATION" ]] || { echo 'generation mismatch' >&2; exit 4; }
[[ $(jq -r '.core_commit' "$MANIFEST") == "$HEAD" ]] || { echo 'manifest/core SHA mismatch' >&2; exit 5; }
TARGET="$ENGINE_ROOT/$GENERATION"
[[ ! -e "$TARGET" ]] || { echo "immutable engine already exists: $TARGET" >&2; exit 6; }
STAGE="$ENGINE_ROOT/.stage-${GENERATION}-$$"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/bin" "$STAGE/web" "$STAGE/gateway"
pnpm --dir "$ROOT/apps/desktop" build
cp "$MANIFEST" "$ROOT/apps/desktop/dist/lightbi-generation.json"
cargo build --manifest-path "$ROOT/Cargo.toml" -p lightbi-server --release
cp "$ROOT/target/release/lightbi-server" "$STAGE/bin/lightbi-server"
cp -a "$ROOT/apps/desktop/dist/." "$STAGE/web/"
cp "$ROOT/scripts/run-internal-gateway.mjs" "$STAGE/gateway/"
cp "$ROOT/scripts/internal-gateway-routing.mjs" "$STAGE/gateway/"
cp "$MANIFEST" "$STAGE/lightbi-generation.json"
(
  cd "$STAGE"
  sha256sum bin/lightbi-server lightbi-generation.json gateway/*.mjs > SHA256SUMS
  find web -type f -print0 | sort -z | xargs -0 sha256sum >> SHA256SUMS
)
python3 - "$STAGE/engine-provenance.json" "$GENERATION" "$HEAD" <<'PY'
import json,platform,socket,sys
from datetime import datetime,timezone
from pathlib import Path
out,generation,sha=sys.argv[1:4]
Path(out).write_text(json.dumps({
  'schema':'lightbi.engine-bundle.v1','generation_id':generation,'core_commit':sha,
  'built_at':datetime.now(timezone.utc).isoformat(),'builder_host':socket.gethostname(),
  'builder_arch':platform.machine(),'runtime':'release'
},indent=2,sort_keys=True)+'\n')
PY
chmod 0755 "$STAGE/bin/lightbi-server"
mv "$STAGE" "$TARGET"
trap - EXIT
echo "engine_bundle=$TARGET"
