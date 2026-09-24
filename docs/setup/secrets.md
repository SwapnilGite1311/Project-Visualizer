# Secrets management

## Rules

- Never commit secrets.
- Never log secrets.
- Never paste secrets into AI prompts.
- Rotate a secret immediately if it was committed.

## Local development

Each service has a committed `.env.example` (names only, fake values) and a local `.env` (real values, git-ignored).

## Desktop app

LLM API keys and login tokens are stored with Electron `safeStorage` (encrypted by the operating system). They never reach the renderer process.

## Server [ARCH-DEPENDENT]

Production secrets come from environment variables injected by Docker secrets or Kubernetes secrets; JWT keys are files under `server/.keys/` (git-ignored) in development.

## CI

Secrets are GitHub Actions repository secrets, referenced as `${{ secrets.NAME }}`.

## Secret inventory

| Name | Used by | Where stored |
|---|---|---|
| `ANTHROPIC_API_KEY` | desktop (user) / ai service | safeStorage / env |
| `PV_JWT_PRIVATE_KEY_PATH` | auth | file |
| `PV_PG_URL` | server services | env |
| `STRIPE_SECRET_KEY` | billing | env |
| `GITHUB_OAUTH_CLIENT_SECRET` | auth | env |
