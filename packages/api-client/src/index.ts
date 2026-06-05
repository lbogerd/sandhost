import { createORPCClient } from "@orpc/client"
import { RPCLink, type RPCLinkOptions } from "@orpc/client/fetch"
import type { ContractRouterClient } from "@orpc/contract"
import { routerContract } from "@wtrn/rpc-contract"

type ApiClientContext = Record<never, never>
type ImportMetaEnv = {
	VITE_API_ORIGIN?: string
	VITE_API_URL?: string
	VITE_RPC_URL?: string
}
type ImportMetaWithEnv = ImportMeta & {
	env?: ImportMetaEnv
}

export type ApiClient = ContractRouterClient<typeof routerContract>
export type CreateApiClientOptions = Omit<RPCLinkOptions<ApiClientContext>, "url"> & {
	url?: RPCLinkOptions<ApiClientContext>["url"]
}

export function getDefaultRpcUrl() {
	const env = (import.meta as ImportMetaWithEnv).env

	if (env?.VITE_RPC_URL) {
		return env.VITE_RPC_URL
	}

	const apiOrigin = env?.VITE_API_ORIGIN ?? env?.VITE_API_URL ?? "http://localhost:4000"

	return `${apiOrigin.replace(/\/$/, "")}/rpc`
}

export function createApiClient(options: CreateApiClientOptions = {}): ApiClient {
	const {
		fetch = (request, init) =>
			globalThis.fetch(request, {
				...init,
				credentials: "include",
			}),
		url = getDefaultRpcUrl,
		...linkOptions
	} = options

	const link = new RPCLink<ApiClientContext>({
		...linkOptions,
		fetch,
		url,
	})

	return createORPCClient(link)
}

export const apiClient = createApiClient()
