#!/usr/bin/env bash
# Builds and tests the engine and the desktop app, then packages the installer for this OS.
# Usage (from the repository root): bash scripts/release/build-all.sh
set -euo pipefail

cd "$(dirname "$0")/../.."

case "$(uname -s)" in
  *MINGW* | *MSYS*) windows=1 ;;
  *) windows=0 ;;
esac

echo "== engine (release) =="
if [ "$windows" = 1 ]; then
  (cd engine && cmake --preset dev && cmake --build --preset release)
  test_preset=dev
else
  (cd engine && cmake --preset release-unix && cmake --build --preset release-unix)
  test_preset=dev-unix
fi

echo "== engine tests =="
(cd engine && cmake --preset "$test_preset" && cmake --build --preset "$test_preset" && ctest --preset "$test_preset")

echo "== desktop =="
(cd desktop && pnpm install --frozen-lockfile && pnpm typecheck && pnpm test && pnpm build && pnpm exec electron-builder --publish never)

echo "RELEASE BUILD OK"
ls -la desktop/release
