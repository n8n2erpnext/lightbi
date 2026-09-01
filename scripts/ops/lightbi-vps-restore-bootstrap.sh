#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
BUNDLE_DIR=${1:-}
CHASSIS=${2:-next}
REPO_ROOT=${3:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}
[[ -d "$BUNDLE_DIR/config" ]] || { echo "usage: $0 <unsealed-bootstrap-dir> [next|production-beta] [core-repo]" >&2; exit 2; }
for cmd in docker restic node git jq curl openssl; do command -v "$cmd" >/dev/null || { echo "missing prerequisite: $cmd" >&2; exit 3; }; done
node_major=$(node -p 'Number(process.versions.node.split(".")[0])')
(( node_major >= 22 )) || { echo 'Node.js 22+ is required by the control plane runtime' >&2; exit 4; }
mkdir -p /home/ubuntu/.config /home/ubuntu/.config/systemd/user /home/ubuntu/services/lightbi-ops/bin
for f in "$BUNDLE_DIR"/config/*; do [[ -f "$f" ]] || continue; install -m 600 "$f" "/home/ubuntu/.config/$(basename "$f")"; done
for f in "$BUNDLE_DIR"/systemd/*; do [[ -f "$f" ]] || continue; install -m 644 "$f" "/home/ubuntu/.config/systemd/user/$(basename "$f")"; done
for f in "$REPO_ROOT"/scripts/ops/*.sh; do install -m 755 "$f" "/home/ubuntu/services/lightbi-ops/bin/$(basename "$f")"; done
case "$CHASSIS" in
  next) CONFIG=/home/ubuntu/.config/lightbi-chassis-next.conf ;;
  production-beta) CONFIG=/home/ubuntu/.config/lightbi-chassis-production-beta.conf ;;
  *) echo "unknown chassis: $CHASSIS" >&2; exit 2 ;;
esac
[[ -f "$CONFIG" ]] || { echo "missing restored chassis config: $CONFIG" >&2; exit 5; }
export LIGHTBI_RESTORE_CONFIRM="$CHASSIS"
/home/ubuntu/services/lightbi-ops/bin/lightbi-chassis-restore.sh "$CONFIG" latest --apply
export XDG_RUNTIME_DIR=/run/user/$(id -u)
export DBUS_SESSION_BUS_ADDRESS=unix:path=$XDG_RUNTIME_DIR/bus
systemctl --user daemon-reload
systemctl --user enable --now lightbi-next-backup.timer lightbi-production-beta-backup.timer lightbi-edge-backup.timer lightbi-backup-retention.timer 2>/dev/null || true
echo "fresh_vps_restore_bootstrap_complete=true chassis=$CHASSIS"
