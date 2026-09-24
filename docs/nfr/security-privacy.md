# Security and privacy

| ID | Requirement |
|---|---|
| SEC-01 | Source code never leaves the machine unless the user explicitly shares a snapshot. |
| SEC-02 | AI requests contain only the engine-built context pack, never whole repositories. |
| SEC-03 | API keys and tokens are encrypted at rest (OS keychain via Electron safeStorage). |
| SEC-04 | Renderer runs with contextIsolation, sandbox, no Node integration. |
| SEC-05 | Local ports (47100, 47101) bind to 127.0.0.1 and require a token. |
| SEC-06 | Server traffic uses TLS; passwords hashed with Argon2id; JWT access tokens expire in 15 minutes. |
| SEC-07 | Every server input is validated with zod; SQL uses parameters only. |
| SEC-08 | Audit log for team/admin actions (Phase 6). |
| SEC-09 | Dependencies scanned in CI; secrets scanning on push. |
| SEC-10 | Telemetry is opt-in and never includes code or file names. |
