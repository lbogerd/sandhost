# @wtrn/runner

Local runner process for Sandhost. It authenticates with a runner API key,
reports host telemetry and local sandbox state, then executes commands returned
by the API.

The current driver is fake and intended for developing the control plane.

```sh
pnpm --filter @wtrn/runner dev
```

Copy `.env.example` to `.env` and set `RUNNER_API_KEY`. `RUNNER_ID` defaults to
the machine hostname.
