# Engine performance

## How to run

The perf tests generate a 1,000-file Python project in the temp folder, so they are skipped unless `PV_RUN_PERF` is set. Measure with the Release build (the Debug build is much slower):

```bash
cd engine
cmake --build --preset release
PV_RUN_PERF=1 ctest --test-dir build -C Release -R EnginePerf --output-on-failure -V
```

With the Debug build: `PV_RUN_PERF=1 ctest --preset dev -R EnginePerf`.

## Results

| Date | Machine | Build | OpenThousandFiles ms | LevelViewFast ms | ImpactFast ms |
| --- | --- | --- | --- | --- | --- |
| 2026-09-24 | Windows 11, MSVC 14.44 (dev machine) | Release | 542 | 0.96 | 0.11 |
