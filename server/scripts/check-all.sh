#!/usr/bin/env bash
# Typechecks and tests every server library and service (the same loop as .github/workflows/ci-server.yml).
set -e
cd "$(dirname "$0")/.."
for d in libs/* services/*; do
  if [ -f "$d/package.json" ]; then
    echo "== $d"
    (cd "$d" && pnpm install --frozen-lockfile && pnpm typecheck && pnpm test)
  fi
done
echo "ALL SERVER PACKAGES OK"
