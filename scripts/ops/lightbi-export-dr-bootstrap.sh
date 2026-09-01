#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
ENV_FILE=${1:-/home/ubuntu/.config/lightbi-backup-r2.env}
AUTHORIZED_KEYS=${2:-/home/ubuntu/.ssh/authorized_keys}
MIRROR_DIR=${3:-}
[[ -f "$ENV_FILE" && -f "$AUTHORIZED_KEYS" ]] || { echo "usage: $0 [restic-env] [authorized_keys]" >&2; exit 2; }
# shellcheck disable=SC1090
source "$ENV_FILE"
: "${AWS_ACCESS_KEY_ID:?}"; : "${AWS_SECRET_ACCESS_KEY:?}"; : "${R2_ACCOUNT_ID:?}"; : "${R2_BUCKET:?}"; : "${R2_PUBLIC_URL:?}"
R2_BUCKET_ROOT=${LIGHTBI_R2_BUCKET_ROOT:-${R2_BUCKET%%/*}}
R2_BASE_PREFIX=${R2_BUCKET#*/}
[[ "$R2_BASE_PREFIX" == "$R2_BUCKET" ]] && R2_BASE_PREFIX=""
for cmd in openssl ssh-keygen tar sha256sum curl python3; do command -v "$cmd" >/dev/null || { echo "missing command: $cmd" >&2; exit 3; }; done
TMP=$(mktemp -d "${TMPDIR:-/tmp}/lightbi-dr-bootstrap.XXXXXX")
trap 'rm -rf "$TMP"' EXIT
PAYLOAD="$TMP/payload"; mkdir -p "$PAYLOAD/config" "$PAYLOAD/systemd"
for f in \
  /home/ubuntu/.config/lightbi-backup-r2.env \
  /home/ubuntu/.config/lightbi-chassis-next.conf \
  /home/ubuntu/.config/lightbi-chassis-production-beta.conf \
  /home/ubuntu/.config/lightbi-edge.conf; do
  [[ -f "$f" ]] && cp -a "$f" "$PAYLOAD/config/"
done
for f in /home/ubuntu/.config/systemd/user/lightbi-*backup*.service /home/ubuntu/.config/systemd/user/lightbi-*backup*.timer; do
  [[ -f "$f" ]] && cp -a "$f" "$PAYLOAD/systemd/"
done
PUB_LINE=$(awk '!/^#/ && $1=="ssh-rsa" && NF>=2 {print $1" "$2; exit}' "$AUTHORIZED_KEYS")
[[ -n "$PUB_LINE" ]] || { echo 'no ssh-rsa recovery recipient found' >&2; exit 4; }
printf '%s\n' "$PUB_LINE" > "$TMP/recovery.pub"
ssh-keygen -e -m PKCS8 -f "$TMP/recovery.pub" > "$TMP/recovery.pem"
FINGERPRINT=$(ssh-keygen -lf "$TMP/recovery.pub" | awk '{print $2}')
UTC=$(date -u +%Y%m%dT%H%M%SZ)
PREFIX="${R2_BASE_PREFIX:+${R2_BASE_PREFIX%/}/}lightbi-dr/bootstrap/v1/$UTC"
ARCHIVE="$TMP/lightbi-dr-bootstrap.tar.gz"
CIPHER="$TMP/lightbi-dr-bootstrap.tar.gz.enc"
WRAPPED="$TMP/lightbi-dr-bootstrap.key.enc"
PASSFILE="$TMP/aes-passphrase"
tar -C "$PAYLOAD" -czf "$ARCHIVE" .
openssl rand -base64 48 > "$PASSFILE"
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 250000 -pass file:"$PASSFILE" -in "$ARCHIVE" -out "$CIPHER"
openssl pkeyutl -encrypt -pubin -inkey "$TMP/recovery.pem" -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -in "$PASSFILE" -out "$WRAPPED"
CIPHER_SHA=$(sha256sum "$CIPHER" | awk '{print $1}')
KEY_SHA=$(sha256sum "$WRAPPED" | awk '{print $1}')
python3 - "$TMP/metadata.json" "$UTC" "$FINGERPRINT" "$PREFIX" "$CIPHER_SHA" "$KEY_SHA" "${R2_PUBLIC_URL%/}" <<'PY'
import json,sys
from pathlib import Path
out,utc,fp,prefix,csha,ksha,public=sys.argv[1:]
meta={
 'schema':'lightbi.dr-bootstrap.v1','created_at':utc,'recipient_ssh_fingerprint':fp,
 'cipher':'aes-256-cbc+pbkdf2-250000','key_wrap':'rsa-oaep-sha256',
 'bundle':{'key':f'{prefix}/lightbi-dr-bootstrap.tar.gz.enc','sha256':csha},
 'wrapped_key':{'key':f'{prefix}/lightbi-dr-bootstrap.key.enc','sha256':ksha},
 'configured_public_base_hint':public,'public_exposed':False,
}
Path(out).write_text(json.dumps(meta,indent=2,sort_keys=True)+'\n')
PY
ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
put(){ local file=$1 key=$2 type=$3 cache=$4; local code; code=$(curl -sS -o /dev/null -w '%{http_code}' --aws-sigv4 'aws:amz:auto:s3' --user "${AWS_ACCESS_KEY_ID}:${AWS_SECRET_ACCESS_KEY}" -X PUT --data-binary @"$file" -H "content-type: $type" -H "cache-control: $cache" "$ENDPOINT/$R2_BUCKET_ROOT/$key"); [[ "$code" =~ ^2 ]] || { echo "R2 PUT failed key=$key http=$code" >&2; exit 5; }; }
put "$CIPHER" "$PREFIX/lightbi-dr-bootstrap.tar.gz.enc" application/octet-stream 'private,max-age=31536000,immutable'
put "$WRAPPED" "$PREFIX/lightbi-dr-bootstrap.key.enc" application/octet-stream 'private,max-age=31536000,immutable'
put "$TMP/metadata.json" "$PREFIX/metadata.json" application/json 'private,max-age=31536000,immutable'
LATEST_KEY="${R2_BASE_PREFIX:+${R2_BASE_PREFIX%/}/}lightbi-dr/bootstrap/v1/latest.json"
put "$TMP/metadata.json" "$LATEST_KEY" application/json 'private,max-age=60,must-revalidate'
PUBLIC="${R2_PUBLIC_URL%/}"
if [[ -n "$MIRROR_DIR" ]]; then
  mkdir -p "$MIRROR_DIR"
  cp "$CIPHER" "$MIRROR_DIR/lightbi-dr-bootstrap.tar.gz.enc"
  cp "$WRAPPED" "$MIRROR_DIR/lightbi-dr-bootstrap.key.enc"
  cp "$TMP/metadata.json" "$MIRROR_DIR/metadata.json"
fi
if [[ "${LIGHTBI_DR_REQUIRE_PUBLIC:-0}" == 1 ]]; then
  for key in "$PREFIX/lightbi-dr-bootstrap.tar.gz.enc" "$PREFIX/lightbi-dr-bootstrap.key.enc" "$PREFIX/metadata.json" "$LATEST_KEY"; do
    curl -fsS -o /dev/null "$PUBLIC/$key" || { echo "public recovery object unavailable: $key" >&2; exit 6; }
  done
fi
echo "dr_bootstrap_uploaded=true"
echo "dr_bootstrap_prefix=$PREFIX"
echo "recipient_fingerprint=$FINGERPRINT"
if [[ "${LIGHTBI_DR_REQUIRE_PUBLIC:-0}" == 1 ]]; then echo "public_latest=$PUBLIC/lightbi-dr/bootstrap/v1/latest.json"; else echo "r2_private_latest=$LATEST_KEY"; fi
