# Deployment view

How the product reaches users and servers (new client-server architecture, 2026-09-26).

## Desktop

- Installers: Windows NSIS `.exe`, macOS `.dmg`, Linux `.AppImage`. The engine binary is bundled in the app resources.
- Each user's machine is its own compute unit: 200 users = 200 engines, no server load for parsing or graph work. A laptop with 16 GB RAM and 8 cores handles repositories up to about 500,000 lines.
- The engine runs as `pv-engine serve` started by the desktop; the local cache lives in `~/.project-visualizer/cache/`.
- Auto-update arrives in Phase 6.

## Cloud (dev)

Docker Compose from `infra/compose/` (PostgreSQL, TimescaleDB, Redis, MongoDB, MinIO, Qdrant + one compose file per service).

## Cloud (prod, 200 users)

| Instance | Runs | Size | $/month |
| --- | --- | --- | --- |
| A | Nginx, gateway, realtime, auth, projects, billing, licensing, SSO, audit, feedback | 2 vCPU / 4 GB | 24 |
| B | ai-gateway, ml-gateway, sync | 4 vCPU / 8 GB | 48 |
| C | Python AI/ML service (no GPU) | 4 vCPU / 16 GB | 96 |
| D | runtime aggregation + TimescaleDB | 2 vCPU / 4 GB | 24 |

Managed stores: PostgreSQL ($25), MongoDB Atlas M2 ($9), Redis ($15), S3 ($10); Nginx load balancer ($12); Cloudflare CDN (free). Infrastructure ≈ **$263/month**; AI API usage $200–400/month; total **$460–660/month** (DigitalOcean prices, from `incoming/scaling-summary.md`).

Expected load: 50–100 auth requests/minute at peak, 10–20 concurrent AI jobs, ~40 runtime metric writes/second, infrequent snapshot bursts.

## Cloud (≥ 500 users)

Kubernetes + Helm (P6-ONPREM); the chart keeps the four groups as node affinity labels.

## On-prem (enterprise)

Helm chart; Qdrant (not Pinecone) for vectors; no outbound AI unless configured (an OpenAI-compatible local model server works). The desktop keeps working offline for everything except AI, team sync and billing.
