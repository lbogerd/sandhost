import type { V1Pod } from "@kubernetes/client-node"
import { env } from "../env.ts"
import { getCoreApi, isNotFound } from "./k8s.ts"
import { SANDBOX_LABEL_SELECTOR } from "./pod-spec.ts"

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
