# @wtrn/api

Hono API server for Sandhost. It hosts Better Auth routes, the oRPC router,
runner API-key auth, heartbeat ingestion, runner listing, and test sandbox
command queueing.

```sh
pnpm --filter @wtrn/api dev
```

## Environment

Copy `.env.example` to `.env` for local development.

`BETTER_AUTH_URL` is the public origin for the API server as seen by Better Auth.
`TRUSTED_ORIGINS` is a comma-separated list of browser origins allowed to make
cookie-backed requests to `/api/*` and `/rpc/*`.
