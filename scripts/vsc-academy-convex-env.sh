#!/bin/zsh
set -euo pipefail

if (( $# == 0 )); then
  echo "usage: $0 <command> [args...]" >&2
  exit 64
fi

export CONVEX_SELF_HOSTED_URL="${CONVEX_SELF_HOSTED_URL:-http://127.0.0.1:3280}"
if ! admin_key="$(
  security find-generic-password \
    -s vsc-academy-convex-local-admin-key \
    -a vsc-academy \
    -w
)"; then
  echo "failed to read vsc-academy-convex-local-admin-key from Keychain" >&2
  exit 78
fi
if [[ -z "$admin_key" ]]; then
  echo "vsc-academy-convex-local-admin-key is empty" >&2
  exit 78
fi
export CONVEX_SELF_HOSTED_ADMIN_KEY="$admin_key"
export CONVEX_DEPLOYMENT=""

exec "$@"
