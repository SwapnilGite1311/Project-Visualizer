# Deployment view

How the product reaches users and servers. [ARCH-DEPENDENT]

## Desktop

- Installers: Windows NSIS `.exe`, macOS `.dmg`, Linux `.AppImage`.
- The engine binary is bundled in the app resources.
- Auto-update arrives in Phase 6.

## Cloud (dev)

Docker compose from `infra/compose/`.

## Cloud (prod, ≤ 200 users)

- 2 instances per service behind Nginx.
- Managed Postgres, Redis and MongoDB.
- S3 object storage.
- Cloudflare CDN.

## Cloud (≥ 500 users)

Kubernetes + Helm (Phase 6).

## On-prem (enterprise)

Helm chart; no outbound AI unless configured.
