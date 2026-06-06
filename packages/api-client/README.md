# @wtrn/api-client

Typed oRPC client factory for the `@wtrn/rpc-contract` router.

This package does not read app environment variables. Apps own their runtime
configuration and pass the RPC endpoint in explicitly:

```ts
import { createApiClient } from "@wtrn/api-client"

export const apiClient = createApiClient({
	rpcUrl: "http://localhost:4000/rpc",
})
```

By default the factory uses `http://localhost:4000/rpc` and sends requests with
`credentials: "include"` so cookie-backed auth works from the browser.
