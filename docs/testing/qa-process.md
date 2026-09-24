# QA process

1. Bug found → bug note (card R2.6) or GitHub issue.
2. Severity: critical (data loss / crash on open), high (feature broken), medium, low.
3. The fix is a new task in the module that owns the file.
4. Every fix adds a regression test.
5. Before each phase sign-off: run all tests and the end-to-end smoke test.
