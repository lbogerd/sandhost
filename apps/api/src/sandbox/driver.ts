import type { V1Pod, V1Secret } from "@kubernetes/client-node"
import { env } from "../env.ts"
import { getCoreApi, isNotFound } from "./k8s.ts"
import { SANDBOX_CONTAINER_NAME, SANDBOX_LABEL_SELECTOR } from "./pod-spec.ts"

export async function createSandboxPod(pod: V1Pod): Promise<void> {
	await getCoreApi().createNamespacedPod({
		body: pod,
		namespace: env.SANDBOX_NAMESPACE,
	})
}

export async function deleteSandboxPod(
	podName: string,
	options: { force: boolean },
): Promise<void> {
	try {
		await getCoreApi().deleteNamespacedPod({
			gracePeriodSeconds: options.force ? 0 : undefined,
			name: podName,
			namespace: env.SANDBOX_NAMESPACE,
		})
	} catch (error) {
		if (isNotFound(error)) return
		throw error
	}
}

export async function listSandboxPods(): Promise<V1Pod[]> {
	const podList = await getCoreApi().listNamespacedPod({
		labelSelector: SANDBOX_LABEL_SELECTOR,
		namespace: env.SANDBOX_NAMESPACE,
	})

	return podList.items
}

export async function createSandboxSecret(secret: V1Secret): Promise<void> {
	await getCoreApi().createNamespacedSecret({
		body: secret,
		namespace: env.SANDBOX_NAMESPACE,
	})
}

export async function deleteSandboxSecret(secretName: string): Promise<void> {
	try {
		await getCoreApi().deleteNamespacedSecret({
			name: secretName,
			namespace: env.SANDBOX_NAMESPACE,
		})
	} catch (error) {
		if (isNotFound(error)) return
		throw error
	}
}

export async function listSandboxSecrets(): Promise<V1Secret[]> {
	const secretList = await getCoreApi().listNamespacedSecret({
		labelSelector: SANDBOX_LABEL_SELECTOR,
		namespace: env.SANDBOX_NAMESPACE,
	})

	return secretList.items
}

export async function readSandboxPodLogs(
	podName: string,
	tailLines: number,
): Promise<{ available: boolean; logs: string }> {
	try {
		const logs = await getCoreApi().readNamespacedPodLog({
			container: SANDBOX_CONTAINER_NAME,
			name: podName,
			namespace: env.SANDBOX_NAMESPACE,
			tailLines,
		})

		return { available: true, logs }
	} catch (error) {
		if (isNotFound(error)) return { available: false, logs: "" }
		throw error
	}
}
