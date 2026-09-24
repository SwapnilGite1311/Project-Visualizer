# Server database schema

All planned PostgreSQL tables and their migration files. [ARCH-DEPENDENT]

| Migration file | Table(s) | Module |
| --- | --- | --- |
| `0001_base_extensions.sql` | (pgcrypto extension, schema_migrations handled by runner) | P2-SDB |
| `0010_auth_users.sql` | users | P2-SAUTH |
| `0011_auth_oauth.sql` | oauth_accounts | P2-SAUTH |
| `0020_projects_orgs.sql` | organizations, org_members | P2-SPROJ |
| `0021_projects_projects.sql` | projects | P2-SPROJ |
| `0030_sync_snapshots.sql` | snapshots | P2-SSYNC |
| `0040_collector_sources.sql` | runtime_sources | P3-SCOLL |
| `0050_aigw_requests.sql` | ai_requests | P4-SAIGW |
| `0060_mlgw_jobs.sql` | ml_jobs | P5-SMLGW |
| `0070_billing_subscriptions.sql` | subscriptions, billing_events | P6-SBILL |
| `0071_licensing_entitlements.sql` | plan_features, plan_limits, org_plans | P6-SLIC |
| `0080_audit_logs.sql` | audit_logs | P6-SAUDIT |
| `0085_feedback_items.sql` | feedback_items | P6-SFEED |
| `0090_sso_connections.sql` | sso_connections | P6-SSSO |
