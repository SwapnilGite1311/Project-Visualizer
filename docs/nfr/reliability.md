# Reliability and availability

| ID | Target |
|---|---|
| REL-01 | Engine crash → desktop restarts it automatically and reopens the project; user sees a notice. |
| REL-02 | A file that fails to parse never stops the whole import; it is reported. |
| REL-03 | UI panels are isolated by error boundaries. |
| REL-04 | Server availability target 99.5% monthly (Phase 2+). |
| REL-05 | Daily PostgreSQL and MongoDB backups, 14-day retention. |
| REL-06 | Queued jobs survive a service restart (BullMQ persistence). |
