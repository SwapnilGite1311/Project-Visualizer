# Releases

`build-all.sh` builds and tests the engine and the desktop app and packages the installer for the current OS (`desktop/release/`). The `release-desktop` workflow runs it on Windows, macOS and Linux for every `v*` tag and uploads the installers to the GitHub release.

## Versioning

- Semantic versions: `MAJOR.MINOR.PATCH`.
- The engine version (`project(pv_engine VERSION x.y.z)` in `engine/CMakeLists.txt`) and the desktop version (`"version"` in `desktop/package.json`) must always match.
- The Git tag is the same version with a `v` prefix, e.g. `v0.1.0`.

## Checklist

- [ ] All tests green (engine, desktop unit, `desktop/e2e`).
- [ ] PERF measured with the Release engine and the result added to `engine/modules/perf/README.md`.
- [ ] Version bumped in both `engine/CMakeLists.txt` and `desktop/package.json`.
- [ ] Tag `vX.Y.Z` pushed.
- [ ] Installers downloaded from the release and smoke-tested on a clean Windows machine (see `RELEASE_LOG.md`).
- [ ] Release notes written.

## Code signing

Builds are not signed yet. Windows SmartScreen shows "Windows protected your PC" on first run; users click "More info" → "Run anyway". Buying a code-signing certificate is planned in P6-SEC.
