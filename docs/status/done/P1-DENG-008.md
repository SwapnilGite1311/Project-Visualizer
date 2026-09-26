task: P1-DENG-008
date: 2026-09-26
verify: passed
note: the transport switch is the env var PV_ENGINE_TRANSPORT (stdio|pipe) instead of a setting, because main/index.ts (P1-DMAIN) builds the EngineService and is outside this task's files. Real app checked: engine.info shows transport pipe and TCP 7700.
