# Scalability

## Desktop

Supports projects up to 5 M lines by loading one level view at a time; no full-graph rendering.

## Server (from the current design) [ARCH-DEPENDENT]

- Capacity targets for 200 concurrent users: ~50 parsing jobs/min, ~20 AI queries/min, P95 < 2 s.
- Scaling thresholds:
  - 500 users → third parsing instance + Kubernetes.
  - 1,000 users → split Redis (sessions / queues / cache).
  - 2,000 users → consider a self-hosted smaller LLM.
  - 5,000 users → full microservices with independent pipelines.

## Compute sizing (current design)

- API gateway: 2 vCPU / 4 GB × 2.
- Parsing: 4 vCPU / 8 GB × 2.
- AI service: 8 vCPU / 16 GB × 2.
- Graph service: 4 vCPU / 8 GB × 2.
- Runtime: 2 vCPU / 4 GB × 2.
- PostgreSQL: primary + 1 replica, 50 GB.
- MongoDB: single node + replica, 100 GB.
- Redis: 2 vCPU / 4 GB, cluster mode off.
