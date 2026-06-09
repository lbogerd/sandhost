# @wtrn/api

Hono API server for Sandhost. It hosts Better Auth routes, the oRPC router,
and the Kubernetes sandbox backend: session-secured procedures to
create/stop/kill/list sandboxes (pods), plus a reconciler loop that syncs pod
state into the `sandbox` table.

```sh
pnpm --filter @wtrn/api dev
```

## Environment

Copy `.env.example` to `.env` for local development.

`BETTER_AUTH_URL` is the public origin for the API server as seen by Better Auth.
`TRUSTED_ORIGINS` is a comma-separated list of browser origins allowed to make
cookie-backed requests to `/api/*` and `/rpc/*`.

Kubernetes access uses the default kubeconfig (or the in-cluster service
account when deployed). `KUBE_CONTEXT` optionally pins a kubeconfig context
(`kind-sandhost` for local dev). `SANDBOX_NAMESPACE`, `SANDBOX_DEFAULT_IMAGE`,
`SANDBOX_CPU_*`/`SANDBOX_MEMORY_*`, and `SANDBOX_RECONCILE_INTERVAL_MS` tune
the sandbox pods and reconciler.
