import type { V1Pod, V1Secret } from "@kubernetes/client-node"
import { env } from "../env.ts"

export const MANAGED_BY_LABEL = "sandhost.dev/managed-by"
export const MANAGED_BY_VALUE = "sandhost"
export const SANDBOX_ID_LABEL = "sandhost.dev/sandbox-id"

export const SANDBOX_LABEL_SELECTOR = `${MANAGED_BY_LABEL}=${MANAGED_BY_VALUE}`

export const SANDBOX_CONTAINER_NAME = "sandbox"

// Pod names must be DNS-1123 labels; "sbx-" + a lowercase uuid always is, so
// the user-supplied sandbox name is never part of the pod name.
export function podNameForSandbox(sandboxId: string): string {
	return `sbx-${sandboxId}`
}

function sandboxLabels(sandboxId: string): Record<string, string> {
	return {
		[MANAGED_BY_LABEL]: MANAGED_BY_VALUE,
		[SANDBOX_ID_LABEL]: sandboxId,
	}
}

// Env vars live in a per-sandbox Secret (same name as the pod) so values
// never appear in the pod spec itself.
export function buildSandboxSecret(input: {
	env: Record<string, string>
	sandboxId: string
}): V1Secret {
	return {
		metadata: {
			labels: sandboxLabels(input.sandboxId),
			name: podNameForSandbox(input.sandboxId),
			namespace: env.SANDBOX_NAMESPACE,
		},
		stringData: input.env,
		type: "Opaque",
	}
}

export function buildSandboxPod(input: {
	command?: string[]
	image: string
	resources?: {
		cpuLimit?: string
		cpuRequest?: string
		memoryLimit?: string
		memoryRequest?: string
	} | null
	sandboxId: string
}): V1Pod {
	const podName = podNameForSandbox(input.sandboxId)

	return {
		metadata: {
			labels: sandboxLabels(input.sandboxId),
			name: podName,
			namespace: env.SANDBOX_NAMESPACE,
		},
		spec: {
			automountServiceAccountToken: false,
			containers: [
				{
					command: input.command,
					envFrom: [{ secretRef: { name: podName } }],
					image: input.image,
					imagePullPolicy: "IfNotPresent",
					name: SANDBOX_CONTAINER_NAME,
					resources: {
						limits: {
							cpu: input.resources?.cpuLimit ?? env.SANDBOX_CPU_LIMIT,
							memory: input.resources?.memoryLimit ?? env.SANDBOX_MEMORY_LIMIT,
						},
						requests: {
							cpu: input.resources?.cpuRequest ?? env.SANDBOX_CPU_REQUEST,
							memory: input.resources?.memoryRequest ?? env.SANDBOX_MEMORY_REQUEST,
						},
					},
					securityContext: {
						allowPrivilegeEscalation: false,
						capabilities: {
							drop: ["ALL"],
						},
						runAsGroup: 65534,
						runAsNonRoot: true,
						runAsUser: 65534,
						seccompProfile: {
							type: "RuntimeDefault",
						},
					},
				},
			],
			enableServiceLinks: false,
			restartPolicy: "Never",
		},
	}
}
