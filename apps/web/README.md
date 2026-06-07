# web

React/Vite UI for the current Sandhost vertical slice: auth smoke tests, runner
API-key creation, runner status, and fake sandbox start commands.

```sh
pnpm --filter web dev
```

## Environment

Copy `.env.example` to `.env` for local development.

`VITE_API_ORIGIN` is the public origin of `apps/api`. The app derives the RPC
endpoint as `VITE_API_ORIGIN + /rpc`.

`VITE_RPC_URL` is optional and should only be set when the RPC endpoint does not
live at `/rpc` under the API origin.
