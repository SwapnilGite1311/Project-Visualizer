#!/usr/bin/env bash
# Checks that all Project Visualizer development tools are installed.
# Usage: bash scripts/env/check_env.sh
FAIL=0

ver_ge() { # usage: ver_ge <have> <need>  -> returns 0 if have >= need
  [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

check() { # usage: check <name> <min_version> <command...>
  local name="$1" need="$2"; shift 2
  local out
  if ! out=$("$@" 2>&1); then
    echo "FAIL  $name: not found"; FAIL=1; return
  fi
  local have
  have=$(echo "$out" | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -n1)
  if ver_ge "$have" "$need"; then
    echo "PASS  $name $have (need >= $need)"
  else
    echo "FAIL  $name $have (need >= $need)"; FAIL=1
  fi
}

check git 2.40 git --version
check node 22.0 node --version
check pnpm 10.0 pnpm --version
if python3 --version >/dev/null 2>&1; then PY=python3; else PY=python; fi  # the Windows Store "python3" stub fails, so test by running it
check python 3.12 $PY --version
check uv 0.4 uv --version
check cmake 3.28 cmake --version

if command -v cl >/dev/null 2>&1 || [ -d "/c/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/VC" ] || [ -d "/c/Program Files/Microsoft Visual Studio/2022" ]; then
  echo "PASS  C++ compiler (MSVC 2022 found)"
elif command -v g++ >/dev/null 2>&1; then
  check g++ 12.0 g++ --version
elif command -v clang++ >/dev/null 2>&1; then
  check clang++ 16.0 clang++ --version
else
  echo "FAIL  C++ compiler: none found"; FAIL=1
fi

if command -v docker >/dev/null 2>&1; then
  echo "PASS  docker (needed from Phase 2)"
else
  echo "WARN  docker not found (needed from Phase 2)"
fi

if [ "$FAIL" -eq 0 ]; then echo "ALL REQUIRED TOOLS OK"; else echo "SOME TOOLS MISSING"; exit 1; fi
