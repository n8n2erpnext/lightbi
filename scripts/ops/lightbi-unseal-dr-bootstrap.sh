#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
PRIVATE_KEY=${1:-}; CIPHER=${2:-}; WRAPPED=${3:-}; OUTPUT=${4:-./lightbi-dr-bootstrap}
[[ -f "$PRIVATE_KEY" && -f "$CIPHER" && -f "$WRAPPED" ]] || { echo "usage: $0 <rsa-private-key> <bundle.enc> <key.enc> [output-dir]" >&2; exit 2; }
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
KEY_COPY="$TMP/private.pem"; cp "$PRIVATE_KEY" "$KEY_COPY"
if grep -q 'BEGIN OPENSSH PRIVATE KEY' "$KEY_COPY"; then ssh-keygen -p -m PEM -f "$KEY_COPY"; fi
openssl pkeyutl -decrypt -inkey "$KEY_COPY" -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -in "$WRAPPED" -out "$TMP/aes-passphrase"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 250000 -pass file:"$TMP/aes-passphrase" -in "$CIPHER" -out "$TMP/bundle.tar.gz"
mkdir -p "$OUTPUT"; tar -C "$OUTPUT" -xzf "$TMP/bundle.tar.gz"
echo "dr_bootstrap_unsealed=$OUTPUT"
