```
pnpm install
pnpm run dev
```

```
open http://localhost:3000
```

## Environment

Copy `.env.example` to `.env` for local development.

`BETTER_AUTH_URL` is the public origin for the API server as seen by Better Auth.
`TRUSTED_ORIGINS` is a comma-separated list of browser origins allowed to make
cookie-backed requests to `/api/*` and `/rpc/*`.
