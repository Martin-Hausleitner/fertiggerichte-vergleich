#!/usr/bin/env bash
# Runs the SDK-independent tests without tsx (bundles with the app's esbuild). Needs `ws` resolvable.
set -euo pipefail
cd "$(dirname "$0")/.."
ESB=../node_modules/.bin/esbuild
rm -rf .test-build && mkdir -p .test-build
for f in test/*.test.ts; do "$ESB" "$f" --bundle --platform=node --format=esm --external:ws --log-level=warning --outfile=".test-build/$(basename "${f%.ts}").mjs"; done
GOODCHOICE_DATA="${GOODCHOICE_DATA:-$(pwd)/../public/data.json}" node --test .test-build/*.mjs
