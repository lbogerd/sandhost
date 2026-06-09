import type { V1ContainerStatus, V1Pod } from "@kubernetes/client-node"
import type { SandboxStatus } from "@wtrn/rpc-contract"

export type DerivedPodState = {
	status: SandboxStatus | "unknown"
	reason: string | null
}

const FATAL_WAITING_REASONS = new Set([
	"CrashLoopBackOff",
	"CreateContainerConfigError",
	"CreateContainerError",
	"ErrImagePull",
	"ImagePullBackOff",
	"InvalidImageName",
	"RunContainerError",
])

export function derivePodState(pod: V1Pod): DerivedPodState {
	const phase = pod.status?.phase
	const containerStatus = pod.status?.containerStatuses?.[0]
	const waitingReason = containerStatus?.state?.waiting?.reason ?? null

	if (pod.metadata?.deletionTimestamp) {
		return { reason: "terminating", status: "stopping" }
	}

	switch (phase) {
		case "Succeeded":
			return { reason: getTerminatedReason(containerStatus), status: "stopped" }
		case "Failed":
			return {
				reason: pod.status?.reason ?? getTerminatedReason(containerStatus),
				status: "failed",
			}
		case "Pending":
			if (waitingReason && FATAL_WAITING_REASONS.has(waitingReason)) {
				return { reason: waitingReason, status: "failed" }
			}

			return { reason: waitingReason, status: "starting" }
		case "Running":
			// Defensive: with restartPolicy Never a crash loop should not occur.
			if (waitingReason && FATAL_WAITING_REASONS.has(waitingReason)) {
				return { reason: waitingReason, status: "failed" }
			}

			return { reason: null, status: "running" }
		default:
			return { reason: "node unreachable", status: "unknown" }
	}
}

function getTerminatedReason(containerStatus: V1ContainerStatus | undefined): string | null {
	const terminated = containerStatus?.state?.terminated

	if (!terminated) return null
	if (terminated.reason) return terminated.reason
	if (typeof terminated.exitCode === "number") return `exit code ${terminated.exitCode}`

	return null
}
