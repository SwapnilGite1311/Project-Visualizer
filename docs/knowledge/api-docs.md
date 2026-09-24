# API documentation

Every interface has exactly one documentation source.

## Engine RPC

JSON Schemas in `contracts/rpc/**` plus examples. The method table in card R9 of the build plan is the index.

## Desktop IPC

The channel list in card R10 and in each handler file's header comment.

## Server HTTP

Each service exposes OpenAPI at `/docs/json` via `@fastify/swagger`.

## Python AI

FastAPI OpenAPI at `/openapi.json`.

## Runtime protocol

Card R12 of the build plan and the schemas in `contracts/events/`.
