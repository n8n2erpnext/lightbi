#!/usr/bin/env bash
set -Eeuo pipefail
ENV_FILE=${1:-/home/ubuntu/.config/lightbi-backup-r2.env}
# shellcheck disable=SC1090
source "$ENV_FILE"
restic forget --keep-daily 7 --keep-weekly 6 --keep-monthly 12 --prune
restic check --read-data-subset=1/50
