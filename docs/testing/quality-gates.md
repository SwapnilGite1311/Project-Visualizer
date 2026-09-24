# Quality gates

## Merge gate

- CI is green.
- Verify output is attached.
- Review is done for CODE modules.
- Plan lint passes.

## Release gate

- All tests are green on Windows and Linux.
- The end-to-end smoke test passes.
- No open critical bugs.
- PERF-01 … PERF-04 are measured and met.

## Metrics tracked

- Engine coverage %.
- Test count.
- Open bugs.
- Mean time to fix.
- BLOCKED rate per model.
