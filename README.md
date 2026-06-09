# sandhost

Sandbox hosting on Kubernetes. The API server creates sandbox pods directly in
a cluster via the Kubernetes API. This repo is a pnpm/Turbo monorepo and is
still under heavy development.

## Projects

- `apps/web` - React UI for auth and sandbox management (create/stop/kill, live status).
- `apps/api` - Hono/oRPC API, Better Auth endpoints, Kubernetes pod driver, and the sandbox state reconciler.
- `packages/rpc-contract` - Shared oRPC contract and Zod schemas.
- `packages/api-client` - Shared typed oRPC client factory.
- `packages/auth` - Better Auth setup.
- `packages/db` - Drizzle/Postgres client and database scripts.
- `packages/db-schema` - Drizzle schema for auth and sandboxes.
- `packages/components` - Shared React component package.
- `packages/domain` - Domain package placeholder for shared business rules.

## How sandboxes work

A sandbox is a single pod in the configured namespace (default `sandhost`),
created from a configurable image with optional env vars and command. Pods run
with a hardened security context (non-root, no privilege escalation, no
service account token) and `restartPolicy: Never`. A reconciler loop in the
API polls pod state and keeps the `sandbox` table up to date; orphaned pods
are cleaned up automatically.

Note: images must support running as a non-root user (the default
`busybox:1.37` placeholder does).

## Local Development

Prerequisites: Docker, [kubectl](https://kubernetes.io/docs/tasks/tools/), and
[kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation).

```sh
pnpm install
pnpm pg:up    # postgres via docker compose
pnpm db:push  # drizzle schema push
pnpm k8s:up   # kind cluster + sandhost namespace
pnpm dev
```

Copy each app's `.env.example` to `.env` as needed. The API reads the
kubeconfig context from `KUBE_CONTEXT` (use `kind-sandhost` for local dev).
`pnpm k8s:down` deletes the kind cluster.
