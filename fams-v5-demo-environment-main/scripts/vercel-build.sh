#!/usr/bin/env bash
# Static production build of the whole UCCP demo — the main app plus the four
# embedded override screen apps — assembled into ONE output directory that any
# static host (Vercel, `npx serve -s`, S3) can serve.
#
# Run it from anywhere:  bash fams-v5-demo-environment/scripts/vercel-build.sh
#
# LAYOUT IT EXPECTS (the snapshot repo's layout, and the working checkout's):
#
#   <root>/fams-design-system            built first — the demo env's `link:`
#                                        deps resolve to each package's dist/
#   <root>/fams-v5-demo-environment      this repo
#
# WHAT IT PRODUCES  →  fams-v5-demo-environment/app/dist
#
#   index.html, assets/…                 the main app (history routing; the
#                                        host needs an SPA rewrite, see
#                                        vercel.json)
#   mockServiceWorker.js                 MSW at scope '/' — the demo's only
#                                        data source, there is no backend
#   screens/operations-center/…          the four React-18 override bundles,
#   screens/planning-v2/…                each built with
#   screens/inspector-shifts/…           --base=/screens/<name>/ and iframed
#   screens/inspector-app/…              same-origin by app/src/demo/*-module.tsx
#   assets/<public assets>               operations-center's public/assets,
#                                        ALSO copied to the root /assets so its
#                                        root-absolute `/assets/x.svg` string
#                                        literals resolve (see COPY note below)
#   404.html                             a copy of index.html — the standard
#                                        GitHub Pages SPA fallback
#
# BASE_PATH — the path prefix the deploy is served under. Default `/` (Vercel,
# `npx serve -s`, S3 at a bucket root). GitHub Pages PROJECT pages serve under
# the repo name, so that build runs:
#
#     BASE_PATH=/MME-FRMS-MVP/ bash fams-v5-demo-environment/scripts/vercel-build.sh
#
# It must start and end with a slash. It flows into every `vite build --base`
# (the screen apps get `<BASE_PATH>screens/<name>/`), and from there into
# `import.meta.env.BASE_URL`, which the runtime uses for the MSW worker URL, the
# demo API prefix and the router basepath — see app/src/main.tsx. Root-absolute
# string literals (`/assets/…`, `/branding/…`, `/screens/…`) are rewritten at
# build time by scripts/vite-base-literals.mjs, which reads the same base.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEMO="$ROOT/fams-v5-demo-environment"
DS="$ROOT/fams-design-system"
SCREENS="$DEMO/tenants/uccp/overrides/screens"
OUT="$DEMO/app/dist"

BASE_PATH="${BASE_PATH:-/}"
case "$BASE_PATH" in
  /*/ | /) ;;
  *) echo "FATAL: BASE_PATH must start and end with '/' (got '$BASE_PATH')" >&2; exit 1 ;;
esac

# The DS + app bundles are large (leaflet/deck.gl/echarts stacks); Vercel's
# default heap is enough on Node 20+, but pin it so a smaller builder image
# doesn't OOM mid-rollup.
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=6144}"
# Vite `build` doesn't need the browser binaries the app's devDeps pull in.
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

# PNPM VERSION — pinned HERE, not left to the host.
#
# All four lockfiles are lockfileVersion 9.0, written by pnpm 10. A pnpm of the
# wrong major reads that as "not compatible", ignores the lockfile, and then
# dies on `--frozen-lockfile` with "Headless installation requires a
# pnpm-lock.yaml file". That is exactly how the Vercel builds kept failing: its
# image answers `pnpm --version` with 6.35.1 and does not consult
# `packageManager` unless corepack is explicitly enabled, so the pins in the
# six package.json files were never read. Rather than depend on each host's
# pnpm-resolution policy (or regenerate four lockfiles), the build installs and
# front-loads the version it needs.
PNPM_VERSION="10.34.5"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
if [ "$(pnpm --version 2>/dev/null || true)" != "$PNPM_VERSION" ]; then
  step "provision pnpm@$PNPM_VERSION (host has: $(pnpm --version 2>/dev/null || echo none))"
  # Install into a build-local prefix and put it FIRST on PATH. `npm i -g`
  # alone is not enough: the host's `pnpm` is often a corepack shim that sits
  # earlier on PATH and keeps winning (Vercel's image answers 6.35.1 that way),
  # and nested tooling — turbo, the workspace scripts — resolves `pnpm` from
  # PATH too, so the override has to be on PATH rather than a variable.
  npm install -g --prefix "$ROOT/.pnpm-provisioned" "pnpm@$PNPM_VERSION" >/dev/null
  export PATH="$ROOT/.pnpm-provisioned/bin:$PATH"
fi
PNPM="pnpm"
step "pnpm in use: $($PNPM --version)"
[ "$($PNPM --version)" = "$PNPM_VERSION" ] || {
  echo "FATAL: could not provision pnpm@$PNPM_VERSION (got $($PNPM --version))" >&2
  exit 1
}

# 1. design system — the demo env links into each package's dist/, which is
#    not committed, so this must happen before its install resolves.
step "fams-design-system: install + build"
cd "$DS"
$PNPM install --frozen-lockfile
$PNPM build

# 2. demo environment (root workspace + app)
step "fams-v5-demo-environment: install"
cd "$DEMO"
$PNPM install --frozen-lockfile

# 3. the four override screen apps — separate installs (own lockfiles, React
#    18 vs the host's 19) and separate builds, each based at the path the host
#    iframes them from.
for name in operations-center planning-v2 inspector-shifts inspector-app; do
  step "screen: $name"
  cd "$SCREENS/$name"
  # --ignore-workspace: these three apps carry their OWN package.json and
  # pnpm-lock.yaml but no pnpm-workspace.yaml, so pnpm would walk up, find the
  # demo environment's workspace root and install THAT instead — leaving this
  # app with no node_modules and the next line failing with "vite not found".
  # (It goes unnoticed on a dev machine, where node_modules already exists.)
  $PNPM install --frozen-lockfile --ignore-workspace
  # `pnpm build` is `tsc -b && vite build`; typecheck is a dev gate, not a
  # deploy gate — build only, so a stray type error can't take the deploy down.
  $PNPM exec vite build --base="${BASE_PATH}screens/$name/"
done

# 4. the main app. Its own `build` script runs `tsc --noEmit` first — same
#    reasoning as above, run vite directly.
step "app: build (base $BASE_PATH)"
cd "$DEMO/app"
$PNPM exec vite build --base="$BASE_PATH"

# 5. assemble
step "assemble $OUT"
rm -rf "$OUT/screens"
mkdir -p "$OUT/screens"
for name in operations-center planning-v2 inspector-shifts inspector-app; do
  cp -R "$SCREENS/$name/dist" "$OUT/screens/$name"
done

# operations-center's source carries root-absolute asset literals
# (`/assets/truck-tanker.svg` etc. in .tsx strings) that Vite's `base` rewrite
# cannot reach — they are plain strings, not imports. Serving that app's
# public/assets at the root /assets too makes them resolve, and cannot clash
# with the main app's own bundle output there (Vite emits hashed filenames).
step "copy operations-center public assets to /assets (root-absolute literals)"
mkdir -p "$OUT/assets"
cp -R "$SCREENS/operations-center/public/assets/." "$OUT/assets/"

# GitHub Pages has no rewrite rules: it serves 404.html for any path with no
# file behind it. A copy of index.html there IS the SPA fallback, so deep links
# and reloads boot the app instead of showing Pages' own 404. Harmless
# everywhere else (Vercel's rewrite means it is never reached).
step "SPA fallback: 404.html"
cp "$OUT/index.html" "$OUT/404.html"

# Without this, Pages runs the output through Jekyll, which drops files and
# directories whose names begin with an underscore.
touch "$OUT/.nojekyll"

# MSW is the demo's entire data layer — a build without the worker at the
# output root is a broken deploy, so fail loudly rather than ship it.
test -f "$OUT/mockServiceWorker.js" || {
  echo "FATAL: mockServiceWorker.js missing from $OUT — run 'pnpm --filter app msw:init'" >&2
  exit 1
}
test -f "$OUT/screens/operations-center/index.html"
test -f "$OUT/screens/planning-v2/index.html"
test -f "$OUT/screens/inspector-shifts/index.html"
test -f "$OUT/screens/inspector-app/index.html"

step "done — output: $OUT"
