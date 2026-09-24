# P1-DE2E-002 — bug in the plan

**Plan says:** `repoRoot` is "two levels up from `desktop/e2e/helpers`".

**Actual:** two levels up from `desktop/e2e/helpers` is `desktop/`. The repository root is three levels up; `paths.ts` uses `resolve(__dirname, '..', '..', '..')`.
