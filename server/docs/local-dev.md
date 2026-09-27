# Running the server locally

The cloud services are optional: the desktop app works fully without them. You need them to work on accounts, teams, snapshot sharing, the AI and ML gateways and team runtime dashboards.

## Start infrastructure

Docker Desktop must be running. (If Docker Desktop 4.88–4.91 crash-loops at start on Windows with "The file cannot be accessed by the system" for `sailor-ingest.sock` or `engine.sock`, start it with its local data outside your user folder: `set LOCALAPPDATA=C:\DockerLocal` and then start `Docker Desktop.exe` from the same window.) Then:

```bash
bash infra/compose/up.sh
```

This starts PostgreSQL, Redis, MongoDB and MinIO (and the observability stack when asked). `bash infra/compose/down.sh` stops them; data stays in Docker volumes.

## Database migrations

```bash
cd server/libs/db && PV_PG_URL=postgres://pv:pv@localhost:5432/pv pnpm migrate
```

## JWT keys

```bash
cd server/services/auth && pnpm gen-keys
```

The keys go to `server/services/auth/keys/` (ignored by Git). Other services only need the public key.

## Run a service

```bash
cd server/services/<svc> && cp .env.example .env && pnpm install && pnpm dev
```

`bash server/scripts/check-all.sh` typechecks and tests every library and service.

## Ports

| Service | Port |
|---|---|
| gateway | 8080 |
| auth | 8101 |
| projects | 8102 |
| sync | 8103 |
| ai-gateway | 8104 |
| runtime-agg | 8105 |
| realtime | 8106 |
| billing | 8107 |
| licensing | 8108 |
| ml-gateway | 8109 |
| audit | 8110 |
| sso | 8111 |
| feedback | 8113 |
| Python AI service | 8200 |
| PostgreSQL | 5432 |
| TimescaleDB | 5433 |
| Redis | 6379 |
| MongoDB | 27017 |
| MinIO (S3 / console) | 9000 / 9001 |
| Qdrant | 6333 |
| Prometheus | 9090 |
| Grafana | 3001 |
| Jaeger (UI / OTLP HTTP) | 16686 / 4318 |
