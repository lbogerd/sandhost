import { createORPCClient } from "@orpc/client"
import { RPCLink, type RPCLinkOptions } from "@orpc/client/fetch"
import type { ContractRouterClient } from "@orpc/contract"
import { routerContract } from "@wtrn/rpc-contract"

type ApiClientContext = Record<never, never>

export type ApiClient = ContractRouterClient<typeof routerContract>
export type RpcUrl = RPCLinkOptions<ApiClientContext>["url"]
export type CreateApiClientOptions = Omit<RPCLinkOptions<ApiClientContext>, "url"> & {
	rpcUrl?: RpcUrl
}

export const DEFAULT_RPC_URL = "http://localhost:4000/rpc"

export function createApiClient(options: CreateApiClientOptions = {}): ApiClient {
	const {
		fetch = (request, init) =>
			globalThis.fetch(request, {
				...init,
				credentials: "include",
			}),
		rpcUrl = DEFAULT_RPC_URL,
		...linkOptions
	} = options

	const link = new RPCLink<ApiClientContext>({
		...linkOptions,
		fetch,
		url: rpcUrl,
	})

	return createORPCClient(link)
}
