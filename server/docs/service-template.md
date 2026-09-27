# Service template

Every library (`server/libs/<lib>`) and service (`server/services/<svc>`) is an independent pnpm project with its own `package.json` and `pnpm-lock.yaml` (no workspace). Services use libraries through the `link:` protocol. Start every new package from these snippets so they all look the same.

## package.json

```json
{
  "name": "@pv/<svc>",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "esbuild src/index.ts --bundle --platform=node --target=node22 --format=esm --outfile=dist/index.js --external:@node-rs/argon2 --banner:js=\"import{createRequire}from'module';const require=createRequire(import.meta.url);\"",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests"
  }
}
```

Libraries are added with `pnpm add @pv/common@link:../../libs/common` (the same for `db`, `authz`, `telemetry`, `queue`).

## tsconfig.json

```json
{ "extends": "../../tsconfig.base.json", "include": ["src/**/*", "scripts/**/*"] }
```

## Library package.json

```json
{
  "name": "@pv/<lib>",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "typecheck": "tsc --noEmit", "test": "vitest run --passWithNoTests" }
}
```

Libraries take structural (duck-typed) parameters instead of importing Fastify types, so two copies of a dependency never clash.

## app.ts pattern

```ts
export function buildApp(deps: Deps): FastifyInstance {
  const app = Fastify({ logger: false });
  app.setErrorHandler((err, _req, reply) => {
    const { status, body } = toErrorResponse(err); // from @pv/common
    void reply.status(status).send(body);
  });
  app.get('/healthz', async () => ({ ok: true }));
  app.get('/metrics', async (_req, reply) => reply.type('text/plain').send(await deps.metrics.render())); // @pv/telemetry
  app.addHook('onResponse', async (req, reply) => deps.metrics.observeRequest(req, reply));
  // …routes
  return app;
}
```

`src/index.ts` loads the config, builds the real dependencies and calls `buildApp(deps).listen(...)`. Tests call `buildApp(fakeDeps)` and `app.inject(...)` — no network, no database.

## Dockerfile

The build context is `server/`:

```dockerfile
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /repo
COPY tsconfig.base.json ./
COPY libs ./libs
COPY services/<svc> ./services/<svc>
RUN for d in libs/*; do (cd "$d" && pnpm install --frozen-lockfile); done
WORKDIR /repo/services/<svc>
RUN pnpm install --frozen-lockfile && pnpm build

FROM node:22-slim
WORKDIR /app
COPY --from=build /repo/services/<svc>/dist ./dist
ENV NODE_ENV=production
EXPOSE <port>
CMD ["node", "dist/index.js"]
```

## Compose file

`infra/compose/compose.<svc>.yml`:

```yaml
services:
  <svc>:
    build: { context: ../../server, dockerfile: services/<svc>/Dockerfile }
    env_file: [../../server/services/<svc>/.env.docker]
    ports: ["<port>:<port>"]
    depends_on:
      postgres: { condition: service_healthy }
```

List only the stores the service uses under `depends_on`.

## Prometheus target

`infra/observability/prometheus/targets/<svc>.json`:

```json
[{ "targets": ["<svc>:<port>"], "labels": { "service": "<svc>" } }]
```

## Env files

`.env.example` is committed and holds fake values only. Developers copy it to `.env` (localhost URLs, for `pnpm dev`) and to `.env.docker` (Docker service names such as `postgres`, `redis`, `mongo`, for Compose). Both copies are ignored by Git.
