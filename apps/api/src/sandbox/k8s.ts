import { ApiException, CoreV1Api, KubeConfig } from "@kubernetes/client-node"
import { env } from "../env.ts"

let kubeConfig: KubeConfig | null = null
let coreApi: CoreV1Api | null = null

export function getKubeConfig(): KubeConfig {
	if (!kubeConfig) {
		kubeConfig = new KubeConfig()
		kubeConfig.loadFromDefault()

		if (env.KUBE_CONTEXT) {
			kubeConfig.setCurrentContext(env.KUBE_CONTEXT)
		}
	}

	return kubeConfig
}

export function getCoreApi(): CoreV1Api {
	if (!coreApi) {
		coreApi = getKubeConfig().makeApiClient(CoreV1Api)
	}

	return coreApi
}

export function isApiException(error: unknown): error is ApiException<string> {
	return error instanceof ApiException
}

export function isNotFound(error: unknown): boolean {
	return isApiException(error) && error.code === 404
}

export function getKubernetesErrorMessage(error: unknown): string {
	if (isApiException(error)) {
		const parsedBody = parseJsonObject(error.body)

		if (
			parsedBody &&
			typeof parsedBody === "object" &&
			"message" in parsedBody &&
			typeof parsedBody.message === "string"
		) {
			return parsedBody.message
		}

		return `Kubernetes API error (HTTP ${error.code})`
	}

	return error instanceof Error ? error.message : String(error)
}

function parseJsonObject(value: string): unknown {
	try {
		return JSON.parse(value)
	} catch {
		return null
	}
}
