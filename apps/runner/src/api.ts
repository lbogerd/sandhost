import { createApiClient } from "@wtrn/api-client"
import { env } from "./env.ts"

export const apiClient = createApiClient({
	fetch: (request, init) => {
		const headers = new Headers(request.headers)
		headers.set("x-runner-api-key", env.RUNNER_API_KEY)

		return globalThis.fetch(new Request(request, { headers }), {
			...init,
		})
	},
	rpcUrl: env.API_RPC_URL,
})
