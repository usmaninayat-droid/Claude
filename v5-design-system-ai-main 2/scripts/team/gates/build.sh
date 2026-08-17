#!/usr/bin/env bash
# Build gate — typecheck (+ optional build). Run from the DS root. Token-free.
set -uo pipefail
cd "${1:-.}"
echo "BUILD: tsc --noEmit"
if command -v pnpm >/dev/null 2>&1; then
  pnpm exec tsc --noEmit && echo "BUILD: PASS" || { echo "BUILD: FAIL"; exit 1; }
else
  npx --no-install tsc --noEmit && echo "BUILD: PASS" || { echo "BUILD: FAIL (tsc unavailable)"; exit 1; }
fi
