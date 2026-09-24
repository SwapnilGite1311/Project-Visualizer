# Data ownership and life cycle

| Entity | Created by | Updated by | Deleted when | Stored where |
| --- | --- | --- | --- | --- |
| Graph (nodes/edges) | engine on `project.open` | engine on file change (Phase 4) | `project.close` | engine memory |
| Runtime events | agent → engine | never (append) | ring buffer overflow or `runtime.clear` | engine memory |
| Metrics history | engine metrics module | append | user clears | `.pv/metrics.db` |
| Settings | desktop main | user | never | userData/settings.json |
| Secrets | desktop main | user | user deletes | safeStorage file |
| Snapshot | sync service | never | user deletes | MongoDB + S3 |
| User | auth | user | account deletion | PostgreSQL |
