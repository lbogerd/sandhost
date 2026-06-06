import { createApiClient } from "@wtrn/api-client"

type ImportMetaEnv = {
	VITE_API_ORIGIN?: string
	VITE_RPC_URL?: string
}

type ImportMetaWithEnv = ImportMeta & {
	env?: ImportMetaEnv
}

export const apiOrigin = getApiOrigin()
export const rpcUrl = getRpcUrl(apiOrigin)
export const apiClient = createApiClient({ rpcUrl })

function getApiOrigin() {
	const env = (import.meta as ImportMetaWithEnv).env
	const apiOrigin = env?.VITE_API_ORIGIN?.trim()

	return (apiOrigin || "http://localhost:4000").replace(/\/$/, "")
}

function getRpcUrl(origin: string) {
	const env = (import.meta as ImportMetaWithEnv).env
	const rpcUrl = env?.VITE_RPC_URL?.trim()

	return rpcUrl || `${origin}/rpc`
}
