import type { V1Pod } from "@kubernetes/client-node"
import { env } from "../env.ts"

export const MANAGED_BY_LABEL = "sandhost.dev/managed-by"
export const MANAGED_BY_VALUE = "sandhost"
export const SANDBOX_ID_LABEL = "sandhost.dev/sandbox-id"

export const SANDBOX_LABEL_SELECTOR = `${MANAGED_BY_LABEL}=${MANAGED_BY_VALUE}`

// Pod names must be DNS-1123 labels; "sbx-" + a lowercase uuid always is, so
// the user-supplied sandbox name is never part of the pod name.
export function podNameForSandbox(sandboxId: string): string {
	return `sbx-${sandboxId}`
}

export function buildSandboxPod(input: {
	command?: string[]
	env: Record<string, string>
	image: string
	sandboxId: string
}): V1Pod {
	return {
		metadata: {
			labels: {
				[MANAGED_BY_LABEL]: MANAGED_BY_VALUE,
				[SANDBOX_ID_LABEL]: input.sandboxId,
			},
			name: podNameForSandbox(input.sandboxId),
			namespace: env.SANDBOX_NAMESPACE,
		},
		spec: {
			automountServiceAccountToken: false,
			containers: [
				{
					command: input.command,
					env: Object.entries(input.env).map(([name, value]) => ({ name, value })),
					image: input.image,
					name: "sandbox",
					resources: {
						limits: {
							cpu: env.SANDBOX_CPU_LIMIT,
							memory: env.SANDBOX_MEMORY_LIMIT,
						},
						requests: {
							cpu: env.SANDBOX_CPU_REQUEST,
							memory: env.SANDBOX_MEMORY_REQUEST,
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
