#!/usr/bin/env bash
# Builds a language plugin pack into an installable plugin folder.
# Usage: bash engine/plugins/build_plugin.sh <lang-folder> <out-dir>
#   <lang-folder>  a pack: source.txt, language.json and the .scm query files (e.g. engine/plugins/ruby)
#   <out-dir>      where to put the plugin (e.g. ~/.project-visualizer/languages)
# Needs git, Node.js (npx) and a C compiler (Visual Studio Build Tools on Windows, Xcode tools on macOS, gcc/clang on Linux).
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: build_plugin.sh <lang-folder> <out-dir>" >&2
  exit 2
fi
pack="$(cd "$1" && pwd)"
out_root="$2"

value() { # value <key>: the value of key=value in source.txt ("" if absent)
  sed -n "s/^$1=//p" "$pack/source.txt" | tr -d '\r' | head -n 1
}
repo="$(value repo)"
tag="$(value tag)"
subdir="$(value subdir)"
lib_name="$(value lib_name)"
if [ -z "$repo" ] || [ -z "$tag" ] || [ -z "$lib_name" ]; then
  echo "source.txt must set repo, tag and lib_name" >&2
  exit 2
fi

case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN* | Windows_NT) ext=".dll" ;;
  Darwin) ext=".dylib" ;;
  *) ext=".so" ;;
esac
library="$lib_name$ext"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
echo "cloning $repo ($tag)"
git -c advice.detachedHead=false clone --quiet --depth 1 --branch "$tag" "$repo" "$work/grammar"
src="$work/grammar"
if [ -n "$subdir" ]; then src="$src/$subdir"; fi

echo "building $library"
(cd "$src" && npx --yes tree-sitter-cli@0.24 build --output "$library")

id="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).id)' "$pack/language.json")"
dest="$out_root/$id"
mkdir -p "$dest"
cp "$src/$library" "$dest/"
cp "$pack"/*.scm "$dest/"
# language.json with library set to the file built for this operating system
node -e '
  const fs = require("fs");
  const j = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  j.library = process.argv[2];
  fs.writeFileSync(process.argv[3], JSON.stringify(j, null, 2) + "\n");
' "$pack/language.json" "$library" "$dest/language.json"

echo "PLUGIN READY: $dest"
