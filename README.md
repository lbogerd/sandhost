# sandhost

Distributed sandbox hosting using microsandboxes. This repo is a pnpm/Turbo
monorepo and is still under heavy development.

## Projects

- `apps/web` - React UI for auth, runner registration, runner status, and test sandbox starts.
- `apps/api` - Hono/oRPC API, Better Auth endpoints, runner heartbeats, and command queueing.
- `apps/runner` - Local runner process that heartbeats to the API and executes sandbox commands.
- `packages/rpc-contract` - Shared oRPC contract and Zod schemas.
- `packages/api-client` - Shared typed oRPC client factory.
- `packages/auth` - Better Auth setup, including runner API keys.
- `packages/db` - Drizzle/Postgres client and database scripts.
- `packages/db-schema` - Drizzle schema for auth, runners, heartbeats, and commands.
- `packages/components` - Shared React component package.
- `packages/domain` - Domain package placeholder for shared business rules.

## Local Development

```sh
pnpm install
pnpm pg:up
pnpm db:push
pnpm dev
```

Copy each app's `.env.example` to `.env` as needed.
